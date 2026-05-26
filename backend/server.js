/**
 * server.js — Punto de entrada del servidor Express
 *
 * Responsabilidades:
 *   1. Configurar middleware global (CORS, JSON parser)
 *   2. Servir el frontend estático desde /frontend
 *   3. Montar las rutas de la API en /api/physics
 *   4. Manejar errores no capturados
 *   5. Iniciar el servidor en el puerto configurado
 */

const express = require("express");
const cors    = require("cors");    // Permite peticiones desde otros orígenes (ej: frontend en otro puerto)
const path    = require("path");    // Manejo seguro de rutas del sistema de archivos
const physicsRoutes = require("./routes/physics"); // Rutas de cálculo físico

const app  = express();
const PORT = process.env.PORT || 3000; // Puerto configurable por variable de entorno

// ─── Middleware global ────────────────────────────────────────────────────────

// Habilita CORS para todas las rutas.
// Útil durante desarrollo si el frontend corre en un puerto distinto al backend.
app.use(cors());

// Permite leer el cuerpo de las peticiones como JSON.
// Sin esto, req.body estaría vacío en los POST.
app.use(express.json());

// ─── Archivos estáticos ───────────────────────────────────────────────────────

// Sirve el contenido de /frontend de forma estática.
// Así, al abrir http://localhost:3000 el navegador carga directamente el HTML.
// __dirname apunta a /backend, por eso subimos un nivel con "../frontend".
app.use(express.static(path.join(__dirname, "../frontend")));

// ─── Rutas de la API ──────────────────────────────────────────────────────────

// Todas las rutas definidas en physics.js quedan bajo el prefijo /api/physics.
// Ejemplo: router.post("/torque") se convierte en POST /api/physics/torque
app.use("/api/physics", physicsRoutes);

// ─── Ruta raíz ────────────────────────────────────────────────────────────────

// Respaldo explícito: si alguien accede a "/" y el middleware estático
// no encontró el archivo, enviamos index.html manualmente.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ─── Manejo de errores global ─────────────────────────────────────────────────

// Middleware especial de Express para errores (4 parámetros obligatorios).
// Captura cualquier error que se propague con next(err) desde otras rutas.
app.use((err, req, res, next) => {
  console.error(err.stack); // Imprime el stack trace en consola para depuración
  res.status(500).json({ error: "Error interno del servidor." });
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🔬 Servidor de Física Mecánica corriendo en http://localhost:${PORT}`);
  console.log(`   API disponible en http://localhost:${PORT}/api/physics\n`);
});