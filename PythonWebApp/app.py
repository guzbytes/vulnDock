from flask import Flask, request, jsonify, render_template_string, redirect, url_for, session, send_from_directory, make_response
import os
import bcrypt
import requests
import json
import base64
from werkzeug.utils import secure_filename
import xml.etree.ElementTree as ET
from io import StringIO
import subprocess
import PythonWebApp.DatabaseConnector as DatabaseConnector

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'PythonWebApp/public/images/avatars'
app.config['UPLOAD_FOLDER2'] = 'PythonWebApp/public/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

@app.route('/')
def index_page():
    return send_from_directory('public', 'index.html')


@app.route('/admin')
def admin_page():
    return send_from_directory('public', 'admin.html')

@app.route('/login')
def login_page():
    return send_from_directory('public', 'login.html')

@app.route('/logout')
def logout():
    response = make_response(redirect('/'))
    response.set_cookie('session', '', expires=0)
    return response

@app.route('/register')
def register_page():
    return send_from_directory('public', 'register.html')

@app.route('/blog')
def blog_page():
    return send_from_directory('public', 'blog.html')

@app.route('/blog/<int:id>')
def blog_details_page(id):
    return send_from_directory('public', 'blog-details.html')

@app.route('/profile')
def profile_page():
    return send_from_directory('public', 'profile.html')

@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory('public', path)

