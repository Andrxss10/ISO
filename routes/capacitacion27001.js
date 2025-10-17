const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Obtener lista de plantillas con contenido de capacitación
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Obtener plantillas con contenido de capacitación
    const plantillas = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM plantillas_27001 WHERE norma = ? ORDER BY clausula', ['27001'], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Obtener archivos subidos por el usuario
    const archivosUsuario = await new Promise((resolve, reject) => {
      db.all(`
        SELECT au.id, au.plantilla_id, au.archivo_path, au.fecha_subida 
        FROM archivos_usuario_27001 au 
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
        FROM usuarios_capacitaciones_27001 
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

    res.render('capacitacion27001', { 
      plantillas, 
      archivosUsuario,
      capacitacionesUsuario, // ← NUEVO PARÁMETRO
      user: req.user,
      messages: {
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
      }
    });
  } catch (error) {
    console.error('Error al cargar la página de capacitación:', error);
    req.flash('error_msg', 'Error al cargar la página de capacitación');
    res.redirect('/dashboard');
  }
});

// Descargar archivo del usuario
router.get('/descargar-archivo/:id', isAuthenticated, async (req, res) => {
  try {
    // Verificar que el archivo pertenece al usuario actual
    const archivo = await new Promise((resolve, reject) => {
      db.get(`
        SELECT au.*, p.clausula, p.nombre 
        FROM archivos_usuario_27001 au 
        JOIN plantillas_27001 p ON au.plantilla_id = p.id 
        WHERE au.id = ? AND au.usuario_id = ?
      `, [req.params.id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!archivo) {
      req.flash('error_msg', 'Archivo no encontrado');
      return res.redirect('/capacitacion27001');
    }
    
    // Verificar si el archivo existe
    if (fs.existsSync(archivo.archivo_path)) {
      res.download(archivo.archivo_path, `${archivo.clausula}_${archivo.nombre}_completado.xlsx`, (err) => {
        if (err) {
          console.error('Error al descargar:', err);
          req.flash('error_msg', 'Error al descargar el archivo');
          res.redirect('/capacitacion27001');
        }
      });
    } else {
      console.error('Archivo no encontrado:', archivo.archivo_path);
      req.flash('error_msg', 'El archivo ya no está disponible');
      res.redirect('/capacitacion27001');
    }
  } catch (error) {
    console.error('Error al descargar el archivo:', error);
    req.flash('error_msg', 'Error al descargar el archivo');
    res.redirect('/capacitacion27001');
  }
});

// Ver archivo subido por el usuario
router.get('/ver-archivo/:id', isAuthenticated, async (req, res) => {
  try {
    // Verificar que el archivo pertenece al usuario actual
    const archivo = await new Promise((resolve, reject) => {
      db.get(`
        SELECT au.*, p.clausula, p.nombre 
        FROM archivos_usuario_27001 au 
        JOIN plantillas_27001 p ON au.plantilla_id = p.id 
        WHERE au.id = ? AND au.usuario_id = ?
      `, [req.params.id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!archivo) {
      req.flash('error_msg', 'Archivo no encontrado');
      return res.redirect('/capacitacion27001');
    }
    
    // Verificar si el archivo existe
    if (fs.existsSync(archivo.archivo_path)) {
      res.download(archivo.archivo_path, `${archivo.clausula}_${archivo.nombre}_completado.xlsx`, (err) => {
        if (err) {
          console.error('Error al descargar:', err);
          req.flash('error_msg', 'Error al visualizar el archivo');
          res.redirect('/capacitacion27001');
        }
      });
    } else {
      console.error('Archivo no encontrado:', archivo.archivo_path);
      req.flash('error_msg', 'El archivo ya no está disponible');
      res.redirect('/capacitacion27001');
    }
  } catch (error) {
    console.error('Error al visualizar el archivo:', error);
    req.flash('error_msg', 'Error al visualizar el archivo');
    res.redirect('/capacitacion27001');
  }
});

// Marcar video como visto
router.post('/visto/:id', isAuthenticated, async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const plantillaId = req.params.id;

    console.log(`🎥 Marcando video como visto - Usuario: ${usuarioId}, Plantilla: ${plantillaId}`);

    // Verificar si ya existe un registro
    const registroExistente = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM usuarios_capacitaciones_27001 WHERE usuario_id = ? AND plantilla_id = ?`,
        [usuarioId, plantillaId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (registroExistente) {
      // Ya existe → actualizar
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE usuarios_capacitaciones_27001 SET completado = 1, fecha_visto = CURRENT_TIMESTAMP 
           WHERE usuario_id = ? AND plantilla_id = ?`,
          [usuarioId, plantillaId],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } else {
      // No existe → insertar
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO usuarios_capacitaciones_27001 (usuario_id, plantilla_id, completado) 
           VALUES (?, ?, 1)`,
          [usuarioId, plantillaId],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log(`✅ Video marcado como visto correctamente`);
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error al marcar video como visto:', error);
    res.json({ success: false, error: 'Error al procesar la solicitud' });
  }
});

module.exports = router;