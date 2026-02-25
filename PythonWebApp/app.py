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
app.config['UPLOAD_FOLDER'] = 'public/images/avatars'
app.config['UPLOAD_FOLDER2'] = 'public/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload size

# Ruta principal
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
    response = make_response(redirect('/'))  # Redirige a la página de inicio
    response.set_cookie('session', '', expires=0)  # Elimina la cookie 'session'
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

# Ruta para servir css y js
@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory('public', path)


# Registro de usuario
@app.route('/api/v1/register', methods=['POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        firstname = request.form['firstname']
        lastname = request.form['lastname']
        email = request.form['email']
        password = request.form['password']
        
        # Manejo de avatar
        avatar = request.files.get('avatar')
        filename = secure_filename(avatar.filename)
        avatar_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        avatar.save(avatar_path)
        

        # Insertar usuario en base de datos
        try:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            DatabaseConnector.query_db(f"INSERT INTO users (username, firstname, lastname, email, password, avatar) VALUES ({username}, {firstname}, {lastname}, {email}, {hashed_password}, {avatar_path})",
                (username, firstname, lastname, email, hashed_password, avatar_path)
            )
            return jsonify({'message': 'Usuario registrado exitosamente'}), 201
        except Exception as err:
            print(f"Error al insertar el usuario en la base de datos: {err}")
            return jsonify({'message': 'Error interno en el servidor'}), 500


# Login de usuario
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
            # Datos del usuario a almacenar en la cookie
            user_data = {
                'id': user[0]['id'],
                'username': user[0]['username'],
                'is_admin': user[0].get('is_admin', False)  # Si la clave no existe, asumir False
            }

            # Convertir los datos a base64
            base64_user_data = base64.b64encode(json.dumps(user_data).encode()).decode()

            # Crear la respuesta con la cookie de sesión
            response = make_response(jsonify({'message': 'Login exitoso', 'user': user_data}))
            response.set_cookie(
                'session', base64_user_data, 
                httponly=False, secure=False, samesite='Strict', max_age=60 * 60
            )
            return response
        else:
            return jsonify({'message': 'Usuario o contraseña incorrectos'}), 401


# Obtener datos del usuario autenticado
@app.route('/api/v1/user/me', methods=['GET'])
def user_me():
    session_cookie = request.cookies.get('session')

    if not session_cookie:
        return jsonify({'message': 'No autenticado'}), 401

    try:
        # Decodificar la cookie base64
        user_data = json.loads(base64.b64decode(session_cookie).decode())
        user_id = user_data.get('id')

        if not user_id:
            return jsonify({'message': 'Sesión inválida'}), 401

        # Consultar usuario en la base de datos
        user = DatabaseConnector.query_db("SELECT id, username, firstname, lastname, email, avatar FROM users WHERE id = %s", (user_id,))

        if user:
            return jsonify(user[0]), 200
        return jsonify({'message': 'Usuario no encontrado'}), 404

    except (json.JSONDecodeError, base64.binascii.Error):
        return jsonify({'message': 'Sesión inválida'}), 401
    
    
# Actualizar perfil de usuario
@app.route('/api/v1/update-profile', methods=['POST'])
def update_profile():
    session_cookie = request.cookies.get('session')

    if not session_cookie:
        return jsonify({'message': 'No autenticado'}), 401

    try:
        # Decodificar la cookie base64 para obtener el user_id
        user_data = json.loads(base64.b64decode(session_cookie).decode())
        user_id = user_data.get('id')

        if not user_id:
            return jsonify({'message': 'Sesión inválida'}), 401

        # Obtener los datos del formulario
        first_name = request.form.get('firstName')
        last_name = request.form.get('lastName')
        email = request.form.get('email')
        new_password = request.form.get('newPassword')

        if not first_name or not last_name or not email:
            return jsonify({'message': 'Nombre, Apellidos y Correo son obligatorios.'}), 400

        # Construcción insegura de la consulta SQL
        query = f"""
            UPDATE users
            SET firstname = '{first_name}', lastname = '{last_name}', email = '{email}'
        """

        if new_password:
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            query += f", password = '{hashed_password}'"

        query += f" WHERE id = {user_id}"

        # Ejecutar la consulta (SQL Injection posible)
        DatabaseConnector.query_db(query)

        return jsonify({'message': 'Perfil actualizado con éxito'}), 200

    except (json.JSONDecodeError, base64.binascii.Error):
        return jsonify({'message': 'Sesión inválida'}), 401

# Listar usuarios (solo admin, sin controles adecuados)
@app.route('/api/v1/users', methods=['GET'])
def list_users():
    session_cookie = request.cookies.get('session')

    # Verificar si el usuario está autenticado
    if not session_cookie:
        return jsonify({'message': 'No autenticado'}), 401
    try:
        # Decodificar la cookie base64
        user_data = json.loads(base64.b64decode(session_cookie).decode())
        user_id = user_data.get('id')
        # Obtener los datos del usuario desde la base de datos (sin sanitización ni controles adecuados)
        user = DatabaseConnector.query_db(f"SELECT is_admin FROM users WHERE id = {user_id}" )
        # No verificar si el usuario existe antes de acceder a sus datos
        if not user[0]['is_admin']:  
            return jsonify({'message': 'No autorizado'}), 403

        # Consulta sin paginación ni filtros (podría ser explotado para extraer grandes volúmenes de datos)
        users = DatabaseConnector.query_db("SELECT id, username, email, is_admin FROM users")
    except Exception as err:
        print(f"Error al listar usuarios: {err}")
        return jsonify({'message': 'Error interno del servidor'}), 500
    return jsonify(users)
# Cambiar estado de admin a un usuario (sin controles adecuados)
@app.route('/api/v1/users/<int:user_id>/toggle-admin', methods=['GET'])
def toggle_admin(user_id):
    # No se verifica autenticación ni permisos de usuario

    # Consulta SQL sin validaciones ni confirmaciones de seguridad
    query = "UPDATE users SET is_admin = NOT is_admin WHERE id = %s"
    
    result = DatabaseConnector.query_db(query, (user_id,))

    # No se comprueba si el usuario realmente existe antes de modificarlo
    if result == 0:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    return jsonify({'message': 'Rol de admin actualizado correctamente'})


# Eliminar un usuario
@app.route('/api/v1/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    ##if 'user_id' not in session or session['user_id'] != user_id:
    ##    return jsonify({'message': 'No autorizado'}), 403
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



# Importar usuarios (vulnerable a SSRF)
@app.route('/api/v1/users/import', methods=['POST'])
def import_users():
    url = request.json.get('url')
    print(f"Importando usuarios desde: {url}")  # Registro de depuración

    try:
        # Realizar una solicitud HTTP a la URL proporcionada
        response = requests.get(url)
        users_data = response.json()  # Suponiendo que los datos sean un JSON

        for user in users_data:
            print(f"Importando usuario: {user}")  # Registro de depuración
            DatabaseConnector.query_db(
                "INSERT INTO users (username, firstname, lastname, email, password) VALUES (%s, %s, %s, %s, %s)",
                (user['username'], user['firstname'], user['lastname'], user['email'], user['password'])
            )
        return jsonify({'message': 'Usuarios importados exitosamente'}), 200
    except Exception as err:
        return jsonify({'message': f'Error en la solicitud: {err},{response.content}'}), 500


# Importar usuarios desde XML (vulnerable a XXE)
@app.route('/api/v1/users/import-xml', methods=['POST'])
def import_users_xml():
    data = request.get_json()  # Obtener el cuerpo de la solicitud como JSON
    xml_data = data.get('xml')  # Extraer el campo 'xml' que contiene el XML

    # Limpiar los saltos de línea y espacios extra
    xml_data = xml_data.strip()

    print(f"XML recibido: {xml_data}")

    
    try:
        # Analizar el XML (vulnerabilidad XXE si no se protegen los parseos)
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


# Endpoint para hacer un ping (potencialmente peligroso)
@app.route('/api/v1/ping', methods=['POST'])
def ping():
    target_host = request.form.get('host')
    try:
        print(f"Realizando ping a: {target_host}")  # Registro de depuración
        result = subprocess.run(f"ping {target_host}", capture_output=True, shell=True, text=True)
        return jsonify({'output': result.stdout}), 200
    except Exception as e:
        return jsonify({'message': f'Error al hacer ping: {e}'}), 500

# Listar todos los blogs (sin validaciones ni seguridad)
@app.route('/api/v1/blogs', methods=['GET'])
def get_blogs():
    try:
        # No hay verificación de usuario autenticado
        query = "SELECT * FROM blogs"  # Expone todos los blogs sin importar privacidad

        if 'user_id' not in session:
            # Si no está autenticado, aún puede obtener blogs privados
            query = "SELECT * FROM blogs WHERE is_private = false"  

        blogs = DatabaseConnector.query_db(query)  # Consulta sin sanitización ni manejo de errores

        return jsonify(blogs)
    except Exception as error:
        print(f"Error inesperado: {error}")
        return jsonify({'message': 'Error inesperado al obtener los blogs.', 'details': str(error)}), 500

# Obtener un blog por ID
@app.route('/api/v1/blog/<int:blog_id>', methods=['GET'])
def get_blog_by_id(blog_id):
    try:
        query = f"SELECT * FROM blogs WHERE id = {blog_id}" 
        blog = DatabaseConnector.query_db(query)  # Ejecuta la consulta sin sanitización

        if not blog:
            return jsonify({'error': 'Blog no encontrado'}), 404

        return jsonify(blog[0])  # Retorna el primer resultado (sin comprobar si hay más)
    except Exception as error:
        print(f"Error al obtener el blog: {error}")
        return jsonify({'error': 'Error interno del servidor'}), 500

# Poner comentarios en un blog (sin validaciones ni seguridad)
@app.route('/api/v1/blog/<int:blog_id>/comments', methods=['POST'])
def add_comment(blog_id):
    try:
        content = request.form.get('content', '')
        username = 'Anónimo'  # Por defecto
        print(f"Contenido del comentario: {content}")
        session_cookie = request.cookies.get('session')

        if session_cookie != None:
            session_cookie = request.cookies.get('session')
            user_data = json.loads(base64.b64decode(session_cookie).decode())
            user_id = user_data.get('id')
            print(f"ID de usuario: {user_id}")
            # Obtener los datos del usuario desde la base de datos (sin sanitización ni controles adecuados)
            user = DatabaseConnector.query_db(f"SELECT is_admin FROM users WHERE id = {user_id}" )
        
            if user is not None:
                user = DatabaseConnector.query_db(f"SELECT username FROM users WHERE id = {user_id}")  # 🔥 INYECCIÓN SQL 🔥
                if user:
                    username = user[0]['username']  # Sin validaciones ni sanitización

        # Comentario vacío permitido
        print(f"Contenido del comentario: {username} - {content}")
        query = f"INSERT INTO comments (blog_id, writer, comment) VALUES ({blog_id}, '{username}', '{content}')"  
        DatabaseConnector.query_db(query) 

        # Obtener el último ID insertado (SIN SEGURIDAD)
        # comment_id = dbconnector.query_db("SELECT LAST_INSERT_ID()")

        comment_id = DatabaseConnector.query_db(f"SELECT MAX(id) FROM comments WHERE blog_id = {blog_id}")

        print(f"ID del comentario insertado: {comment_id[0]['MAX(id)']}")  # Sin validaciones ni sanitización
        # Guardar archivos (sin validación de tipo ni tamaño)

        # Manejo de archivos SIN validación de tipo ni tamaño
        files = request.files.getlist('files')
        file_entries = []
        for file in files:
            file_path = f"/uploads/{file.filename}" 
            full_path = f"./public/uploads/{file.filename}"  # Ruta real en el disco (relativa al proyecto)
            file.save(full_path)
            query = f"INSERT INTO comment_files (comment_id, file_path) VALUES ({comment_id[0]['MAX(id)']}, '{file_path}')"
            result = DatabaseConnector.query_db(query)  
            print(f"Archivo guardado: {file_path} con resultado: {result}")
            file_entries.append({'comment_id': comment_id[0]['MAX(id)'], 'file_path': file_path})

        # Responder sin sanitizar los datos
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
    
# Ver los comentarios de un blog (sin seguridad)
@app.route('/api/v1/blog/<int:blog_id>/comments', methods=['GET'])
def get_comments(blog_id):
    try:
        # Obtener comentarios del blog sin sanitizar entradas
        comments_query = f"SELECT * FROM comments WHERE blog_id = {blog_id}"
        comments = DatabaseConnector.query_db(comments_query)  

        comments_with_files = []
        for comment in comments:
            # Obtener archivos sin sanitización 
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

# Crear un nuevo blog (sin seguridad)
@app.route('/api/v1/blog', methods=['POST'])
def create_blog():
    try:
        # Obtener los datos del cuerpo de la solicitud JSON
        data = request.get_json()

        title = data.get('title')
        content = data.get('content')
        author = data.get('author', 'Anónimo')
        url = data.get('url')
        is_private = data.get('is_private', '0')  # Por defecto, público

        # Validación mínima (pero aún vulnerable)
        if not title or not content:
            return jsonify({'message': 'El título y el contenido son obligatorios.'}), 400

        # Si hay usuario autenticado, sobrescribir el autor
        if 'user_id' in session:
            user_id = session['user_id']
            query_user = f"SELECT firstname, lastname FROM users WHERE id = {user_id}"  
            user_data = DatabaseConnector.query_db(query_user)

            if user_data:
                author = f"{user_data[0]['firstname']} {user_data[0]['lastname']}"

        # Insertar en la base de datos SIN sanitización
        query_blog = f"INSERT INTO blogs (title, content, author, url, is_private) VALUES ('{title}', '{content}', '{author}', '{url}', {is_private})" 
        DatabaseConnector.query_db(query_blog)

        return jsonify({'message': 'Blog creado con éxito'}), 201

    except Exception as e:
        print(f"Error al insertar el blog: {e}")  
        return jsonify({'message': 'Error interno del servidor'}), 500

# Ruta vulnerable a SSTI
@app.route('/api/v1/update-welcome', methods=['GET'])
def update_welcome():
    # Obtener el nombre de usuario desde la query string
    username = request.args.get('username', 'Guest')

    template_string = f"Bienvenido {username}!"  # Inyección directa en la plantilla

    # Renderizar la plantilla sin filtrar
    output = render_template_string(template_string) 

    return output

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80)
