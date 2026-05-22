// Importa Express
const express = require("express");

// Crea un router para manejar rutas
const router = express.Router();

// Importa la función que analiza fuerzas
const { analizarSistema } = require("../physics");

// Ruta POST para analizar el sistema
router.post("/", (req, res) => {

  // Ejecuta el análisis usando las fuerzas enviadas
  const resultado = analizarSistema(req.body.fuerzas);

  // Devuelve el resultado en formato JSON
  res.json(resultado);
});

// Exporta las rutas
module.exports = router;