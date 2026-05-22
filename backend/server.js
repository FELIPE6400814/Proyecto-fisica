// Importa la librería Express
const express = require("express");

// Crea la aplicación servidor
const app = express();

// Importa las rutas de análisis
const analysisRoutes = require("./routes/analysis");

// Permite recibir datos en formato JSON
app.use(express.json());

// Ruta principal del servidor
app.get("/", (req, res) => {
  res.send("Servidor funcionando");
});

// Ruta para análisis físico
app.use("/analysis", analysisRoutes);

// Inicia el servidor en el puerto 3000
app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});