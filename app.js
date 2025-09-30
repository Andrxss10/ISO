// Librerías necesarias para el funcionamiento
const express = require('express');
const db = require('./db'); // Conexión a la base de datos local
const bcrypt = require('bcrypt'); // Encriptado de contraseñas
const session = require('express-session'); // Manejo de sesiones
const path = require('path');
const flash = require('connect-flash'); // ← Añade esto para flash messages

// Instanciamos app y creamos una constante para el puerto por si cambia
const app = express();
const port = 3000;

// Creación de sesión para cada usuario:
app.use(session({
    secret: 'PruebaSxcrxtx', // Puedes cambiarla por una más segura
    resave: false,
    saveUninitialized: false
}));

// Configurar flash messages ← Añade esto
app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

// Configurar EJS
app.set('view engine', 'ejs');

// Permitimos almacenar los datos para que no queden como indefinidos / Middleware para leer datos de formulario
app.use(express.urlencoded({extended:true}));
app.use(express.json());

// Servir archivos estáticos
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/plantillas', express.static('plantillas'));
app.use('/videos', express.static(path.join(__dirname, 'public/videos')));


// Llamamos las rutas de otherRoutes
const isoRoutes = require('./routes/isoRoutes');
app.use('/', isoRoutes);

// Llamamos las rutas de authRoutes
const authRoutes = require('./routes/authRoutes');
app.use('/', authRoutes);

// Configurar rutas con prefijos específicos ← CORRECCIÓN IMPORTANTE
const implementacionRoutes = require('./routes/implementacion');
app.use('/implementacion', implementacionRoutes); // ← Cambiado de '/' a '/implementacion'

const capacitacionRoutes = require('./routes/capacitacion');
app.use('/capacitacion', capacitacionRoutes); // ← Cambiado de '/' a '/capacitacion'

// Ruta de prueba para verificar que el servidor funciona
app.get('/test', (req, res) => {
  res.send('✅ Servidor funcionando correctamente');
});

// Middleware para manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Página no encontrada',
    error: { status: 404 }
  });
});

// Localhost:
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});