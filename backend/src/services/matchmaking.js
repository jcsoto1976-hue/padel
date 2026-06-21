'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PADEL CLUB — Algoritmo de Emparejamientos Dobles
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * generar_emparejamientos_dobles(jugadores, num_canchas, historico_jornada)
 *
 * Genera rondas de partidos de dobles (2 vs 2) intentando:
 *   1. No repetir compañeros (pareja A+B ya jugó junta)
 *   2. No repetir rivales (A se enfrentó a C/D ya)
 *   3. Distribución equitativa en canchas
 *
 * @param {string[]} jugadores          - Array de IDs de jugadores (8-20, múltiplo de 4)
 * @param {number}   num_canchas        - Canchas disponibles (2-5)
 * @param {object}   historico_jornada  - { parejas: Set<string>, rivales: Set<string> }
 *                                        (histórico de la jornada actual o global si track_global)
 * @returns {{ rondas: Ronda[], advertencias: string[], resumen: object }}
 *
 * Ronda   = { numero: number, partidos: Partido[] }
 * Partido = { cancha: number, equipoA: [id, id], equipoB: [id, id] }
 */

/**
 * Clave normalizada para un par (orden independiente)
 */
function pairKey(a, b) {
  return [a, b].sort().join('|');
}

/**
 * Verifica si una pareja ya ha jugado junta (en histórico)
 */
function parejasRepetida(a, b, usedPairs) {
  return usedPairs.has(pairKey(a, b));
}

/**
 * Verifica si dos jugadores ya se han enfrentado (en histórico)
 */
function rivalRepetido(a, b, usedRivals) {
  return usedRivals.has(pairKey(a, b));
}

/**
 * Dada una lista de jugadores disponibles y el histórico,
 * intenta construir un partido válido (equipoA vs equipoB).
 * Devuelve el partido o null si no es posible sin repetir.
 */
function intentarPartido(disponibles, usedPairs, usedRivals, permitirRepeticion = false, genderMap = {}, esMixto = false) {
  const n = disponibles.length;
  if (n < 4) return null;

  // Intentamos todas las combinaciones posibles de 4 jugadores → 3 partidos posibles por conjunto
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          const cuatro = [disponibles[i], disponibles[j], disponibles[k], disponibles[l]];
          // 3 formas de partir 4 jugadores en 2 parejas:
          const particiones = [
            { a: [cuatro[0], cuatro[1]], b: [cuatro[2], cuatro[3]] },
            { a: [cuatro[0], cuatro[2]], b: [cuatro[1], cuatro[3]] },
            { a: [cuatro[0], cuatro[3]], b: [cuatro[1], cuatro[2]] },
          ];

          for (const p of particiones) {
            const [a1, a2] = p.a;
            const [b1, b2] = p.b;

            if (esMixto && genderMap) {
              if (genderMap[a1] === genderMap[a2] || genderMap[b1] === genderMap[b2]) {
                continue;
              }
            }

            const parejasOk = !parejasRepetida(a1, a2, usedPairs) && !parejasRepetida(b1, b2, usedPairs);
            const rivalA1 = !rivalRepetido(a1, b1, usedRivals) && !rivalRepetido(a1, b2, usedRivals);
            const rivalA2 = !rivalRepetido(a2, b1, usedRivals) && !rivalRepetido(a2, b2, usedRivals);

            if (parejasOk && rivalA1 && rivalA2) {
              return { equipoA: p.a, equipoB: p.b, repeticion: false };
            }
          }
        }
      }
    }
  }

  // Si no encontramos sin repetir, intentamos con mínimas repeticiones (si permitido)
  if (permitirRepeticion && n >= 4) {
    let mejorPartido = null;
    let menorRepeticiones = Infinity;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          for (let l = k + 1; l < n; l++) {
            const cuatro = [disponibles[i], disponibles[j], disponibles[k], disponibles[l]];
            const particiones = [
              { a: [cuatro[0], cuatro[1]], b: [cuatro[2], cuatro[3]] },
              { a: [cuatro[0], cuatro[2]], b: [cuatro[1], cuatro[3]] },
              { a: [cuatro[0], cuatro[3]], b: [cuatro[1], cuatro[2]] },
            ];

            for (const p of particiones) {
              const [a1, a2] = p.a;
              const [b1, b2] = p.b;

              if (esMixto && genderMap) {
                if (genderMap[a1] === genderMap[a2] || genderMap[b1] === genderMap[b2]) {
                  continue;
                }
              }

              let rep = 0;
              if (parejasRepetida(a1, a2, usedPairs)) rep++;
              if (parejasRepetida(b1, b2, usedPairs)) rep++;
              if (rivalRepetido(a1, b1, usedRivals)) rep++;
              if (rivalRepetido(a1, b2, usedRivals)) rep++;
              if (rivalRepetido(a2, b1, usedRivals)) rep++;
              if (rivalRepetido(a2, b2, usedRivals)) rep++;

              if (rep < menorRepeticiones) {
                menorRepeticiones = rep;
                mejorPartido = { equipoA: p.a, equipoB: p.b, repeticion: true, repeticiones: rep };
              }
            }
          }
        }
      }
    }
    return mejorPartido;
  }

  return null;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FUNCIÓN PRINCIPAL
 * ─────────────────────────────────────────────────────────────────────────────
 */
