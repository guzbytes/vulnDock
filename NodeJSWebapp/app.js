const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const xml2js = require('xml2js'); 
const path = require('path');
const axios = require('axios');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const pug = require('pug');
const { exec } = require('child_process');
const { insertUser, getUserByUsername, getUserById, updateUserProfile, listUsers, toggleAdmin, deleteUser, listAllBlogs, listPublicBlogs, getBlogById, createBlog, insertComment, insertCommentFiles, listCommentsByBlogId, listFilesByCommentId, getUserNameById } = require('./DatabaseConnector');



const app = express();
const port = 80;

// Configuración de CORS
const corsOptions = {
  origin: '*', // Especifica qué dominios pueden acceder
  methods: ['GET', 'POST'], // Métodos permitidos
  allowedHeaders: ['Content-Type'], // Cabeceras permitidas
};

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors(corsOptions));
app.use(cookieParser());

// Configurar multer para almacenar los archivos en la carpeta "public/images/avatars"
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, 'public', 'images', 'avatars');
      if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// Configurar multer para almacenar los archivos adjuntos de comentarios
const commentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'public/uploads/'); // Carpeta donde se guardan los archivos
  },
  filename: (req, file, cb) => {
      cb(null, file.originalname); 
  }
});

const uploadCommentFiles = multer({ storage: commentStorage });
const upload = multer({ storage });

// Middleware para autenticar usuarios usando la cookie "session"
const authenticateUser = (req, res, next) => {
  const sessionCookie = req.cookies.session;

  if (!sessionCookie) {
    req.user = null;  // Usuario no autenticado
    return next();  // Continuar con la petición
    //return res.status(401).json({ message: 'No autenticado. Inicie sesión.' });
  }

  try {
    const userData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
    req.user = userData;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Sesión inválida.' });
  }
};


// Middleware para servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Rutas específicas para cada archivo HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/blog/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog-details.html'));
});

// Logout (eliminar cookie)
app.get('/logout', (req, res) => {
  res.clearCookie('session');
  res.redirect('/'); // Redirige a la página de inicio
});

// Rutas de API

// Registro de usuario
app.post('/api/v1/register', upload.single('avatar'), async (req, res) => {
  const { username,firstname, lastname, email, password } = req.body;

  if (!username || !firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  if (!req.file) {
      return res.status(400).json({ message: 'Debe subir un avatar.' });
  }

  try {
      // Encriptar la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Guardar la información del avatar
      const avatarPath = `/images/avatars/${req.file.filename}`;

      const result = await insertUser(username, firstname, lastname, email, hashedPassword, avatarPath);

      if (result) {
        res.status(201).json({
          message: 'Usuario registrado exitosamente.',
          user: { id: result.insertId, username, firstname, lastname, email, avatar: avatarPath },
        });
      } else {
        res.status(500).json({ message: 'Error al registrar el usuario.' });
      }
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });

// Login con autenticación por cookie
app.post('/api/v1/login', async(req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Ingrese usuario y contraseña' });
  }

  try {
    const results = await getUserByUsername(username);

    if (!results || results.length === 0) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const userData = { id: user.id, username: user.username, is_admin: user.is_admin };
    const base64UserData = Buffer.from(JSON.stringify(userData)).toString('base64');

    res.cookie('session', base64UserData, {
      httpOnly: false,
      secure: true,
      sameSite: 'Strict',
      maxAge: 60 * 60 * 1000
    });

    res.json({ message: 'Login exitoso', user });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Obtener datos del usuario autenticado
app.get('/api/v1/user/me', authenticateUser, async(req, res) => {

  if (!req.user) return res.status(401).json({ message: 'No autenticado' });
  const userId = req.user.id;
  console.log('ID de usuario autenticado:', userId);

  try {
      const results = await getUserById(userId);
      if (!results || results.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      res.json(results[0]);
    } catch (err) {
      console.error('Error al obtener usuario:', err);
      res.status(500).json({ message: 'Error al obtener los datos' });
    }
});

app.post('/api/v1/update-profile', authenticateUser, upload.single('avatar'), async (req, res) => {
  const { firstName, lastName, email, newPassword } = req.body;
  const avatarPath = req.file ? `/images/avatars/${req.file.filename}` : null;

  if (!req.user) return res.status(401).json({ message: 'No autenticado' });

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: 'Nombre, Apellidos y Correo son obligatorios.' });
  }

  try {
    const payload = { firstName, lastName, email, newHashedPassword: null, avatarPath };
    if (newPassword) payload.newHashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await updateUserProfile(userId, payload);


    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Perfil actualizado con éxito' });
  } catch (err) {
    console.error('Error al actualizar el perfil:', err);
    res.status(500).json({ message: 'Error al actualizar el perfil' });
  }
});

// List users (only for admins)
app.get('/api/v1/users', authenticateUser, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ message: 'No autorizado' });

  try {
    const results = await listUsers();    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

// Switch user role to admin or user
app.get('/api/v1/users/:id/toggle-admin', authenticateUser, async (req, res) => {
  try {
    const result = await toggleAdmin(req.params.id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Rol de admin actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar el rol de admin' });
  }
});

// Delete user (only for admins)
app.delete('/api/v1/users/:id', authenticateUser, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ message: 'No autorizado' });

  try {
    await deleteUser(req.params.id);    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
});

// Import users from JSON URL (vulnerable to SSRF) 
app.post('/api/v1/users/import', authenticateUser, async (req, res) => {
  const { url } = req.body;
  try {
    const response = await axios.get(url);
    const users = response.data;
    const is_admin = users.is_admin || 0;
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await insertUser(user.username, user.firstname, user.lastname, user.email, hashedPassword, null, is_admin);
    }

    res.json({ message: 'Usuarios importados' });
  } catch (err) {
    console.error('Error al importar usuarios:', err.message);
    res.status(500).json({ message: 'Error al importar', error: err.message });
  }
});

