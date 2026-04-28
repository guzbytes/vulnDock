const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const pug = require('pug');
const { listAllBlogs, listPublicBlogs, getBlogById } = require('./mysql');



const app = express();
const port = 80;

// CORS Configuration
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


// Middleware to serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Specific routes for each HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});





// List the blogs
app.get('/api/v1/blogs', async (req, res) => {
  try {
    const results = await listAllBlogs();
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


// Start the server
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