function generar_emparejamientos_dobles(jugadores, num_canchas, historico_jornada = {}, genderMap = {}, esMixto = false) {
  if (!jugadores || jugadores.length < 8) {
    throw new Error('Se necesitan mínimo 8 jugadores');
  }
  if (jugadores.length % 4 !== 0) {
    throw new Error('El número de jugadores debe ser múltiplo de 4');
  }
  if (num_canchas < 2 || num_canchas > 5) {
    throw new Error('El número de canchas debe estar entre 2 y 5');
  }

  const n = jugadores.length;
  const canchasEfectivas = Math.min(num_canchas, Math.floor(n / 4));

  // Histórico acumulado de la jornada
  const usedPairs = new Set(historico_jornada.parejas || []);
  const usedRivals = new Set(historico_jornada.rivales || []);

  // Contadores de partidos jugados por jugador en esta generación
  const partidosJugados = {};
  jugadores.forEach(j => { partidosJugados[j] = 0; });

  const rondas = [];
  const advertencias = [];
  let rondaNum = 1;

  // Máximo de rondas razonables = jugadores - 1 (round robin teórico)
  const maxRondas = n - 1;

  while (rondaNum <= maxRondas) {
    // Ordenar jugadores por menos partidos jugados (balanceo)
    const disponibles = [...jugadores].sort((a, b) => partidosJugados[a] - partidosJugados[b]);

    const partidosRonda = [];
    const usadosEnRonda = new Set();

    // Pares/rivales usados en esta ronda (se añaden al global al final)
    const paresRonda = new Set();
    const rivalRonda = new Set();

    for (let c = 1; c <= canchasEfectivas; c++) {
      const libres = disponibles.filter(j => !usadosEnRonda.has(j));
      if (libres.length < 4) break;

      // Combinamos histórico global + de esta ronda
      const paresCombi = new Set([...usedPairs, ...paresRonda]);
      const rivalesCombi = new Set([...usedRivals, ...rivalRonda]);

      const partido = intentarPartido(libres, paresCombi, rivalesCombi, false, genderMap, esMixto)
        || intentarPartido(libres, paresCombi, rivalesCombi, true, genderMap, esMixto);

      if (!partido) break;

      const { equipoA, equipoB, repeticion, repeticiones } = partido;

      if (repeticion) {
        advertencias.push(
          `⚠️ Ronda ${rondaNum}, Cancha ${c}: repetición inevitable (${repeticiones} conflicto/s). Parejas: [${equipoA.join(',')}] vs [${equipoB.join(',')}]`
        );
      }

      partidosRonda.push({ cancha: c, equipoA, equipoB });

      // Marcar jugadores como usados en esta ronda
      [equipoA[0], equipoA[1], equipoB[0], equipoB[1]].forEach(j => {
        usadosEnRonda.add(j);
        partidosJugados[j]++;
      });

      // Acumular parejas y rivales de esta ronda
      paresRonda.add(pairKey(equipoA[0], equipoA[1]));
      paresRonda.add(pairKey(equipoB[0], equipoB[1]));
      rivalRonda.add(pairKey(equipoA[0], equipoB[0]));
      rivalRonda.add(pairKey(equipoA[0], equipoB[1]));
      rivalRonda.add(pairKey(equipoA[1], equipoB[0]));
      rivalRonda.add(pairKey(equipoA[1], equipoB[1]));
    }

    if (partidosRonda.length === 0) break;

    // Añadir pares/rivales al histórico global
    paresRonda.forEach(p => usedPairs.add(p));
    rivalRonda.forEach(r => usedRivals.add(r));

    rondas.push({ numero: rondaNum, partidos: partidosRonda });
    rondaNum++;

    // Condición de parada: ya no quedan combinaciones nuevas posibles
    // Verificamos si todos los pares posibles están cubiertos
    const totalPosibles = (n * (n - 1)) / 2;
    if (usedPairs.size >= totalPosibles) break;
  }

  // Resumen estadístico
  const resumen = {
    total_jugadores: n,
    num_canchas: canchasEfectivas,
    total_rondas: rondas.length,
    total_partidos: rondas.reduce((acc, r) => acc + r.partidos.length, 0),
    partidos_por_jugador: partidosJugados,
    parejas_unicas_generadas: usedPairs.size - (historico_jornada.parejas || []).length,
    rivales_unicos_generados: usedRivals.size - (historico_jornada.rivales || []).length,
    advertencias: advertencias.length,
  };

  return { rondas, advertencias, resumen };
}

