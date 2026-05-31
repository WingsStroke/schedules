import { MotorCombinaciones } from './motor-combinaciones.js';

self.onmessage = (e) => {
  const { type, payload } = e.data;

  try {
    if (type === 'GENERATE') {
      const { asignaturas, maxCombinaciones } = payload;
      
      MotorCombinaciones.asignaturasSeleccionadas = asignaturas;
      MotorCombinaciones.maxCombinaciones = maxCombinaciones;
      
      const resultado = MotorCombinaciones.generarCombinaciones();
      resultado.todasLasCombinaciones = MotorCombinaciones.todasLasCombinaciones;
      resultado.combinacionesDescartadas = MotorCombinaciones.combinacionesDescartadas;
      
      self.postMessage({ type: 'GENERATE_RESULT', payload: resultado });
    } 
    else if (type === 'DISCARD') {
      const { index } = payload;
      const success = MotorCombinaciones.descartarCombinacion(index);
      
      self.postMessage({ 
        type: 'DISCARD_RESULT', 
        payload: { 
          success, 
          combinaciones: MotorCombinaciones.combinaciones,
          todasLasCombinaciones: MotorCombinaciones.todasLasCombinaciones,
          combinacionesDescartadas: MotorCombinaciones.combinacionesDescartadas
        } 
      });
    }
    else if (type === 'REGENERATE') {
      const resultado = MotorCombinaciones.regenerarCombinaciones();
      resultado.todasLasCombinaciones = MotorCombinaciones.todasLasCombinaciones;
      resultado.combinacionesDescartadas = MotorCombinaciones.combinacionesDescartadas;
      self.postMessage({ type: 'REGENERATE_RESULT', payload: resultado });
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', payload: error.message });
  }
};