// Import users from XML (vulnerable to XML External Entity attacks)
app.post('/api/v1/users/import-xml', authenticateUser, async (req, res) => {
  const xml = req.body.xml;
  const parser = new xml2js.Parser({ explicitArray: false });

  try {
    const result = await parser.parseStringPromise(xml);
    let users = result.users.user;
    if (!Array.isArray(users)) users = [users]; // Normalizar array

    for (const user of users) {
      const isAdmin = user.is_admin === 'true' || user.is_admin === 1 ? 1 : 0;
      const hashedPassword = await bcrypt.hash(user.password, 10);

      await insertUser(user.username, user.firstname, user.lastname, user.email, hashedPassword, null, isAdmin);
      console.log('Usuario insertado con éxito:', user.username);
    }

    res.json({ message: 'Usuarios importados desde XML' });
  } catch (error) {
    console.error('Error al insertar usuarios:', error);
    res.status(500).json({ message: 'Error al insertar usuarios' });
  }
});


// Insecure ping 
app.post('/api/v1/ping', authenticateUser, (req, res) => {
  const  host  = req.body.host;
  console.log('Haciendo ping a:', host);
  exec('ping ' + host, (error, stdout, stderr) => {
    //if (error) return res.status(500).json({ message: 'Error ejecutando ping', error: stderr });
    res.json({ output: stdout });
  });
});

// List the blogs
app.get('/api/v1/blogs', authenticateUser, async (req, res) => {
  try {
    const results = req.user ? await listAllBlogs() : await listPublicBlogs();
    res.json(results);
  } catch (err) {
    console.error('Error al obtener los blogs:', err);
    res.status(500).json({ message: 'Error al obtener los blogs.', details: err.message });
  }
});

// Get a specific blog by ID
app.get('/api/v1/blog/:blog_id', async (req, res) => {
  const { blog_id } = req.params;
  try {
      const results = await getBlogById(blog_id);    
      if (results.length === 0) {
        return res.status(404).json({ error: 'Blog no encontrado' });
      }
    res.json(results[0]);
  } catch (err) {
    console.error('Error al obtener el blog:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Comment a blog
app.post('/api/v1/blog/:blog_id/comments', authenticateUser, uploadCommentFiles.array('files'), async (req, res) => {
  const { blog_id } = req.params;
  const { content } = req.body;
  let username = 'Anónimo';
  if (req.user) username = req.user.username;

  if (!content) {
    return res.status(400).json({ message: 'El comentario no puede estar vacío' });
  }

  try {
    
    const { insertId: commentId } = await insertComment(blog_id, username, content);

    const files = (req.files || []).map(file => `/uploads/${file.filename}`);
    if (files.length > 0) {
      await insertCommentFiles(commentId, files);
    }


    res.status(201).json({
      message: 'Comentario agregado con éxito',
      comment: {
        id: commentId,
        content,
        author: username,
        files: files.map(f => ({ file_path: f[1] }))
      }
    });
  } catch (err) {
    console.error('Error al insertar el comentario o archivos:', err);
    res.status(500).json({ message: 'Hubo un error al agregar el comentario o archivos.' });
  }
});

// Ver los comentarios del blog con sus archivos
app.get('/api/v1/blog/:blog_id/comments', authenticateUser, async (req, res) => {
  const { blog_id } = req.params;

  try {
    
    const comments = await listCommentsByBlogId(blog_id);
    const commentsWithFiles = await Promise.all(comments.map(async (comment) => {
      const files = await listFilesByCommentId(comment.id);
      return { ...comment, files: files.map(f => ({ file_path: f.file_path })) };
    }));


    res.status(200).json({ comments: commentsWithFiles });
  } catch (err) {
    console.error('Error al obtener comentarios con archivos:', err);
    res.status(500).json({ message: 'Error al procesar los comentarios' });
  }
});

// Create a new blog
app.post('/api/v1/blog', authenticateUser, async (req, res) => {
  const { title, content, author, url, is_private } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'El título y el contenido son obligatorios.' });
  }
  
  let authorName = author || 'Anónimo';  

  try {
    if (req.user) {
      const fullName = await getUserNameById(req.user.id);``
      if (fullName) authorName = fullName;
    }

    const { insertId } = await createBlog({ title, content, authorName, url, is_private: !!is_private });

    res.status(201).json({ message: 'Blog creado con éxito', blogId: insertId });
  } catch (err) {
    console.error('Error al crear el blog:', err);
    res.status(500).json({ message: 'Error al crear el blog.' });
  }
});

app.get("/api/v1/update-welcome", async (req, res) => {
  // Get the username from the query string
  const username = req.query.username || 'Guest';

  // Vulnerable Implementation
  const templateString = `| Bienvenido ${username}!`;

  // Safe Implementation
  // const templateString = `| Welcome #{'${username}'}!`;

  // Render the template without compiling
  const output = pug.render(templateString);

  // Send the rendered HTML as the response
  res.send(output);
});


// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
