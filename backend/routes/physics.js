/**
 * physics.js — Rutas de cálculo físico
 *
 * Este módulo define los endpoints de la API para calcular torque
 * y condiciones de equilibrio en sistemas de palancas/vigas.
 *
 * Conceptos físicos aplicados:
 *   - Torque (momento de fuerza): τ = F × sin(θ) × d
 *       τ   = torque resultante (N·m)
 *       F   = magnitud de la fuerza aplicada (N)
 *       θ   = ángulo de la fuerza respecto a la horizontal (grados)
 *       d   = brazo de momento = distancia con signo desde el pivote (m)
 *
 *   - Convenio de signos:
 *       τ > 0  →  rotación antihoraria
 *       τ < 0  →  rotación horaria
 *       τ = 0  →  equilibrio estático (Σ τ = 0)
 *
 * Endpoints:
 *   POST /api/physics/torque       → calcula torques y estado del sistema
 *   POST /api/physics/equilibrium  → calcula la fuerza necesaria para equilibrar
 */

const express = require("express");
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/physics/torque
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Recibe una viga con su pivote y un conjunto de fuerzas aplicadas.
 * Para cada fuerza calcula su torque individual y luego suma todos
 * para determinar si el sistema está en equilibrio o en rotación.
 *
 * @body {number}   pivot       - Posición del pivote sobre la viga (m)
 * @body {number}   beamLength  - Longitud total de la viga (m), default 10
 * @body {Array}    forces      - Lista de fuerzas aplicadas:
 *   @body {number} forces[].position  - Posición de la fuerza en la viga (m)
 *   @body {number} forces[].magnitude - Magnitud de la fuerza (N)
 *   @body {number} forces[].angle     - Ángulo respecto a la horizontal (°), default 90
 *
 * @returns {Object} Resultado del análisis:
 *   - forces[]        : detalle de cada fuerza (brazo, componente ⊥, torque, dirección)
 *   - totalTorque     : suma algebraica de todos los torques (N·m)
 *   - isEquilibrium   : true si |Σ τ| < 0.001 N·m
 *   - status          : "ESTÁTICO" o "DINÁMICO"
 *   - rotationDirection: "horario" | "antihorario" | null
 */
