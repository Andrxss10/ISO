const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Render ISO seleccionada
router.get('/IsoSelect', isAuthenticated, (req, res) => {
  const alertData = req.session.alertData || {};
  req.session.alertData = null;
  res.render('IsoSelect', alertData);
});

// Render ISO 9001 form
router.get('/IsoForm9001', isAuthenticated, (req, res) => {
  const alertData = req.session.alertData || {};
  req.session.alertData = null;
  res.render('IsoForm9001', alertData);
});

// Render ISO 27001 form
router.get('/IsoForm27001', isAuthenticated, (req, res) => {
  const alertData = req.session.alertData || {};
  req.session.alertData = null;
  res.render('IsoForm27001', alertData);
});

// POST - Registrar empresa ISO
router.post('/registro-iso', (req, res) => {
  const {
    razonSocial,
    nit,
    representanteLegal,
    sectorEconomico,
    tipoEmpresa,
    numeroEmpleados,
    direccion,
    telefonos,
    email,
    web,
    facebook,
    instagram,
    tiktok
  } = req.body;

  const sql = `
    INSERT INTO registro_iso 
    (razon_social, nit, representante_legal, sector_economico, tipo_empresa, numero_empleados, direccion, telefonos, email, web, facebook, instagram, tiktok) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    razonSocial,
    nit,
    representanteLegal,
    sectorEconomico,
    tipoEmpresa,
    numeroEmpleados,
    direccion,
    telefonos,
    email,
    web,
    facebook,
    instagram,
    tiktok
  ];

  db.run(sql, values, function (err) {
    if (err) {
      console.error("❌ Error al registrar la auditoría ISO:", err);
      req.session.alertData = {
        alert: true,
        alertTitle: "Error",
        alertMessage: "No se pudo registrar la auditoría.",
        alertIcon: 'error',
        showConfirmButton: true,
        ruta: "/IsoSelect"
      };
      return res.redirect('/IsoSelect');
    }

    console.log("✅ Registro ISO insertado con ID:", this.lastID);
    req.session.empresa_id = this.lastID;

    req.session.alertData = {
      alert: true,
      alertTitle: "Registro Exitoso",
      alertMessage: "La auditoría se registró correctamente.",
      alertIcon: 'success',
      showConfirmButton: true,
      ruta: "/IsoChecklist9001"
    };

    res.redirect('/IsoChecklist9001');
  });
});

// POST - Guardar checklist
router.post('/guardar-checklist', isAuthenticated, (req, res) => {
  const { empresa_id, resultados } = req.body;

  if (!empresa_id || !resultados || !Array.isArray(resultados)) {
    console.error("❌ Datos incompletos:", req.body);
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }

  // Iniciar transacción
  db.run("BEGIN TRANSACTION");

  db.all("SELECT id, clausula FROM iso_9001_checklist", [], (err, clausulas) => {
    if (err) {
      db.run("ROLLBACK");
      console.error("❌ Error al obtener cláusulas:", err);
      return res.status(500).json({ success: false, message: 'Error al obtener cláusulas' });
    }

    const clausulasMap = {};
    clausulas.forEach(row => { clausulasMap[row.clausula] = row.id; });

    let processed = 0;
    const total = resultados.length;

    if (total === 0) {
      db.run("COMMIT");
      return res.json({ success: true, message: 'No hay datos que guardar' });
    }

    resultados.forEach((resultado) => {
      const { clausula, estado, observaciones } = resultado;
      const checklistId = clausulasMap[clausula];

      if (!checklistId) {
        db.run("ROLLBACK");
        return res.status(400).json({ success: false, message: `Cláusula no encontrada: ${clausula}` });
      }

      db.get(
        "SELECT id FROM audit_results WHERE empresa_id = ? AND checklist_id = ?",
        [empresa_id, checklistId],
        (err, existing) => {
          if (err) {
            db.run("ROLLBACK");
            console.error("❌ Error al verificar registro:", err);
            return res.status(500).json({ success: false, message: 'Error al verificar datos' });
          }

          if (existing) {
            // Actualizar
            db.run(
              "UPDATE audit_results SET estado = ?, observaciones = ?, fecha = CURRENT_TIMESTAMP WHERE empresa_id = ? AND checklist_id = ?",
              [estado, observaciones, empresa_id, checklistId],
              (err) => {
                processed++;
                if (err) {
                  db.run("ROLLBACK");
                  console.error("❌ Error al actualizar:", err);
                  return res.status(500).json({ success: false, message: 'Error al actualizar datos' });
                }
                if (processed === total) finalizeTransaction(res, empresa_id);
              }
            );
          } else {
            // Insertar
            db.run(
              "INSERT INTO audit_results (empresa_id, checklist_id, estado, observaciones, fecha) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
              [empresa_id, checklistId, estado, observaciones],
              (err) => {
                processed++;
                if (err) {
                  db.run("ROLLBACK");
                  console.error("❌ Error al insertar:", err);
                  return res.status(500).json({ success: false, message: 'Error al insertar datos' });
                }
                if (processed === total) finalizeTransaction(res, empresa_id);
              }
            );
          }
        }
      );
    });

    function finalizeTransaction(res, empresa_id) {
      db.run("COMMIT", (err) => {
        if (err) {
          db.run("ROLLBACK");
          console.error("❌ Error al hacer commit:", err);
          return res.status(500).json({ success: false, message: 'Error al guardar checklist' });
        }
        console.log("✅ Checklist guardado para empresa ID:", empresa_id);
        res.json({ success: true, message: 'Checklist guardado correctamente' });
      });
    }
  });
});

// Render checklist ISO
router.get('/IsoChecklist9001', isAuthenticated, (req, res) => {
  const alertData = req.session.alertData || {};
  req.session.alertData = null;
  res.render('IsoChecklist9001', {
    ...alertData,
    empresa_id: req.session.empresa_id || null
  });
});

module.exports = router;
