import { describe, expect, it } from 'vitest';
import { validateIndexSchema, validateProgramSchema } from '../js/schema-validator.js';

const validIndex = {
  semestres: [{ periodo: '2026-1', label: '2026 - Semestre 1', programas: [{ id: 'sistemas', nombre: 'Sistemas', archivo: 'sistemas.json' }] }]
};

const validProgram = {
  metadata: { totalAsignaturas: 1 },
  semestres: [{ asignaturas: [{ id: 'MAT1', nombre: 'Matemáticas', creditos: 3, grupos: [{ grupo: 'A1', horarios: [{ dia: 'L', inicio: '07:00', fin: '08:40', jornada: 'diurna' }] }] }] }]
};

describe('Validadores de ofertas académicas', () => {
  it('acepta un índice y una oferta con estructura válida', () => {
    expect(validateIndexSchema(validIndex)).toBe(true);
    expect(validateProgramSchema(validProgram)).toBe(true);
  });

  it('rechaza un índice sin semestres', () => {
    const result = validateIndexSchema({ periodos: [] });
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain('semestres');
  });

  it('rechaza una oferta con grupos sin horarios', () => {
    const result = validateProgramSchema({ semestres: [{ asignaturas: [{ id: 'MAT1', nombre: 'Matemáticas', grupos: [{ grupo: 'A1' }] }] }] });
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain('horarios');
  });

  it('acepta null en campos opcionales de una oferta', () => {
    const offerWithOptionalNulls = {
      metadata: { totalAsignaturas: 1 },
      semestres: [{
        asignaturas: [{
          id: 'CATEDRA',
          nombre: 'Cátedra Institucional',
          creditos: null,
          codigo: null,
          grupos: [{
            id: 'CATEDRA_NA',
            grupo: null,
            profesor: null,
            ubicacion: null,
            cupos: null,
            horarios: [{ dia: 'W', inicio: '10:20', fin: '11:10', jornada: 'diurna' }]
          }]
        }]
      }]
    };

    expect(validateProgramSchema(offerWithOptionalNulls)).toBe(true);
  });
});