router.post("/torque", (req, res) => {
  const { pivot, forces, beamLength } = req.body;

  // Validación de entrada: pivot y al menos una fuerza son obligatorios
  if (pivot === undefined || !Array.isArray(forces) || forces.length === 0) {
    return res.status(400).json({
      error: "Datos inválidos. Se requiere pivot y al menos una fuerza.",
    });
  }

  let totalTorque = 0; // Σ τ acumulado
  const results = [];  // Resultados individuales por fuerza

  for (const force of forces) {
    // Desestructuramos cada fuerza; ángulo por defecto 90° (fuerza perpendicular)
    const { position, magnitude, angle = 90 } = force;

    if (position === undefined || magnitude === undefined) {
      return res.status(400).json({
        error: "Cada fuerza debe tener position y magnitude.",
      });
    }

    // ── Paso 1: Brazo de momento ──────────────────────────────────────
    // Es la distancia con signo desde el pivote hasta el punto de aplicación.
    // Positivo → fuerza a la derecha del pivote
    // Negativo → fuerza a la izquierda del pivote
    const leverArm = position - pivot;

    // ── Paso 2: Componente perpendicular de la fuerza ─────────────────
    // Solo la componente perpendicular a la viga genera torque.
    // F_perp = F × sin(θ)
    const angleRad = (angle * Math.PI) / 180; // conversión a radianes
    const perpendicularForce = magnitude * Math.sin(angleRad);

    // ── Paso 3: Torque individual ─────────────────────────────────────
    // τ = F_perp × d
    // El signo resultante determina la dirección de rotación.
    const torque = perpendicularForce * leverArm;

    // Acumulamos en el torque total del sistema
    totalTorque += torque;

    // Guardamos el detalle completo de esta fuerza
    results.push({
      position,
      magnitude,
      angle,
      leverArm: parseFloat(leverArm.toFixed(4)),
      perpendicularForce: parseFloat(perpendicularForce.toFixed(4)),
      torque: parseFloat(torque.toFixed(4)),
      // Clasificación por dirección de rotación
      direction: torque > 0 ? "antihorario" : torque < 0 ? "horario" : "neutro",
    });
  }

  // ── Paso 4: Condición de equilibrio ──────────────────────────────────
  // Se considera equilibrio cuando la suma de torques es prácticamente 0.
  // Se usa un umbral de 0.001 N·m para tolerar errores de punto flotante.
  const isEquilibrium = Math.abs(totalTorque) < 0.001;

  res.json({
    pivot,
    beamLength: beamLength || 10,
    forces: results,
    totalTorque: parseFloat(totalTorque.toFixed(4)),
    isEquilibrium,
    status: isEquilibrium ? "ESTÁTICO (equilibrio)" : "DINÁMICO (hay rotación)",
    // Solo indica dirección si hay rotación neta
    rotationDirection: !isEquilibrium
      ? totalTorque > 0
        ? "antihorario"
        : "horario"
      : null,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/physics/equilibrium
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Dado un sistema con fuerzas conocidas, calcula qué fuerza adicional
 * se debe aplicar en una posición dada para que Σ τ = 0.
 *
 * Derivación:
 *   Σ τ_conocidos + F_x × d_x = 0
 *   ∴  F_x = −Σ τ_conocidos / d_x
 *
 * @body {number} pivot           - Posición del pivote (m)
 * @body {Array}  forces          - Fuerzas conocidas (mismo formato que /torque)
 * @body {number} unknownPosition - Posición donde se aplicará la fuerza desconocida (m)
 *
 * @returns {Object}
 *   - requiredForce   : magnitud con signo de la fuerza necesaria (N)
 *   - direction       : "↑ hacia arriba" o "↓ hacia abajo"
 *   - message         : descripción en texto legible
 */
router.post("/equilibrium", (req, res) => {
  const { pivot, forces, unknownPosition } = req.body;

  if (pivot === undefined || !Array.isArray(forces) || unknownPosition === undefined) {
    return res.status(400).json({
      error: "Se requiere pivot, forces y unknownPosition.",
    });
  }

  // ── Paso 1: Calcular Σ τ de las fuerzas conocidas ─────────────────
  let knownTorque = 0;

  for (const force of forces) {
    const { position, magnitude, angle = 90 } = force;
    const leverArm = position - pivot;
    const angleRad = (angle * Math.PI) / 180;
    const perpendicularForce = magnitude * Math.sin(angleRad);
    knownTorque += perpendicularForce * leverArm;
  }

  // ── Paso 2: Brazo de la fuerza desconocida ────────────────────────
  const unknownLeverArm = unknownPosition - pivot;

  // Si la fuerza desconocida está sobre el pivote, su brazo es 0
  // y no puede generar torque → es imposible equilibrar desde ahí.
  if (Math.abs(unknownLeverArm) < 0.001) {
    return res.status(400).json({
      error: "La fuerza desconocida no puede estar en el pivote (brazo de palanca = 0).",
    });
  }

  // ── Paso 3: Despejar la fuerza necesaria ─────────────────────────
  // De: Σ τ_conocidos + F_x × d_x = 0
  // Despejamos: F_x = −Σ τ_conocidos / d_x
  const requiredForce = -knownTorque / unknownLeverArm;

  res.json({
    pivot,
    unknownPosition,
    unknownLeverArm: parseFloat(unknownLeverArm.toFixed(4)),
    knownTorque: parseFloat(knownTorque.toFixed(4)),
    requiredForce: parseFloat(requiredForce.toFixed(4)),
    // Signo positivo = fuerza hacia arriba (convención eje Y positivo ↑)
    direction: requiredForce > 0 ? "↑ hacia arriba" : "↓ hacia abajo",
    message: `Para equilibrio, aplica ${Math.abs(requiredForce).toFixed(2)} N ${
      requiredForce > 0 ? "hacia arriba" : "hacia abajo"
    } en la posición ${unknownPosition} m`,
  });
});

module.exports = router;