@app.route('/api/v1/register', methods=['POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        firstname = request.form['firstname']
        lastname = request.form['lastname']
        email = request.form['email']
        password = request.form['password']
        
        avatar = request.files.get('avatar')
        filename = secure_filename(avatar.filename)
        avatar_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        avatar.save(avatar_path)
        

        try:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            DatabaseConnector.query_db(f"INSERT INTO users (username, firstname, lastname, email, password, avatar) VALUES ('{username}', '{firstname}', '{lastname}', '{email}', '{hashed_password}', '{avatar_path}')")
            return jsonify({'message': 'Usuario registrado exitosamente'}), 201
        except Exception as err:
            print(f"Error al insertar el usuario en la base de datos: {err}")
            return jsonify({'message': 'Error interno en el servidor'}), 500


@app.route('/api/v1/login', methods=['POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        print(f"Intentando iniciar sesión con usuario: {username} y contraseña: {password}")
        user = DatabaseConnector.query_db("SELECT * FROM users WHERE username = %s", (username,))

        if not user:
            return jsonify({'message': 'Usuario o contraseña incorrectos'}), 401
        
        if user and bcrypt.checkpw(password.encode('utf-8'), user[0]['password'].encode('utf-8')):
            user_data = {
                'id': user[0]['id'],
                'username': user[0]['username'],
                'is_admin': user[0].get('is_admin', False)
            }

            base64_user_data = base64.b64encode(json.dumps(user_data).encode()).decode()

            response = make_response(jsonify({'message': 'Login exitoso', 'user': user_data}))
            response.set_cookie(
                'session', base64_user_data, 
                httponly=False, secure=False, samesite='Strict', max_age=60 * 60
            )
            return response
        else:
            return jsonify({'message': 'Usuario o contraseña incorrectos'}), 401


@app.route('/api/v1/user/me', methods=['GET'])
def user_me():
    session_cookie = request.cookies.get('session')

    if not session_cookie:
        return jsonify({'message': 'No autenticado'}), 401

    try:
        user_data = json.loads(base64.b64decode(session_cookie).decode())
        user_id = user_data.get('id')

        if not user_id:
            return jsonify({'message': 'Sesión inválida'}), 401

        user = DatabaseConnector.query_db("SELECT id, username, firstname, lastname, email, avatar FROM users WHERE id = %s", (user_id,))

        if user:
            return jsonify(user[0]), 200
        return jsonify({'message': 'Usuario no encontrado'}), 404

    except (json.JSONDecodeError, base64.binascii.Error):
        return jsonify({'message': 'Sesión inválida'}), 401
    
    
@app.route('/api/v1/update-profile', methods=['POST'])
def update_profile():
    session_cookie = request.cookies.get('session')

    if not session_cookie:
        return jsonify({'message': 'No autenticado'}), 401

    try:
        user_data = json.loads(base64.b64decode(session_cookie).decode())
        user_id = user_data.get('id')

        if not user_id:
            return jsonify({'message': 'Sesión inválida'}), 401

        first_name = request.form.get('firstName')
        last_name = request.form.get('lastName')
        email = request.form.get('email')
        new_password = request.form.get('newPassword')

        if not first_name or not last_name or not email:
            return jsonify({'message': 'Nombre, Apellidos y Correo son obligatorios.'}), 400

        query = f"""
            UPDATE users
            SET firstname = '{first_name}', lastname = '{last_name}', email = '{email}'
        """

        if new_password:
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            query += f", password = '{hashed_password}'"

        query += f" WHERE id = {user_id}"

        DatabaseConnector.query_db(query)

        return jsonify({'message': 'Perfil actualizado con éxito'}), 200

    except (json.JSONDecodeError, base64.binascii.Error):
        return jsonify({'message': 'Sesión inválida'}), 401

@app.route('/api/v1/users', methods=['GET'])
def list_users():
    session_cookie = request.cookies.get('session')

    if not session_cookie:
        return jsonify({'message': 'No autenticado'}), 401
    try:
        user_data = json.loads(base64.b64decode(session_cookie).decode())
        user_id = user_data.get('id')
        user = DatabaseConnector.query_db(f"SELECT is_admin FROM users WHERE id = {user_id}" )
        if not user[0]['is_admin']:  
            return jsonify({'message': 'No autorizado'}), 403

        users = DatabaseConnector.query_db("SELECT id, username, email, is_admin FROM users")
    except Exception as err:
        print(f"Error al listar usuarios: {err}")
        return jsonify({'message': 'Error interno del servidor'}), 500
    return jsonify(users)

@app.route('/api/v1/users/<int:user_id>/toggle-admin', methods=['GET'])
def toggle_admin(user_id):
    query = "UPDATE users SET is_admin = NOT is_admin WHERE id = %s"
    
    result = DatabaseConnector.query_db(query, (user_id,))

    if result == 0:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    return jsonify({'message': 'Rol de admin actualizado correctamente'})


@app.route('/api/v1/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        session_cookie = request.cookies.get('session')

        if session_cookie != None:
            session_cookie = request.cookies.get('session')
            user_data = json.loads(base64.b64decode(session_cookie).decode())
            user_admin = user_data.get('is_admin')

            if user_admin:
                DatabaseConnector.query_db("DELETE FROM users WHERE id = %s", (user_id,))
                return  jsonify({'message' : 'Usuario eliminado'}), 403
            return jsonify({'message': 'Usuario eliminado'}), 200

    except Exception as err:
        return jsonify({'message': 'Error al decodificar la sesión'}), 401



@app.route('/api/v1/users/import', methods=['POST'])
def import_users():
    url = request.json.get('url')
    print(f"Importando usuarios desde: {url}")

    try:
        response = requests.get(url)
        users_data = response.json()

        for user in users_data:
            print(f"Importando usuario: {user}")
            DatabaseConnector.query_db(
                "INSERT INTO users (username, firstname, lastname, email, password) VALUES (%s, %s, %s, %s, %s)",
                (user['username'], user['firstname'], user['lastname'], user['email'], user['password'])
            )
        return jsonify({'message': 'Usuarios importados exitosamente'}), 200
    except Exception as err:
        return jsonify({'message': f'Error en la solicitud: {err},{response.content}'}), 500


@app.route('/api/v1/users/import-xml', methods=['POST'])
def import_users_xml():
    data = request.get_json()
    xml_data = data.get('xml')

    xml_data = xml_data.strip()

    print(f"XML recibido: {xml_data}")

    
    try:
        root = ET.fromstring(xml_data)
        users = root.findall('user')

        for user in users:
            DatabaseConnector.query_db(
                "INSERT INTO users (username, firstname, lastname, email, password) VALUES (%s, %s, %s, %s, %s)",
                (user.find('username').text, user.find('firstname').text, user.find('lastname').text, user.find('email').text, user.find('password').text)
            )
        return jsonify({'message': 'Usuarios importados desde XML exitosamente'}), 200
    except ET.ParseError as err:
        return jsonify({'message': f'Error al procesar el XML: {err}'}), 400


@app.route('/api/v1/ping', methods=['POST'])
def ping():
    target_host = request.form.get('host')
    try:
        print(f"Realizando ping a: {target_host}")
        result = subprocess.run(f"ping {target_host}", capture_output=True, shell=True, text=True)
        return jsonify({'output': result.stdout}), 200
    except Exception as e:
        return jsonify({'message': f'Error al hacer ping: {e}'}), 500

@app.route('/api/v1/blogs', methods=['GET'])
def get_blogs():
    try:
        query = "SELECT * FROM blogs"

        if 'user_id' not in session:
            query = "SELECT * FROM blogs WHERE is_private = false"  

        blogs = DatabaseConnector.query_db(query)

        return jsonify(blogs)
    except Exception as error:
        print(f"Error inesperado: {error}")
        return jsonify({'message': 'Error inesperado al obtener los blogs.', 'details': str(error)}), 500

@app.route('/api/v1/blog/<int:blog_id>', methods=['GET'])
def get_blog_by_id(blog_id):
    try:
        query = f"SELECT * FROM blogs WHERE id = {blog_id}" 
        blog = DatabaseConnector.query_db(query)

        if not blog:
            return jsonify({'error': 'Blog no encontrado'}), 404

        return jsonify(blog[0])
    except Exception as error:
        print(f"Error al obtener el blog: {error}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/v1/blog/<int:blog_id>/comments', methods=['POST'])
def add_comment(blog_id):
    try:
        content = request.form.get('content', '')
        username = 'Anónimo'
        print(f"Contenido del comentario: {content}")
        session_cookie = request.cookies.get('session')

        if session_cookie != None:
            session_cookie = request.cookies.get('session')
            user_data = json.loads(base64.b64decode(session_cookie).decode())
            user_id = user_data.get('id')
            print(f"ID de usuario: {user_id}")
            user = DatabaseConnector.query_db(f"SELECT is_admin FROM users WHERE id = {user_id}" )
        
            if user is not None:
                user = DatabaseConnector.query_db(f"SELECT username FROM users WHERE id = {user_id}")
                if user:
                    username = user[0]['username']

        print(f"Contenido del comentario: {username} - {content}")
        query = f"INSERT INTO comments (blog_id, writer, comment) VALUES ({blog_id}, '{username}', '{content}')"  
        DatabaseConnector.query_db(query) 

        comment_id = DatabaseConnector.query_db(f"SELECT MAX(id) FROM comments WHERE blog_id = {blog_id}")

        print(f"ID del comentario insertado: {comment_id[0]['MAX(id)']}")
        files = request.files.getlist('files')
        file_entries = []
        for file in files:
            file_path = f"/uploads/{file.filename}" 
            full_path = f"./public/uploads/{file.filename}"
            file.save(full_path)
            query = f"INSERT INTO comment_files (comment_id, file_path) VALUES ({comment_id[0]['MAX(id)']}, '{file_path}')"
            result = DatabaseConnector.query_db(query)  
            print(f"Archivo guardado: {file_path} con resultado: {result}")
            file_entries.append({'comment_id': comment_id[0]['MAX(id)'], 'file_path': file_path})

        return jsonify({
            'message': 'Comentario agregado con éxito',
            'comment': {
                'id': comment_id,
                'content': content,
                'author': username,
                'files': file_entries
            }
        }), 201

    except Exception as error:
        print(f"Error al agregar el comentario: {error}")
        return jsonify({'message': 'Error interno del servidor'}), 500
    
@app.route('/api/v1/blog/<int:blog_id>/comments', methods=['GET'])
def get_comments(blog_id):
    try:
        comments_query = f"SELECT * FROM comments WHERE blog_id = {blog_id}"
        comments = DatabaseConnector.query_db(comments_query)  

        comments_with_files = []
        for comment in comments:
            print(f"Obteniendo archivos para el comentario ID: {comment['id']}")
            files_query = f"SELECT * FROM comment_files WHERE comment_id = {comment['id']}"
            files = DatabaseConnector.query_db(files_query)

            comments_with_files.append({
                **comment,
                'files': [{'file_path': file['file_path']} for file in files]
            })

        return jsonify({'comments': comments_with_files}), 200

    except Exception as error:
        print(f"Error al obtener comentarios: {error}")
        return jsonify({'message': 'Error interno del servidor'}), 500

@app.route('/api/v1/blog', methods=['POST'])
def create_blog():
    try:
        data = request.get_json()

        title = data.get('title')
        content = data.get('content')
        author = data.get('author', 'Anónimo')
        url = data.get('url')
        is_private = data.get('is_private', '0')

        if not title or not content:
            return jsonify({'message': 'El título y el contenido son obligatorios.'}), 400

        if 'user_id' in session:
            user_id = session['user_id']
            query_user = f"SELECT firstname, lastname FROM users WHERE id = {user_id}"  
            user_data = DatabaseConnector.query_db(query_user)

            if user_data:
                author = f"{user_data[0]['firstname']} {user_data[0]['lastname']}"

        query_blog = f"INSERT INTO blogs (title, content, author, url, is_private) VALUES ('{title}', '{content}', '{author}', '{url}', {is_private})" 
        DatabaseConnector.query_db(query_blog)

        return jsonify({'message': 'Blog creado con éxito'}), 201

    except Exception as e:
        print(f"Error al insertar el blog: {e}")  
        return jsonify({'message': 'Error interno del servidor'}), 500

@app.route('/api/v1/update-welcome', methods=['GET'])
def update_welcome():
    username = request.args.get('username', 'Guest')

    template_string = f"Bienvenido {username}!"

    output = render_template_string(template_string) 

    return output

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80)