// ─── Ejemplos de salida (para documentación y tests) ──────────────────────────

function ejemplosAlgoritmo() {
  const casos = [
    { desc: '2 canchas / 8 jugadores', jugadores: 8, canchas: 2 },
    { desc: '3 canchas / 12 jugadores', jugadores: 12, canchas: 3 },
    { desc: '4 canchas / 16 jugadores', jugadores: 16, canchas: 4 },
    { desc: '5 canchas / 20 jugadores', jugadores: 20, canchas: 5 },
  ];

  return casos.map(({ desc, jugadores: n, canchas }) => {
    const ids = Array.from({ length: n }, (_, i) => `J${i + 1}`);
    const resultado = generar_emparejamientos_dobles(ids, canchas, {});
    return { descripcion: desc, ...resultado };
  });
}

/**
 * Genera rondas para un Americano de Parejas Fijas (Round Robin por parejas)
 * agrupando partidos concurrentemente en las canchas disponibles, sin repetir rivales.
 */
function generar_emparejamientos_fijos(parejas, num_canchas) {
  const n = parejas.length;
  const p = [...parejas];
  if (n % 2 !== 0) p.push('BYE');
  
  const numPares = p.length;
  const rondasTotales = numPares - 1;
  const partidosPorRonda = numPares / 2;
  
  const rondas = [];
  
  for (let i = 0; i < rondasTotales; i++) {
    const partidos = [];
    let canchaAsignada = 1;
    
    for (let j = 0; j < partidosPorRonda; j++) {
      if (canchaAsignada > num_canchas) break;
      
      const a = p[j];
      const b = p[numPares - 1 - j];
      
      if (a !== 'BYE' && b !== 'BYE') {
        partidos.push({
          cancha: canchaAsignada++,
          pairA: a,
          pairB: b
        });
      }
    }
    
    if (partidos.length > 0) {
      rondas.push({ numero: i + 1, partidos });
    }
    
    // Rotar array (mantener p[0] fijo, rotar el resto a la derecha)
    p.splice(1, 0, p.pop());
  }
  
  return rondas;
}

module.exports = { generar_emparejamientos_dobles, generar_emparejamientos_fijos, ejemplosAlgoritmo, pairKey };
