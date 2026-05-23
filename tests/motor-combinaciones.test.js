import { describe, it, expect, beforeEach } from 'vitest';
import { MotorCombinaciones } from '../js/motor-combinaciones.js';

describe('Motor de Combinaciones - Gestión de Asignaturas', () => {
  beforeEach(() => {
    MotorCombinaciones.limpiarAsignaturas();
  });

  it('debería agregar una asignatura correctamente', () => {
    const asignatura = { id: 'a1', nombre: 'Matemáticas', grupos: [] };
    const resultado = MotorCombinaciones.agregarAsignatura(asignatura);
    
    expect(resultado).toBe(true);
    expect(MotorCombinaciones.asignaturasSeleccionadas.length).toBe(1);
    expect(MotorCombinaciones.asignaturasSeleccionadas[0].id).toBe('a1');
  });

  it('no debería permitir agregar la misma asignatura dos veces', () => {
    const asignatura = { id: 'a1', nombre: 'Matemáticas', grupos: [] };
    MotorCombinaciones.agregarAsignatura(asignatura);
    const resultadoDuplicado = MotorCombinaciones.agregarAsignatura(asignatura);
    
    expect(resultadoDuplicado).toBe(false);
    expect(MotorCombinaciones.asignaturasSeleccionadas.length).toBe(1);
  });

  it('debería respetar el límite máximo de asignaturas (7)', () => {
    for (let i = 1; i <= 7; i++) {
      MotorCombinaciones.agregarAsignatura({ id: `a${i}`, nombre: `Materia ${i}`, grupos: [] });
    }
    
    const extra = { id: 'a8', nombre: 'Materia Extra', grupos: [] };
    const resultadoExtra = MotorCombinaciones.agregarAsignatura(extra);
    
    expect(resultadoExtra).toBe('limite');
    expect(MotorCombinaciones.asignaturasSeleccionadas.length).toBe(7);
  });
});

describe('Motor de Combinaciones - Detección de Conflictos', () => {
  it('debería detectar solapamiento de horas (12:00-14:00 choca con 13:00-15:00)', () => {
    // horasSeSolapan(inicio1, fin1, inicio2, fin2)
    const choca = MotorCombinaciones.horasSeSolapan('12:00', '14:00', '13:00', '15:00');
    expect(choca).toBe(true);
  });

  it('no debería detectar solapamiento si terminan y empiezan en el mismo minuto', () => {
    const choca = MotorCombinaciones.horasSeSolapan('12:00', '14:00', '14:00', '16:00');
    expect(choca).toBe(false); // Minutos no se solapan, límite exacto
  });

  it('debería detectar conflicto entre dos grupos con el mismo día y horas solapadas', () => {
    const grupo1 = {
      horarios: [{ dia: 1, inicio: '08:00', fin: '10:00', jornada: 'diurna' }]
    };
    const grupo2 = {
      horarios: [{ dia: 1, inicio: '09:00', fin: '11:00', jornada: 'diurna' }]
    };
    
    const conflicto = MotorCombinaciones.hayConflictoEntreGrupos(grupo1, grupo2);
    expect(conflicto).toBe(true);
  });

  it('NO debería detectar conflicto en días diferentes', () => {
    const grupo1 = {
      horarios: [{ dia: 1, inicio: '08:00', fin: '10:00', jornada: 'diurna' }]
    };
    const grupo2 = {
      horarios: [{ dia: 2, inicio: '08:00', fin: '10:00', jornada: 'diurna' }]
    };
    
    const conflicto = MotorCombinaciones.hayConflictoEntreGrupos(grupo1, grupo2);
    expect(conflicto).toBe(false);
  });
});

describe('Motor de Combinaciones - Generación', () => {
  beforeEach(() => {
    MotorCombinaciones.limpiarAsignaturas();
    MotorCombinaciones.setMaxCombinaciones(5);
  });

  it('debería generar múltiples combinaciones válidas', () => {
    const asig1 = {
      id: 'a1', nombre: 'Física',
      grupos: [
        { id: 'g1', nombre: 'Grupo 1', horarios: [{ dia: 1, inicio: '08:00', fin: '10:00', jornada: 'diurna' }] },
        { id: 'g2', nombre: 'Grupo 2', horarios: [{ dia: 1, inicio: '10:00', fin: '12:00', jornada: 'diurna' }] }
      ]
    };
    const asig2 = {
      id: 'a2', nombre: 'Química',
      grupos: [
        { id: 'g3', nombre: 'Grupo 1', horarios: [{ dia: 2, inicio: '08:00', fin: '10:00', jornada: 'diurna' }] }
      ]
    };

    MotorCombinaciones.agregarAsignatura(asig1);
    MotorCombinaciones.agregarAsignatura(asig2);

    const resultado = MotorCombinaciones.generarCombinaciones();
    
    expect(resultado.exito).toBe(true);
    expect(resultado.totalValidas).toBe(2);
    expect(MotorCombinaciones.combinaciones.length).toBe(2);
  });

  it('debería descartar combinaciones con conflictos', () => {
    const asig1 = {
      id: 'a1', nombre: 'Física',
      grupos: [
        { id: 'g1', horarios: [{ dia: 1, inicio: '08:00', fin: '10:00', jornada: 'diurna' }] }
      ]
    };
    const asig2 = {
      id: 'a2', nombre: 'Química',
      grupos: [
        { id: 'g2', horarios: [{ dia: 1, inicio: '09:00', fin: '11:00', jornada: 'diurna' }] }, // CHOCA
        { id: 'g3', horarios: [{ dia: 2, inicio: '08:00', fin: '10:00', jornada: 'diurna' }] }  // VALIDO
      ]
    };

    MotorCombinaciones.agregarAsignatura(asig1);
    MotorCombinaciones.agregarAsignatura(asig2);

    const resultado = MotorCombinaciones.generarCombinaciones();
    
    expect(resultado.exito).toBe(true);
    expect(resultado.totalGeneradas).toBe(2);
    expect(resultado.totalValidas).toBe(1); // Solo la combinación g1+g3 es válida
  });
});
