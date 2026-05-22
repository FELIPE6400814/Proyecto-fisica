// Calcula el momento (torque)
// Formula: momento = fuerza * distancia
function calcularMomento(fuerza, distancia) {
  return fuerza * distancia;
}

// Analiza todas las fuerzas del sistema
function analizarSistema(fuerzas) {

  // Variable que almacena la suma total de momentos
  let momentoTotal = 0;

  // Recorre todas las fuerzas enviadas
  const resultados = fuerzas.map((f) => {

    // Calcula el momento individual
    const momento = calcularMomento(f.fuerza, f.distancia);

    // Determina el signo según el sentido de rotación
    // Horario = negativo
    // Antihorario = positivo
    const signo = f.sentido === "horario" ? -1 : 1;

    // Suma el momento al total
    momentoTotal += momento * signo;

    // Retorna la fuerza con su momento calculado
    return {
      ...f,
      momento: momento * signo
    };
  });

  // Devuelve el análisis completo
  return {

    // Verifica si existe equilibrio
    equilibrio: momentoTotal === 0,

    // Momento total del sistema
    momentoTotal,

    // Determina el sentido de rotación
    rotacion:
      momentoTotal > 0
        ? "antihorario"
        : momentoTotal < 0
        ? "horario"
        : "sin rotacion",

    // Lista de fuerzas analizadas
    fuerzas: resultados
  };
}

// Exporta las funciones
module.exports = {
  calcularMomento,
  analizarSistema
};