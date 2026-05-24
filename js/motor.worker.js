import { MotorCombinaciones } from './motor-combinaciones.js';

self.onmessage = (e) => {
  const { type, payload } = e.data;

  try {
    if (type === 'GENERATE') {
      const { asignaturas, maxCombinaciones } = payload;
      
      // Sincronizar el estado en la instancia local del Worker
      MotorCombinaciones.asignaturasSeleccionadas = asignaturas;
      MotorCombinaciones.maxCombinaciones = maxCombinaciones;
      
      // Ejecutar la operación pesada
      const resultado = MotorCombinaciones.generarCombinaciones();
      
      self.postMessage({ type: 'GENERATE_RESULT', payload: resultado });
    } 
    else if (type === 'DISCARD') {
      const { index } = payload;
      const success = MotorCombinaciones.descartarCombinacion(index);
      
      self.postMessage({ 
        type: 'DISCARD_RESULT', 
        payload: { 
          success, 
          combinaciones: MotorCombinaciones.combinaciones 
        } 
      });
    }
    else if (type === 'REGENERATE') {
      const resultado = MotorCombinaciones.regenerarCombinaciones();
      self.postMessage({ type: 'REGENERATE_RESULT', payload: resultado });
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', payload: error.message });
  }
};
