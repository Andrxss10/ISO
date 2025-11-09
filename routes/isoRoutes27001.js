const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Render ISO 27001 form
router.get('/IsoForm27001', isAuthenticated, (req, res) => {
  const alertData = req.session.alertData || {};
  req.session.alertData = null;
  res.render('IsoForm27001', alertData);
});


// POST - Registrar empresa ISO 27001
router.post('/registro-iso-27001', (req, res) => {
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
    INSERT INTO registro_iso_27001 
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
      console.error("❌ Error al registrar la auditoría ISO 27001:", err);
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

    console.log("✅ Registro ISO 27001 insertado con ID:", this.lastID);
    req.session.empresa_id = this.lastID;
    req.session.norma_actual = '27001';

    req.session.alertData = {
      alert: true,
      alertTitle: "Registro Exitoso",
      alertMessage: "La auditoría ISO 27001 se registró correctamente.",
      alertIcon: 'success',
      showConfirmButton: true,
      ruta: "/IsoChecklist27001"
    };

    res.redirect('/IsoChecklist27001');
  });
});


// POST - Guardar checklist ISO 27001 - VERSIÓN CORREGIDA
// POST - Guardar checklist ISO 27001 - VERSIÓN CORREGIDA
router.post('/guardar-checklist-27001', isAuthenticated, (req, res) => {
  const { empresa_id, resultados } = req.body;

  if (!empresa_id || !resultados || !Array.isArray(resultados)) {
    console.error("❌ Datos incompletos:", req.body);
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }

  // Función para normalizar cláusulas - CONVIERTE "A.5.1" a "A5.1"
  function normalizarClausula(clausula) {
    // Convierte "A.5.1" a "A5.1"
    return clausula.replace(/^A\.(\d+\.\d+)$/, 'A$1');
  }

  // Iniciar transacción
  db.run("BEGIN TRANSACTION");

  db.all("SELECT id, clausula FROM iso_27001_checklist", [], (err, clausulas) => {
    if (err) {
      db.run("ROLLBACK");
      console.error("❌ Error al obtener cláusulas:", err);
      return res.status(500).json({ success: false, message: 'Error al obtener cláusulas' });
    }

    const clausulasMap = {};
    clausulas.forEach(row => { 
      clausulasMap[row.clausula] = row.id;
    });

    let processed = 0;
    const total = resultados.length;
    let hasError = false;

    if (total === 0) {
      db.run("COMMIT");
      return res.json({ success: true, message: 'No hay datos que guardar' });
    }

    function handleError(error, message) {
      if (!hasError) {
        hasError = true;
        db.run("ROLLBACK");
        console.error("❌ Error:", error);
        res.status(500).json({ success: false, message: message });
      }
    }

    function checkCompletion() {
      processed++;
      if (processed === total && !hasError) {
        db.run("COMMIT", (err) => {
          if (err) {
            console.error("❌ Error al hacer commit:", err);
            return res.status(500).json({ success: false, message: 'Error al guardar checklist' });
          }
          console.log(`✅ Checklist ISO 27001 guardado para empresa ID:`, empresa_id);
          res.json({ success: true, message: 'Checklist guardado correctamente' });
        });
      }
    }

    resultados.forEach((resultado) => {
      if (hasError) return;

      let { clausula, estado, observaciones } = resultado;
      
      // NORMALIZAR LA CLÁUSULA - Esto es lo importante
      clausula = normalizarClausula(clausula);
      // console.log(`🔍 Cláusula normalizada: ${resultado.clausula} -> ${clausula}`);

      const checklistId = clausulasMap[clausula];

      if (!checklistId) {
        return handleError(null, `Cláusula no encontrada: ${clausula} (original: ${resultado.clausula})`);
      }

      db.get(
        "SELECT id FROM audit_results_27001 WHERE empresa_id = ? AND checklist_id = ?",
        [empresa_id, checklistId],
        (err, existing) => {
          if (err) {
            return handleError(err, 'Error al verificar datos');
          }

          if (existing) {
            // Actualizar
            db.run(
              "UPDATE audit_results_27001 SET estado = ?, observaciones = ?, fecha = CURRENT_TIMESTAMP WHERE empresa_id = ? AND checklist_id = ?",
              [estado, observaciones, empresa_id, checklistId],
              (err) => {
                if (err) {
                  return handleError(err, 'Error al actualizar datos');
                }
                checkCompletion();
              }
            );
          } else {
            // Insertar
            db.run(
              "INSERT INTO audit_results_27001 (empresa_id, checklist_id, estado, observaciones, fecha) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
              [empresa_id, checklistId, estado, observaciones],
              (err) => {
                if (err) {
                  return handleError(err, 'Error al insertar datos');
                }
                checkCompletion();
              }
            );
          }
        }
      );
    });
  });
});

// Render checklist ISO 27001
router.get('/IsoChecklist27001', isAuthenticated, (req, res) => {
  const alertData = req.session.alertData || {};
  req.session.alertData = null;
  res.render('IsoChecklist27001', {
    ...alertData,
    empresa_id: req.session.empresa_id || null
  });
});

module.exports = router;