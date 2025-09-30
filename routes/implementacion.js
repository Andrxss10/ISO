const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Crear carpeta por usuario si no existe
    const userUploadDir = path.join(__dirname, '../uploads', `usuario_${req.user.id}`);
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true });
    }
    cb(null, userUploadDir);
  },
  filename: function (req, file, cb) {
    // Mantener nombre original pero con prefijo de cláusula
    const plantillaId = req.params.id;
    const timestamp = Date.now();
    cb(null, `clausula_${plantillaId}_${timestamp}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de Excel (.xlsx, .xls)'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // Límite de 5MB
  }
});

// Obtener lista de plantillas
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Obtener plantillas
    const plantillas = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM plantillas WHERE norma = ? ORDER BY clausula', ['9001'], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Obtener archivos subidos por el usuario
    const archivosUsuario = await new Promise((resolve, reject) => {
      db.all(`
        SELECT au.id, au.plantilla_id, au.archivo_path, au.fecha_subida 
        FROM archivos_usuario au 
        WHERE au.usuario_id = ?
      `, [req.user.id], (err, rows) => {
        if (err) reject(err);
        else {
          const archivosMap = {};
          rows.forEach(row => {
            archivosMap[row.plantilla_id] = row;
          });
          resolve(archivosMap);
        }
      });
    });

    // Obtener capacitaciones completadas del usuario - NUEVA CONSULTA
    const capacitacionesUsuario = await new Promise((resolve, reject) => {
      db.all(`
        SELECT plantilla_id 
        FROM usuarios_capacitaciones 
        WHERE usuario_id = ? AND completado = 1
      `, [req.user.id], (err, rows) => {
        if (err) reject(err);
        else {
          const capacitacionesMap = {};
          rows.forEach(row => {
            capacitacionesMap[row.plantilla_id] = true;
          });
          resolve(capacitacionesMap);
        }
      });
    });

    res.render('implementacion', { 
      plantillas, 
      archivosUsuario,
      capacitacionesUsuario, // ← NUEVO PARÁMETRO
      user: req.user,
      path,
      messages: {
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
      }
    });
  } catch (error) {
    console.error('Error al cargar la página de implementación:', error);
    req.flash('error_msg', 'Error al cargar la página de implementación');
    res.redirect('/dashboard');
  }
});

// Descargar plantilla base - CON VERIFICACIÓN DE CAPACITACIÓN
router.get('/descargar/:id', isAuthenticated, async (req, res) => {
  try {
    const plantillaId = req.params.id;
    
    // 1. PRIMERO verificar si la capacitación está completada
    const capacitacion = await new Promise((resolve, reject) => {
      db.get(
        `SELECT completado FROM usuarios_capacitaciones 
        WHERE usuario_id = ? AND plantilla_id = ?`,
        [req.user.id, plantillaId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // 2. Validar capacitación - SI NO ESTÁ COMPLETADA, BLOQUEAR DESCARGA
    if (!capacitacion || capacitacion.completado !== 1) {
      req.flash('error_msg', '⚠️ Debes completar la capacitación antes de descargar esta plantilla.');
      return res.redirect('/implementacion');
    }

    // 3. Si la capacitación está completada, proceder con la descarga
    const plantilla = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM plantillas WHERE id = ?', [plantillaId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!plantilla) {
      req.flash('error_msg', 'Plantilla no encontrada');
      return res.redirect('/implementacion');
    }

    const filePath = path.resolve(__dirname, '..', plantilla.archivo_path);
    const downloadName = `${plantilla.clausula}_${plantilla.nombre.replace(/\s+/g, '_')}.xlsx`;
    
    // Verificar si el archivo existe
    if (fs.existsSync(filePath)) {
      res.download(filePath, downloadName, (err) => {
        if (err) {
          console.error('Error al descargar:', err);
          req.flash('error_msg', 'Error al descargar la plantilla');
          res.redirect('/implementacion');
        }
      });
    } else {
      console.error('Archivo no encontrado:', filePath);
      req.flash('error_msg', 'Plantilla no disponible. Contacte al administrador.');
      res.redirect('/implementacion');
    }
  } catch (error) {
    console.error('Error al descargar la plantilla:', error);
    req.flash('error_msg', 'Error al descargar la plantilla');
    res.redirect('/implementacion');
  }
});

// Subir plantilla completada
router.post('/subir/:id', isAuthenticated, upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error_msg', 'No se ha seleccionado ningún archivo');
      return res.redirect('/implementacion');
    }
    
    // Verificar si ya existe un archivo subido para esta plantilla por este usuario
    const archivoExistente = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM archivos_usuario WHERE usuario_id = ? AND plantilla_id = ?',
        [req.user.id, req.params.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (archivoExistente) {
      // Eliminar el archivo físico anterior si existe
      try {
        if (fs.existsSync(archivoExistente.archivo_path)) {
          fs.unlinkSync(archivoExistente.archivo_path);
        }
      } catch (err) {
        console.error('Error al eliminar archivo anterior:', err);
      }
      
      // Actualizar archivo existente
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE archivos_usuario SET archivo_path = ?, fecha_subida = datetime("now") WHERE id = ?',
          [req.file.path, archivoExistente.id],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } else {
      // Insertar nuevo archivo
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO archivos_usuario (usuario_id, plantilla_id, archivo_path) VALUES (?, ?, ?)',
          [req.user.id, req.params.id, req.file.path],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
    
    req.flash('success_msg', 'Archivo subido correctamente');
    res.redirect('/implementacion');
  } catch (error) {
    console.error('Error al subir el archivo:', error);
    req.flash('error_msg', 'Error al subir el archivo: ' + error.message);
    res.redirect('/implementacion');
  }
});

// Eliminar archivo subido
router.post('/eliminar/:id', isAuthenticated, async (req, res) => {
  try {
    // Verificar que el archivo pertenece al usuario actual
    const archivo = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM archivos_usuario WHERE id = ? AND usuario_id = ?',
        [req.params.id, req.user.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!archivo) {
      req.flash('error_msg', 'Archivo no encontrado');
      return res.redirect('/implementacion');
    }
    
    // Eliminar el archivo físico
    try {
      if (fs.existsSync(archivo.archivo_path)) {
        fs.unlinkSync(archivo.archivo_path);
      }
    } catch (err) {
      console.error('Error al eliminar archivo físico:', err);
    }
    
    // Eliminar el registro de la base de datos
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM archivos_usuario WHERE id = ?',
        [req.params.id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    req.flash('success_msg', 'Archivo eliminado correctamente');
    res.redirect('/implementacion');
  } catch (error) {
    console.error('Error al eliminar el archivo:', error);
    req.flash('error_msg', 'Error al eliminar el archivo');
    res.redirect('/implementacion');
  }
});

// Ruta para verificar si existe un archivo subido por el usuario
router.get('/check-archivo/:plantillaId', isAuthenticated, async (req, res) => {
  try {
    const plantillaId = req.params.plantillaId;
    
    // Verificar si existe un archivo subido para esta plantilla por este usuario
    const archivo = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM archivos_usuario WHERE usuario_id = ? AND plantilla_id = ?',
        [req.user.id, plantillaId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (archivo) {
      res.json({
        existe: true,
        archivo: {
          id: archivo.id,
          nombre_archivo: path.basename(archivo.archivo_path),
          fecha_subida: archivo.fecha_subida
        },
        mensaje: 'Archivo encontrado'
      });
    } else {
      res.json({
        existe: false,
        archivo: null,
        mensaje: 'No se ha subido un archivo para esta plantilla'
      });
    }
  } catch (error) {
    console.error('Error al verificar archivo:', error);
    res.status(500).json({
      existe: false,
      archivo: null,
      mensaje: 'Error al verificar el archivo'
    });
  }
});

// Ruta para descargar archivo subido por el usuario
router.get('/descargar-archivo/:archivoId', isAuthenticated, async (req, res) => {
  try {
    const archivoId = req.params.archivoId;
    
    // Verificar que el archivo pertenece al usuario actual
    const archivo = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM archivos_usuario WHERE id = ? AND usuario_id = ?',
        [archivoId, req.user.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!archivo) {
      return res.status(404).send('Archivo no encontrado');
    }
    
    // Verificar si el archivo existe físicamente
    if (!fs.existsSync(archivo.archivo_path)) {
      return res.status(404).send('El archivo no existe en el servidor');
    }
    
    // Descargar el archivo
    const filename = path.basename(archivo.archivo_path);
    res.download(archivo.archivo_path, filename, (err) => {
      if (err) {
        console.error('Error al descargar el archivo:', err);
        res.status(500).send('Error al descargar el archivo');
      }
    });
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    res.status(500).send('Error al descargar el archivo');
  }
});

module.exports = router;