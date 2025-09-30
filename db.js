// db.js
const sqlite3 = require("sqlite3").verbose();
const path = require('path');

// Crear o abrir la base de datos local
const db = new sqlite3.Database("./ISOSystem.db", (err) => {
  if (err) {
    console.error("❌ Error al conectar con SQLite:", err.message);
  } else {
    console.log("✅ Conectado a la base de datos SQLite.");
  }
});

// Crear tablas
db.serialize(() => {
  // Usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_completo TEXT NOT NULL,
      correo TEXT UNIQUE NOT NULL,
      contrasena TEXT NOT NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Empresas registradas
  db.run(`
    CREATE TABLE IF NOT EXISTS registro_iso (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      razon_social TEXT NOT NULL,
      nit TEXT NOT NULL UNIQUE,
      representante_legal TEXT NOT NULL,
      sector_economico TEXT NOT NULL,
      tipo_empresa TEXT NOT NULL,
      numero_empleados INTEGER NOT NULL,
      direccion TEXT NOT NULL,
      telefonos TEXT NOT NULL,
      email TEXT NOT NULL,
      web TEXT,
      facebook TEXT,
      instagram TEXT,
      tiktok TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Checklist ISO 9001
  db.run(`
    CREATE TABLE IF NOT EXISTS iso_9001_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clausula TEXT NOT NULL,
      titulo TEXT NOT NULL
    )
  `);

  // Resultados de auditoría
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      checklist_id INTEGER NOT NULL,
      estado TEXT NOT NULL,
      observaciones TEXT,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES registro_iso(id) ON DELETE CASCADE,
      FOREIGN KEY (checklist_id) REFERENCES iso_9001_checklist(id) ON DELETE CASCADE
    )
  `);

  // Tabla para las plantillas disponibles (NUEVA)
  db.run(`
    CREATE TABLE IF NOT EXISTS plantillas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clausula TEXT NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      archivo_path TEXT NOT NULL,
      video_path TEXT,
      contenido_capacitacion TEXT,
      norma TEXT DEFAULT '9001',
      checklist_id INTEGER,
      FOREIGN KEY (checklist_id) REFERENCES iso_9001_checklist(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios_capacitaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      plantilla_id INTEGER NOT NULL,
      completado BOOLEAN DEFAULT 0,
      fecha_visto TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (plantilla_id) REFERENCES plantillas(id),
      UNIQUE(usuario_id, plantilla_id)
    )

  `);

  // Tabla para los archivos subidos por usuarios (NUEVA)
  db.run(`
    CREATE TABLE IF NOT EXISTS archivos_usuario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      plantilla_id INTEGER NOT NULL,
      archivo_path TEXT NOT NULL,
      fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (plantilla_id) REFERENCES plantillas(id)
    )
  `);



  // Insertar datos iniciales en el checklist solo si está vacío
  db.get("SELECT COUNT(*) AS count FROM iso_9001_checklist", (err, row) => {
    if (err) {
      console.error("❌ Error verificando checklist:", err.message);
    } else if (row.count === 0) {
      console.log("ℹ️ Insertando datos iniciales en iso_9001_checklist...");
      const stmt = db.prepare(
        `INSERT INTO iso_9001_checklist (clausula, titulo) VALUES (?, ?)`
      );
      const data = [
        ["4.3", "Determinación del alcance del sistema de gestión de la calidad"],
        ["4.4", "Sistema de gestión de la calidad y sus procesos"],
        ["5.1", "Liderazgo y compromiso"],
        ["6.2", "Objetivos de la calidad y planificación para lograrlos"],
        ["6.3", "Planificación de los cambios"],
        ["7.1.4", "Ambiente para la operación de los procesos"],
        ["7.1.6", "Conocimientos de la organización"],
        ["7.2", "Competencia"],
        ["7.3", "Toma de conciencia"],
        ["7.5", "Información documentada"],
        ["8.1", "Planificación y control operacional"],
        ["8.2", "Requisitos para los productos y servicios"],
        ["8.4", "Control de los procesos, productos y servicios suministrados externamente"],
        ["8.5.2", "Identificación y trazabilidad"],
        ["8.6", "Liberación de los productos y servicios"],
        ["8.7", "Control de los elementos de la salida del proceso, productos y servicios no conformes"],
        ["9.1", "Seguimiento, medición, análisis y evaluación"],
      ];
      data.forEach((item) => stmt.run(item[0], item[1]));
      stmt.finalize();
    }
  });

  // Insertar datos iniciales en las plantillas solo si está vacío
  db.get("SELECT COUNT(*) AS count FROM plantillas", (err, row) => {
    if (err) {
      console.error("❌ Error verificando plantillas:", err.message);
    } else if (row.count === 0) {
      console.log("ℹ️ Insertando datos iniciales en plantillas...");
      const stmt = db.prepare(
        `INSERT INTO plantillas (clausula, nombre, descripcion, archivo_path, video_path, contenido_capacitacion, checklist_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      
      // Datos completos para las plantillas ISO 9001 (solo las que tienes)
      const plantillasData = [
          [
            "4.3", 
            "Alcance del SGC", 
            "Plantilla para definir el alcance del Sistema de Gestión de Calidad",
            "./plantillas/iso9001/4.3.+Plantilla+Alcance+formato.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Alcance del Sistema de Gestión de Calidad</h2>

              <h4 class="text-secondary">Objetivo</h4>
              <p>
                Definir los límites y aplicabilidad del Sistema de Gestión de Calidad (SGC) de acuerdo con los requisitos de la norma ISO 9001:2015.
              </p>

              <h5 class="mt-3">¿Qué debe incluir el alcance?</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Productos y servicios cubiertos:</strong> Identifique claramente qué productos y servicios están incluidos en el SGC.
                </li>
                <li class="list-group-item">
                  <strong>Ubicaciones y unidades organizacionales:</strong> Especifique las sedes, departamentos o procesos incluidos.
                </li>
                <li class="list-group-item">
                  <strong>Exclusiones justificadas:</strong> Si existen requisitos de la norma que no aplican, deben estar justificados documentalmente.
                </li>
              </ul>

              <h5 class="mt-3">Consideraciones clave</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li>El alcance debe ser coherente con el contexto de la organización y las necesidades de las partes interesadas.</li>
                  <li>Debe reflejar los productos y servicios que afectan la capacidad de la organización para cumplir con los requisitos del cliente.</li>
                  <li>Las exclusiones no pueden afectar la capacidad o responsabilidad de la organización para proveer productos y servicios que cumplan con los requisitos.</li>
                </ul>
              </div>

              <h5 class="mt-3">Proceso de definición</h5>
              <ol class="list-group list-group-numbered">
                <li class="list-group-item">Analice el contexto de la organización</li>
                <li class="list-group-item">Identifique las partes interesadas relevantes</li>
                <li class="list-group-item">Determine los límites del sistema</li>
                <li class="list-group-item">Documente y comunique el alcance</li>
              </ol>
            </div>
            `,
            1
          ],
          [
            "4.4", 
            "Procesos del SGC", 
            "Plantilla para documentar los procesos del Sistema de Gestión de Calidad",
            "./plantillas/iso9001/4.4.+Ficha+de+procesos+Formato.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Sistema de Gestión de Calidad y sus Procesos</h2>

              <h4 class="text-secondary">Objetivo</h4>
              <p>
                Establecer, implementar, mantener y mejorar continuamente un sistema de gestión de calidad efectivo.
              </p>

              <h5 class="mt-3">Elementos clave del SGC</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Procesos interrelacionados:</strong> Identifique cómo los procesos se conectan y afectan entre sí.
                </li>
                <li class="list-group-item">
                  <strong>Criterios y métodos:</strong> Establezca cómo se operan y controlan los procesos.
                </li>
                <li class="list-group-item">
                  <strong>Recursos necesarios:</strong> Determine los recursos requeridos para cada proceso.
                </li>
                <li class="list-group-item">
                  <strong>Riesgos y oportunidades:</strong> Identifique y aborde los riesgos en cada proceso.
                </li>
              </ul>

              <h5 class="mt-3">Enfoque basado en procesos</h5>
              <div class="alert alert-info">
                <p>El enfoque de procesos implica:</p>
                <ul class="mb-0">
                  <li>La identificación sistemática de los procesos de la organización</li>
                  <li>La definición de interacciones entre procesos</li>
                  <li>La determinación de criterios y métodos para operar procesos</li>
                  <li>La asignación de responsabilidades y autoridades</li>
                </ul>
              </div>

              <h5 class="mt-3">Mejora continua</h5>
              <p>El SGC debe promover la mejora continua mediante:</p>
              <ol class="list-group list-group-numbered">
                <li class="list-group-item">La revisión periódica de procesos</li>
                <li class="list-group-item">La implementación de acciones correctivas</li>
                <li class="list-group-item">La evaluación del desempeño de procesos</li>
                <li class="list-group-item">La identificación de oportunidades de mejora</li>
              </ol>
            </div>
            `,
            2
          ],
          [
            "5.1", 
            "Compromiso de liderazgo", 
            "Plantilla para evidenciar el compromiso de la dirección",
            "./plantillas/iso9001/5.1.+Check+list+Liderazgo+Actual+Formato.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Liderazgo y Compromiso</h2>

              <h4 class="text-secondary">Responsabilidades de la alta dirección</h4>
              <p>La alta dirección debe demostrar liderazgo y compromiso mediante:</p>

              <h5 class="mt-3">Acciones específicas</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Asegurar la integración:</strong> Del SGC con los procesos business de la organización.
                </li>
                <li class="list-group-item">
                  <strong>Promover el enfoque al cliente:</strong> En todos los niveles.
                </li>
                <li class="list-group-item">
                  <strong>Establecer la política de calidad:</strong> Y asegurar que se comprenda.
                </li>
                <li class="list-group-item">
                  <strong>Asignar recursos:</strong> Necesarios para el SGC.
                </li>
                <li class="list-group-item">
                  <strong>Conducir revisiones por la dirección:</strong> Periódicas.
                </li>
              </ul>

              <h5 class="mt-3">Evidencias de compromiso</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">Comunicación activa sobre la importancia de la calidad</li>
                <li class="list-group-item">Participación en revisiones del SGC</li>
                <li class="list-group-item">Toma de decisiones basada en datos del SGC</li>
                <li class="list-group-item">Reconocimiento de contribuciones al SGC</li>
              </ul>

              <h5 class="mt-3">Beneficios del liderazgo efectivo</h5>
              <div class="alert alert-success">
                <ul class="mb-0">
                  <li>Mejora en la cultura de calidad organizacional</li>
                  <li>Mayor compromiso del personal</li>
                  <li>Mejor alineación con objetivos estratégicos</li>
                  <li>Mayor satisfacción del cliente</li>
                </ul>
              </div>
            </div>
            `,
            3
          ],
          [
            "6.2", 
            "Objetivos de calidad", 
            "Plantilla para establecer objetivos de calidad y planificar su consecución",
            "./plantillas/iso9001/6.2+Objetivos+de+calidad.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Objetivos de la Calidad y Planificación</h2>

              <h4 class="text-secondary">Características de objetivos efectivos (SMART)</h4>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Específicos:</strong> Claramente definidos y enfocados
                </li>
                <li class="list-group-item">
                  <strong>Medibles:</strong> Cuantificables con indicadores
                </li>
                <li class="list-group-item">
                  <strong>Alcanzables:</strong> Realistas y posibles de lograr
                </li>
                <li class="list-group-item">
                  <strong>Relevantes:</strong> Alineados con la política de calidad
                </li>
                <li class="list-group-item">
                  <strong>Temporales:</strong> Con plazos definidos
                </li>
              </ul>

              <h5 class="mt-3">Proceso de establecimiento</h5>
              <ol class="list-group list-group-numbered">
                <li class="list-group-item">
                  <strong>Derivación de la política:</strong> Los objetivos deben apoyar la política de calidad
                </li>
                <li class="list-group-item">
                  <strong>Consideración del contexto:</strong> Analice factores internos y externos
                </li>
                <li class="list-group-item">
                  <strong>Evaluación de riesgos:</strong> Identifique obstáculos potenciales
                </li>
                <li class="list-group-item">
                  <strong>Asignación de recursos:</strong> Determine lo necesario para lograr los objetivos
                </li>
              </ol>

              <h5 class="mt-3">Ejemplos de objetivos</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li>Reducir defectos en un 15% en los próximos 6 meses</li>
                  <li>Mejorar la satisfacción del cliente al 95% en el próximo año</li>
                  <li>Reducir tiempos de entrega en un 20% para fin de año</li>
                  <li>Implementar 3 mejoras de procesos por trimestre</li>
                </ul>
              </div>

              <h5 class="mt-3">Seguimiento y revisión</h5>
              <ul class="list-group">
                <li class="list-group-item">Establezca indicadores de desempeño (KPIs)</li>
                <li class="list-group-item">Defina frecuencia de medición</li>
                <li class="list-group-item">Asigne responsables del seguimiento</li>
                <li class="list-group-item">Establezca acciones cuando no se cumplan los objetivos</li>
              </ul>
            </div>
            `,
            4
          ],
          [
            "6.3", 
            "Planificación de cambios", 
            "Plantilla para planificar cambios en el SGC",
            "./plantillas/iso9001/6.3.+Planificación+de+los+cambios+formato.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Planificación de los Cambios</h2>

              <h4 class="text-secondary">Enfoque sistemático para cambios</h4>
              <p>La organización debe planificar cambios de manera controlada considerando:</p>

              <h5 class="mt-3">Aspectos a considerar</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Propósito del cambio:</strong> ¿Por qué es necesario?
                </li>
                <li class="list-group-item">
                  <strong>Consecuencias potenciales:</strong> Impacto en procesos, productos y personas
                </li>
                <li class="list-group-item">
                  <strong>Integridad del SGC:</strong> Cómo afecta al sistema completo
                </li>
                <li class="list-group-item">
                  <strong>Disponibilidad de recursos:</strong> Recursos necesarios para implementar el cambio
                </li>
              </ul>

              <h5 class="mt-3">Tipos de cambios</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li><strong>Cambios estratégicos:</strong> Modificaciones en dirección o enfoque</li>
                  <li><strong>Cambios operativos:</strong> Ajustes en procesos o procedimientos</li>
                  <li><strong>Cambios tecnológicos:</strong> Implementación de nuevas tecnologías</li>
                  <li><strong>Cambios organizacionales:</strong> Reestructuraciones o nuevas asignaciones</li>
                </ul>
              </div>

              <h5 class="mt-3">Proceso de planificación</h5>
              <ol class="list-group list-group-numbered">
                <li class="list-group-item">
                  <strong>Identificación de necesidad:</strong> Detectar qué debe cambiar
                </li>
                <li class="list-group-item">
                  <strong>Evaluación de impacto:</strong> Analizar consecuencias
                </li>
                <li class="list-group-item">
                  <strong>Planificación detallada:</strong> Desarrollar plan de implementación
                </li>
                <li class="list-group-item">
                  <strong>Comunicación:</strong> Informar a todas las partes afectadas
                </li>
                <li class="list-group-item">
                  <strong>Implementación:</strong> Ejecutar el cambio controladamente
                </li>
                <li class="list-group-item">
                  <strong>Verificación:</strong> Confirmar que el cambio funciona como se planeó
                </li>
              </ol>
            </div>
            `,
            5
          ],
          [
            "7.1.4", 
            "Ambiente de procesos", 
            "Plantilla para determinar y gestionar el ambiente para la operación de procesos",
            "./plantillas/iso9001/7.1.4.+Formato+Medición+de+condiciones+físicas.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Ambiente para la Operación de Procesos</h2>

              <h4 class="text-secondary">Componentes del ambiente de trabajo</h4>
              <p>El ambiente incluye condiciones físicas, ambientales y otros factores que afectan la calidad:</p>

              <h5 class="mt-3">Factores físicos</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Espacio de trabajo:</strong> Diseño, distribución y ergonomía
                </li>
                <li class="list-group-item">
                  <strong>Temperatura y humedad:</strong> Control climático apropiado
                </li>
                <li class="list-group-item">
                  <strong>Iluminación:</strong> Niveles adecuados para las actividades
                </li>
                <li class="list-group-item">
                  <strong>Ruido:</strong> Control de niveles sonoros
                </li>
              </ul>

              <h5 class="mt-3">Factores ambientales</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Ventilación:</strong> Calidad del aire y circulación
                </li>
                <li class="list-group-item">
                  <strong>Limpieza:</strong> Mantenimiento de condiciones higiénicas
                </li>
                <li class="list-group-item">
                  <strong>Seguridad:</strong> Protección contra riesgos
                </li>
              </ul>

              <h5 class="mt-3">Factores humanos</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Ergonomía:</strong> Diseño amigable para los usuarios
                </li>
                <li class="list-group-item">
                  <strong>Estrés:</strong> Gestión de cargas de trabajo
                </li>
                <li class="list-group-item">
                  <strong>Bienestar:</strong> Consideraciones de comodidad y salud
                </li>
              </ul>

              <h5 class="mt-3">Gestión del ambiente</h5>
              <ol class="list-group list-group-numbered">
                <li class="list-group-item">Establezca criterios para condiciones ambientales</li>
                <li class="list-group-item">Monitoree regularmente las condiciones</li>
                <li class="list-group-item">Implemente controles cuando sea necesario</li>
                <li class="list-group-item">Documente los requisitos ambientales</li>
              </ol>
            </div>
            `,
            6
          ],
          [
            "7.1.6", 
            "Conocimientos organizacionales", 
            "Plantilla para gestionar los conocimientos de la organización",
            "./plantillas/iso9001/7.1.6.+Formato-Conocimientos+de+la+organización.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Conocimientos de la Organización</h2>

              <h4 class="text-secondary">Objetivo</h4>
              <p>
                Determinar y gestionar los conocimientos necesarios para la operación de procesos y lograr la conformidad de productos y servicios.
              </p>

              <h5 class="mt-3">Tipos de conocimientos</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Conocimientos tácitos:</strong> Experiencia y habilidades del personal
                </li>
                <li class="list-group-item">
                  <strong>Conocimientos explícitos:</strong> Documentación, procedimientos y bases de datos
                </li>
                <li class="list-group-item">
                  <strong>Conocimientos externos:</strong> Información de clientes, proveedores y partes interesadas
                </li>
              </ul>

              <h5 class="mt-3">Gestión del conocimiento</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li><strong>Identificación:</strong> Detectar qué conocimientos son críticos para la organización</li>
                  <li><strong>Captura:</strong> Documentar y almacenar conocimientos importantes</li>
                  <li><strong>Compartir:</strong> Facilitar el acceso y transferencia de conocimientos</li>
                  <li><strong>Protección:</strong> Salvaguardar conocimientos críticos contra pérdida</li>
                  <li><strong>Actualización:</strong> Mantener los conocimientos relevantes y actualizados</li>
                </ul>
              </div>

              <h5 class="mt-3">Fuentes de conocimiento</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">Experiencia interna del personal</li>
                <li class="list-group-item">Lecciones aprendidas de proyectos</li>
                <li class="list-group-item">Información de clientes y proveedores</li>
                <li class="list-group-item">Investigación y desarrollo</li>
                <li class="list-group-item">Benchmarking y mejores prácticas</li>
              </ul>

              <h5 class="mt-3">Prevención de pérdida</h5>
              <ol class="list-group list-group-numbered">
                <li class="list-group-item">Plan de sucesión para posiciones críticas</li>
                <li class="list-group-item">Documentación de procesos clave</li>
                <li class="list-group-item">Programas de mentoría y capacitación</li>
                <li class="list-group-item">Bases de datos de lecciones aprendidas</li>
              </ol>
            </div>
            `,
            7
          ],
          [
            "7.2", 
            "Competencia", 
            "Plantilla para determinar y gestionar la competencia del personal",
            "./plantillas/iso9001/7.2.+Formato-+Competencia.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Competencia</h2>

              <h4 class="text-secondary">Determinación de competencias</h4>
              <p>
                Identifique las competencias necesarias para el personal que realiza trabajo bajo el control de la organización que afecta el desempeño del SGC.
              </p>

              <h5 class="mt-3">Proceso de evaluación</h5>
              <ol class="list-group list-group-numbered">
                <li class="list-group-item">
                  <strong>Identificar requisitos:</strong> Determinar competencias necesarias por puesto
                </li>
                <li class="list-group-item">
                  <strong>Evaluar brechas:</strong> Comparar competencias actuales vs. requeridas
                </li>
                <li class="list-group-item">
                  <strong>Implementar acciones:</strong> Capacitación, contratación o reasignación
                </li>
                <li class="list-group-item">
                  <strong>Verificar efectividad:</strong> Evaluar si se cerraron las brechas
                </li>
              </ol>

              <h5 class="mt-3">Métodos de desarrollo de competencias</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Capacitación interna:</strong> Programas desarrollados por la organización
                </li>
                <li class="list-group-item">
                  <strong>Capacitación externa:</strong> Cursos, seminarios y certificaciones
                </li>
                <li class="list-group-item">
                  <strong>Mentoría:</strong> Aprendizaje guiado por personal experimentado
                </li>
                <li class="list-group-item">
                  <strong>Rotación de puestos:</strong> Experiencia en diferentes áreas
                </li>
                <li class="list-group-item">
                  <strong>Autoaprendizaje:</strong> Recursos y materiales de estudio
                </li>
              </ul>

              <h5 class="mt-3">Evidencia de competencia</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li>Certificados y diplomas</li>
                  <li>Registros de evaluación de desempeño</li>
                  <li>Resultados de pruebas y exámenes</li>
                  <li>Observación directa del trabajo</li>
                  <li>Feedback de supervisores y clientes</li>
                </ul>
              </div>

              <h5 class="mt-3">Mantenimiento de competencias</h5>
              <ul class="list-group">
                <li class="list-group-item">Actualización periódica de requisitos</li>
                <li class="list-group-item">Evaluación continua del desempeño</li>
                <li class="list-group-item">Planes de desarrollo individual</li>
                <li class="list-group-item">Seguimiento de acciones de capacitación</li>
              </ul>
            </div>
            `,
            8
          ],
          [
            "7.3", 
            "Toma de conciencia", 
            "Plantilla para asegurar que el personal es consciente de la política y objetivos de calidad",
            "./plantillas/iso9001/7.3.+Formato++-+Toma+de+conciencia.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Toma de Conciencia</h2>

              <h4 class="text-secondary">Objetivo</h4>
              <p>
                Asegurar que el personal es consciente de:
              </p>
              <ul class="list-group mb-3">
                <li class="list-group-item">La política de calidad</li>
                <li class="list-group-item">Los objetivos de calidad relevantes</li>
                <li class="list-group-item">Su contribución a la efectividad del SGC</li>
                <li class="list-group-item">Las implicaciones de no conformarse con los requisitos</li>
              </ul>

              <h5 class="mt-3">Estrategias de comunicación</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li><strong>Comunicación formal:</strong> Reuniones, boletines y carteleras</li>
                  <li><strong>Comunicación informal:</strong> Conversaciones y feedback diario</li>
                  <li><strong>Comunicación visual:</strong> Carteles, pantallas y material gráfico</li>
                  <li><strong>Comunicación digital:</strong> Correos, intranet y redes internas</li>
                </ul>
              </div>

              <h5 class="mt-3">Contenido clave a comunicar</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">Importancia del cumplimiento de requisitos</li>
                <li class="list-group-item">Beneficios del SGC para la organización</li>
                <li class="list-group-item">Rol de cada persona en el logro de objetivos</li>
                <li class="list-group-item">Consecuencias de no seguir los procedimientos</li>
                <li class="list-group-item">Logros y éxitos del SGC</li>
              </ul>

              <h5 class="mt-3">Medición de efectividad</h5>
              <ol class="list-group list-group-numbered">
                <li class="list-group-item">Encuestas de satisfacción y conocimiento</li>
                <li class="list-group-item">Pruebas de comprensión de políticas</li>
                <li class="list-group-item">Observación de comportamientos</li>
                <li class="list-group-item">Análisis de no conformidades relacionadas</li>
                <li class="list-group-item">Feedback en reuniones y evaluaciones</li>
              </ol>

              <h5 class="mt-3">Programa de concienciación</h5>
              <ul class="list-group">
                <li class="list-group-item">Inducción para nuevo personal</li>
                <li class="list-group-item">Capacitación periódica de refresco</li>
                <li class="list-group-item">Campañas temáticas específicas</li>
                <li class="list-group-item">Reconocimiento de contribuciones</li>
                <li class="list-group-item">Comunicación de casos de éxito</li>
              </ul>
            </div>
            `,
            9
          ],
          [
            "7.5", 
            "Información documentada", 
            "Plantilla para controlar la información documentada del SGC",
            "./plantillas/iso9001/7.5.+Formato+-+Información+documentada.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Información Documentada</h2>

              <h4 class="text-secondary">Tipos de información documentada</h4>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Documentos requeridos por la norma:</strong> Política, objetivos, procedimientos
                </li>
                <li class="list-group-item">
                  <strong>Documentos necesarios para efectividad:</strong> Instrucciones, formatos, guías
                </li>
                <li class="list-group-item">
                  <strong>Registros:</strong> Evidencia de actividades realizadas y resultados obtenidos
                </li>
              </ul>

              <h5 class="mt-3">Control de documentos</h5>
              
              <h6 class="text-secondary">Creación y actualización</h6>
              <ul class="list-group mb-3">
                <li class="list-group-item">Identificación apropiada (códigos, versiones)</li>
                <li class="list-group-item">Revisión y aprobación antes de emisión</li>
                <li class="list-group-item">Control de cambios y revisiones</li>
                <li class="list-group-item">Accesibilidad para usuarios autorizados</li>
              </ul>

              <h6 class="text-secondary">Distribución y acceso</h6>
              <ul class="list-group mb-3">
                <li class="list-group-item">Disponibilidad donde se necesite</li>
                <li class="list-group-item">Protección contra modificaciones no autorizadas</li>
                <li class="list-group-item">Control de copias no controladas</li>
                <li class="list-group-item">Acceso para partes interesadas relevantes</li>
              </ul>

              <h6 class="text-secondary">Conservación y disposición</h6>
              <ul class="list-group mb-3">
                <li class="list-group-item">Tiempos de retención definidos</li>
                <li class="list-group-item">Protección contra deterioro o pérdida</li>
                <li class="list-group-item">Disposición controlada cuando ya no se necesiten</li>
                <li class="list-group-item">Archivo histórico cuando corresponda</li>
              </ul>

              <h5 class="mt-3">Medios de almacenamiento</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li>Documentos físicos en papel</li>
                  <li>Archivos digitales en sistemas electrónicos</li>
                  <li>Bases de datos y sistemas especializados</li>
                  <li>Almacenamiento en la nube con controles de seguridad</li>
                </ul>
              </div>

              <h5 class="mt-3">Mejoras continuas</h5>
              <ol class="list-group list-group-numbered">
                <li class="list-group-item">Revisión periódica de documentos</li>
                <li class="list-group-item">Actualización basada en cambios y lecciones aprendidas</li>
                <li class="list-group-item">Simplificación y eliminación de documentos obsoletos</li>
                <li class="list-group-item">Digitalización y optimización de procesos documentales</li>
              </ol>
            </div>
            `,
            10
          ],
          [
            "8.1", 
            "Planificación operacional", 
            "Plantilla para planificar y controlar las operaciones",
            "./plantillas/iso9001/8.1.+Planificación+y+control+operacional.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Planificación y Control Operacional</h2>

              <h4 class="text-secondary">Proceso de planificación</h4>
              <p>
                Planifique, implemente y controle los procesos necesarios para cumplir con los requisitos para la provisión de productos y servicios.
              </p>

              <h5 class="mt-3">Elementos de la planificación</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Determinación de requisitos:</strong> Especificaciones del producto/servicio
                </li>
                <li class="list-group-item">
                  <strong>Establecimiento de criterios:</strong> Parámetros para procesos y productos
                </li>
                <li class="list-group-item">
                  <strong>Determinación de recursos:</strong> Personas, equipos, materiales e información
                </li>
                <li class="list-group-item">
                  <strong>Controles de proceso:</strong> Métodos de monitoreo y medición
                </li>
              </ul>

              <h5 class="mt-3">Criterios de aceptación</h5>
              <p>Establezca criterios para:</p>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li>Los procesos de producción y prestación de servicio</li>
                  <li>La aceptación de productos y servicios</li>
                  <li>La liberación de productos y servicios</li>
                  <li>La entrega y actividades posteriores a la entrega</li>
                </ul>
              </div>

              <h5 class="mt-3">Control de cambios</h5>
              <ol class="list-group list-group-numbered">
                <li class="list-group-item">Evaluación de consecuencias de cambios</li>
                <li class="list-group-item">Autorización de cambios antes de implementación</li>
                <li class="list-group-item">Comunicación de cambios a partes afectadas</li>
                <li class="list-group-item">Verificación de que cambios se implementaron correctamente</li>
              </ol>

              <h5 class="mt-3">Documentación de procesos</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">Procedimientos e instrucciones de trabajo</li>
                <li class="list-group-item">Especificaciones técnicas y parámetros</li>
                <li class="list-group-item">Diagramas de flujo y mapas de procesos</li>
                <li class="list-group-item">Formatos de registro y control</li>
              </ul>

              <h5 class="mt-3">Mejora continua</h5>
              <ul class="list-group">
                <li class="list-group-item">Análisis de datos de procesos</li>
                <li class="list-group-item">Identificación de oportunidades de mejora</li>
                <li class="list-group-item">Implementación de acciones correctivas</li>
                <li class="list-group-item">Verificación de efectividad de mejoras</li>
              </ul>
            </div>
            `,
            11
          ],
          [
            "8.2", 
            "Requisitos de productos y servicios", 
            "Plantilla para determinar requisitos de productos y servicios",
            "./plantillas/iso9001/8.2.+Requisitos+para+los+productos+y+servicios+-+Formato.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Requisitos para los Productos y Servicios</h2>

              <h4 class="text-secondary">Determinación de requisitos</h4>
              
              <h5 class="mt-3">Requisitos especificados por el cliente</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">Requisitos explícitos en órdenes o contratos</li>
                <li class="list-group-item">Requisitos implícitos (expectativas del cliente)</li>
                <li class="list-group-item">Requisitos legales y regulatorios aplicables</li>
                <li class="list-group-item">Requisitos adicionales determinados por la organización</li>
              </ul>

              <h5 class="mt-3">Comunicación con el cliente</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">Información sobre productos y servicios</li>
                <li class="list-group-item">Consultas, contratos y handling de órdenes</li>
                <li class="list-group-item">Feedback del cliente incluyendo quejas</li>
                <li class="list-group-item">Handling de situaciones de emergencia</li>
              </ul>

              <h5 class="mt-3">Revisión de requisitos</h5>
              
              <h6 class="text-secondary">Antes de comprometerse a suministrar</h6>
              <ol class="list-group list-group-numbered mb-3">
                <li class="list-group-item">Verificar que requisitos están definidos adecuadamente</li>
                <li class="list-group-item">Resolver requisitos contradictorios o incompletos</li>
                <li class="list-group-item">Confirmar que la organización puede cumplir requisitos</li>
              </ol>

              <h6 class="text-secondary">Cuando los requisitos cambian</h6>
              <ol class="list-group list-group-numbered mb-3">
                <li class="list-group-item">Actualizar documentación relevante</li>
                <li class="list-group-item">Informar al personal afectado por cambios</li>
                <li class="list-group-item">Asegurar que cambios se implementen correctamente</li>
              </ol>

              <h5 class="mt-3">Registros de revisión</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li>Resultados de la revisión de requisitos</li>
                  <li>Acciones resultantes de la revisión</li>
                  <li>Nuevos requisitos identificados</li>
                  <li>Acuerdos con el cliente sobre cambios</li>
                </ul>
              </div>

              <h5 class="mt-3">Gestión de expectativas</h5>
              <ul class="list-group">
                <li class="list-group-item">Comunicación clara de capacidades y limitaciones</li>
                <li class="list-group-item">Manejo proactivo de requisitos no convencionales</li>
                <li class="list-group-item">Educación del cliente sobre opciones disponibles</li>
                <li class="list-group-item">Negociación de plazos y especificaciones realistas</li>
              </ul>
            </div>
            `,
            12
          ],
          [
            "8.4", 
            "Control de procesos externos", 
            "Plantilla para controlar procesos, productos y servicios suministrados externamente",
            "./plantillas/iso9001/8.4+Control+de+los+procesos+externos.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Control de los Procesos, Productos y Servicios Suministrados Externaente</h2>

              <h4 class="text-secondary">Tipos de suministros externos</h4>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Productos:</strong> Materias primas, componentes, productos terminados
                </li>
                <li class="list-group-item">
                  <strong>Servicios:</strong> Transporte, mantenimiento, consultoría, testing
                </li>
                <li class="list-group-item">
                  <strong>Procesos:</strong> Subcontratación de procesos completos
                </li>
                <li class="list-group-item">
                  <strong>Personal:</strong> Trabajadores temporales o contratados
                </li>
              </ul>

              <h5 class="mt-3">Criterios de selección</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Capacidad técnica:</strong> Habilidad para cumplir requisitos
                </li>
                <li class="list-group-item">
                  <strong>Desempeño histórico:</strong> Track record y referencias
                </li>
                <li class="list-group-item">
                  <strong>Certificaciones:</strong> Sistemas de gestión implementados
                </li>
                <li class="list-group-item">
                  <strong>Capacidad financiera:</strong> Estabilidad económica del proveedor
                </li>
              </ul>

              <h5 class="mt-3">Verificación de productos externos</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li><strong>Inspección de recepción:</strong> Verificación al ingresar productos</li>
                  <li><strong>Certificados de conformidad:</strong> Documentación del proveedor</li>
                  <li><strong>Auditorías en sitio:</strong> Evaluación en instalaciones del proveedor</li>
                  <li><strong>Monitoreo de desempeño:</strong> Seguimiento continuo de calidad</li>
                </ul>
              </div>

              <h5 class="mt-3">Acciones ante no conformidades</h5>
              <ol class="list-group list-group-numbered mb-3">
                <li class="list-group-item">Rechazo de productos no conformes</li>
                <li class="list-group-item">Notificación al proveedor de problemas</li>
                <li class="list-group-item">Solicitud de acciones correctivas</li>
                <li class="list-group-item">Reevaluación del status de aprobación</li>
              </ol>

              <h5 class="mt-3">Mejora de proveedores</h5>
              <ul class="list-group">
                <li class="list-group-item">Programas de desarrollo de proveedores</li>
                <li class="list-group-item">Compartir mejores prácticas y requerimientos</li>
                <li class="list-group-item">Reconocimiento a proveedores destacados</li>
                <li class="list-group-item">Revisión conjunta de desempeño y oportunidades</li>
              </ul>
            </div>
            `,
            13
          ],
          [
            "8.5.2", 
            "Identificación y trazabilidad", 
            "Plantilla para gestionar identificación y trazabilidad",
            "./plantillas/iso9001/8.5.2.+Identificación+y+Trazabilidad+-+ADN+Lean.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Identificación y Trazabilidad</h2>

              <h4 class="text-secondary">Identificación de productos</h4>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Propósito:</strong> Distinguir productos o servicios entre sí
                </li>
                <li class="list-group-item">
                  <strong>Métodos:</strong> Etiquetas, códigos, números de serie, colores
                </li>
                <li class="list-group-item">
                  <strong>Requisitos:</strong> Identificación única cuando sea necesario
                </li>
                <li class="list-group-item">
                  <strong>Alcance:</strong> Desde recepción hasta entrega al cliente
                </li>
              </ul>

              <h5 class="mt-3">Trazabilidad</h5>
              
              <h6 class="text-secondary">Cuando sea requerida</h6>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Requisitos regulatorios:</strong> Industrias médica, aeronáutica, alimentaria
                </li>
                <li class="list-group-item">
                  <strong>Requisitos del cliente:</strong> Especificaciones contractuales
                </li>
                <li class="list-group-item">
                  <strong>Necesidades internas:</strong> Investigación de no conformidades
                </li>
              </ul>

              <h6 class="text-secondary">Sistema de trazabilidad</h6>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Identificación única:</strong> Códigos o números de lote
                </li>
                <li class="list-group-item">
                  <strong>Registros de seguimiento:</strong> Documentación de movimientos
                </li>
                <li class="list-group-item">
                  <strong>Vinculación de información:</strong> Relación entre componentes y producto final
                </li>
                <li class="list-group-item">
                  <strong>Recuperación de información:</strong> Capacidad de rastrear historial completo
                </li>
              </ul>

              <h5 class="mt-3">Control de estatus</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li><strong>Estatus de inspección:</strong> Pendiente, aprobado, rechazado</li>
                  <li><strong>Estatus de proceso:</strong> En proceso, completado, en hold</li>
                  <li><strong>Estatus de entrega:</strong> Por despachar, despachado, entregado</li>
                </ul>
              </div>

              <h5 class="mt-3">Tecnologías de identificación</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">Códigos de barras y QR</li>
                <li class="list-group-item">Sistemas RFID</li>
                <li class="list-group-item">Software de gestión de inventarios</li>
                <li class="list-group-item">Sistemas ERP integrados</li>
              </ul>

              <h5 class="mt-3">Beneficios de trazabilidad</h5>
              <ul class="list-group">
                <li class="list-group-item">Recall rápido y efectivo de productos</li>
                <li class="list-group-item">Investigación eficiente de no conformidades</li>
                <li class="list-group-item">Mejora en gestión de inventarios</li>
                <li class="list-group-item">Mayor confianza del cliente</li>
              </ul>
            </div>
            `,
            14
          ],
          [
            "8.6", 
            "Liberación de productos", 
            "Plantilla para implementar la liberación de productos y servicios",
            "./plantillas/iso9001/8.6.+Liberación+de+los+productos+y+servicios+formato.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Liberación de los Productos y Servicios</h2>

              <h4 class="text-secondary">Proceso de liberación</h4>
              <p>
                Implemente arreglos para asegurar que los productos y servicios no sean liberados hasta que se verifique el cumplimiento de los requisitos especificados.
              </p>

              <h5 class="mt-3">Verificación de conformidad</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Inspección final:</strong> Verificación completa antes de liberación
                </li>
                <li class="list-group-item">
                  <strong>Pruebas y ensayos:</strong> Evaluación de características específicas
                </li>
                <li class="list-group-item">
                  <strong>Documentación revisada:</strong> Confirmación de registros completos
                </li>
                <li class="list-group-item">
                  <strong>Embalaje y etiquetado:</strong> Verificación de presentación final
                </li>
              </ul>

              <h5 class="mt-3">Autoridad de liberación</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li><strong>Personal autorizado:</strong> Individuos con training y autoridad</li>
                  <li><strong>Procedimientos definidos:</strong> Criterios claros para liberación</li>
                  <li><strong>Registros de liberación:</strong> Evidencia de verificación realizada</li>
                  <li><strong>Sistemas automatizados:</strong> Liberación mediante sistemas electrónicos</li>
                </ul>
              </div>

              <h5 class="mt-3">Liberación por etapas</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Liberación parcial:</strong> Cuando aplicable por fases del proceso
                </li>
                <li class="list-group-item">
                  <strong>Liberación condicional:</strong> Con restricciones o condiciones específicas
                </li>
                <li class="list-group-item">
                  <strong>Liberación de muestras:</strong> Para aprobación inicial o testing
                </li>
              </ul>

              <h5 class="mt-3">Situaciones especiales</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Liberación de emergencia:</strong> Procedimientos para casos urgentes
                </li>
                <li class="list-group-item">
                  <strong>Liberación con concesión:</strong> Cuando se aceptan desviaciones
                </li>
                <li class="list-group-item">
                  <strong>Liberación de producto no conforme:</strong> Solo con autorización explícita
                </li>
              </ul>

              <h5 class="mt-3">Registros de liberación</h5>
              <ol class="list-group list-group-numbered">
                <li class="list-group-item">Certificados de conformidad</li>
                <li class="list-group-item">Reportes de inspección final</li>
                <li class="list-group-item">Autorizaciones de liberación</li>
                <li class="list-group-item">Evidencia de cumplimiento de requisitos</li>
              </ol>
            </div>
            `,
            15
          ],
          [
            "8.7", 
            "Control de no conformidades", 
            "Plantilla para controlar productos y servicios no conformes",
            "./plantillas/iso9001/8.7.+Control+de+Salidas+no+conformes+Formato.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Control de los Productos y Servicios No Conformes</h2>

              <h4 class="text-secondary">Identificación de no conformidades</h4>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Detección:</strong> Durante inspección, producción o uso
                </li>
                <li class="list-group-item">
                  <strong>Documentación:</strong> Registro de la no conformidad identificada
                </li>
                <li class="list-group-item">
                  <strong>Clasificación:</strong> Por tipo, severidad y frecuencia
                </li>
              </ul>

              <h5 class="mt-3">Acciones inmediatas</h5>
              <ol class="list-group list-group-numbered mb-3">
                <li class="list-group-item">
                  <strong>Contención:</strong> Aislar producto para prevenir uso no intencional
                </li>
                <li class="list-group-item">
                  <strong>Identificación:</strong> Etiquetar claramente como no conforme
                </li>
                <li class="list-group-item">
                  <strong>Evaluación:</strong> Determinar impacto y acciones necesarias
                </li>
              </ol>

              <h5 class="mt-3">Disposición de producto no conforme</h5>
              
              <h6 class="text-secondary">Opciones de disposición</h6>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Corrección:</strong> Reparación o rework para cumplir requisitos
                </li>
                <li class="list-group-item">
                  <strong>Concesión:</strong> Autorización para usar "tal cual" con aceptación
                </li>
                <li class="list-group-item">
                  <strong>Rechazo:</strong> Descarte, destrucción o devolución
                </li>
                <li class="list-group-item">
                  <strong>Prevención:</strong> Acciones para evitar recurrencia
                </li>
              </ul>

              <h6 class="text-secondary">Criterios para disposición</h6>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li><strong>Evaluación de riesgo:</strong> Impacto en seguridad y calidad</li>
                  <li><strong>Requisitos regulatorios:</strong> Cumplimiento legal aplicable</li>
                  <li><strong>Aceptación del cliente:</strong> Cuando sea requerida</li>
                  <li><strong>Consideraciones económicas:</strong> Costo-beneficio de acciones</li>
                </ul>
              </div>

              <h5 class="mt-3">Acciones correctivas</h5>
              <ol class="list-group list-group-numbered mb-3">
                <li class="list-group-item">
                  <strong>Análisis de causa raíz:</strong> Identificar por qué ocurrió
                </li>
                <li class="list-group-item">
                  <strong>Acciones para evitar recurrencia:</strong> Mejoras al proceso
                </li>
                <li class="list-group-item">
                  <strong>Verificación de efectividad:</strong> Confirmar que acciones funcionan
                </li>
                <li class="list-group-item">
                  <strong>Documentación:</strong> Registros completos de acciones tomadas
                </li>
              </ol>

              <h5 class="mt-3">Mejora del sistema</h5>
              <ul class="list-group">
                <li class="list-group-item">
                  <strong>Tendencia y análisis:</strong> Identificar patrones recurrentes
                </li>
                <li class="list-group-item">
                  <strong>Acciones preventivas:</strong> Address potential issues before they occur
                </li>
                <li class="list-group-item">
                  <strong>Revisión del proceso:</strong> Mejora de controles existentes
                </li>
                <li class="list-group-item">
                  <strong>Training:</strong> Capacitación para prevenir recurrencia
                </li>
              </ul>
            </div>
            `,
            16
          ],
          [
            "9.1", 
            "Seguimiento y medición", 
            "Plantilla para planificar el seguimiento, medición, análisis y evaluación",
            "./plantillas/iso9001/9.1.+Seguimiento,+medición,+análisis+y+evaluación++-+Formato.xlsx",
            "videoFondo.mp4",
            `
            <div class="p-4 border rounded bg-light">
              <h2 class="text-primary mb-3">Seguimiento, Medición, Análisis y Evaluación</h2>

              <h4 class="text-secondary">Planificación del monitoreo</h4>
              <p>
                Determine qué necesita ser monitoreado y medido, los métodos para ello, cuándo debe realizarse y cuándo deben analizarse y evaluarse los resultados.
              </p>

              <h5 class="mt-3">Qué monitorear</h5>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Desempeño de procesos:</strong> Eficiencia y efectividad
                </li>
                <li class="list-group-item">
                  <strong>Conformidad de producto:</strong> Cumplimiento de requisitos
                </li>
                <li class="list-group-item">
                  <strong>Satisfacción del cliente:</strong> Percepción y feedback
                </li>
                <li class="list-group-item">
                  <strong>Desempeño de proveedores:</strong> Calidad y entrega
                </li>
              </ul>

              <h5 class="mt-3">Métodos de medición</h5>
              <div class="alert alert-info">
                <ul class="mb-0">
                  <li><strong>Indicadores cuantitativos:</strong> KPIs y métricas numéricas</li>
                  <li><strong>Indicadores cualitativos:</strong> Encuestas y evaluaciones</li>
                  <li><strong>Observación directa:</strong> Evaluación visual o auditiva</li>
                  <li><strong>Auditorías:</strong> Evaluación sistemática contra criterios</li>
                </ul>
              </div>

              <h5 class="mt-3">Análisis de datos</h5>
              
              <h6 class="text-secondary">Técnicas de análisis</h6>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Análisis estadístico:</strong> Tendencia, variación y capacidad
                </li>
                <li class="list-group-item">
                  <strong>Comparación contra objetivos:</strong> Brechas y desempeño
                </li>
                <li class="list-group-item">
                  <strong>Benchmarking:</strong> Comparación contra estándares externos
                </li>
                <li class="list-group-item">
                  <strong>Root cause analysis:</strong> Identificación de causas profundas
                </li>
              </ul>

              <h6 class="text-secondary">Evaluación de resultados</h6>
              <ul class="list-group mb-3">
                <li class="list-group-item">
                  <strong>Cumplimiento de objetivos:</strong> Logro de metas establecidas
                </li>
                <li class="list-group-item">
                  <strong>Efectividad del SGC:</strong> Contribución a resultados deseados
                </li>
                <li class="list-group-item">
                  <strong>Oportunidades de mejora:</strong> Áreas que necesitan atención
                </li>
                <li class="list-group-item">
                  <strong>Necesidad de acciones:</strong> Decisiones basadas en datos
                </li>
              </ul>

              <h5 class="mt-3">Toma de decisiones</h5>
              <div class="alert alert-success">
                <ul class="mb-0">
                  <li><strong>Basada en evidencia:</strong> Decisiones apoyadas por datos</li>
                  <li><strong>Oportuna:</strong> En el momento adecuado para máximo impacto</li>
                  <li><strong>Documentada:</strong> Registro de decisiones y rationale</li>
                  <li><strong>Comunicada:</strong> A las partes relevantes para implementación</li>
                </ul>
              </div>

              <h5 class="mt-3">Mejora continua</h5>
              <ul class="list-group">
                <li class="list-group-item">
                  <strong>Feedback loop:</strong> Aprendizaje de resultados de medición
                </li>
                <li class="list-group-item">
                  <strong>Ajuste de objetivos:</strong> Basado en desempeño y cambios
                </li>
                <li class="list-group-item">
                  <strong>Optimización de métodos:</strong> Mejora de técnicas de medición
                </li>
                <li class="list-group-item">
                  <strong>Innovación:</strong> Nuevos approaches para monitoreo y análisis
                </li>
              </ul>
            </div>
            `,
            17
          ]
        ];
      
      plantillasData.forEach((item) => stmt.run(...item));
      stmt.finalize();
    }
  });
});

module.exports = db;
