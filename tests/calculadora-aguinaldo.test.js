import { describe, it, expect, vi } from 'vitest';

// Mockear main.js y dom-renderer.js para evitar errores de DOM (querySelector en null)
vi.mock('../js/main.js', () => ({}));
vi.mock('../js/dom-renderer.js', () => ({}));

import { isHoliday, isHolyWeek } from '../js/calculadora-aguinaldo.js';

describe('Calculadora Aguinaldo - Festivos', () => {
  it('debería identificar el 1 de mayo (Día del Trabajo) como festivo', () => {
    // 1 de mayo de 2026
    const date = new Date(2026, 4, 1);
    expect(isHoliday(date)).toBe(true);
  });

  it('debería identificar el 1 de enero como festivo', () => {
    const date = new Date(2026, 0, 1);
    expect(isHoliday(date)).toBe(true);
  });

  it('debería identificar un día normal como NO festivo', () => {
    // 15 de febrero de 2026 no es festivo
    const date = new Date(2026, 1, 15);
    expect(isHoliday(date)).toBe(false);
  });
});

describe('Calculadora Aguinaldo - Semana Santa', () => {
  it('debería identificar días de Semana Santa correctamente (2026)', () => {
    // Pascua en 2026 es el 5 de abril
    // Jueves Santo: 2 de abril
    // Viernes Santo: 3 de abril
    const juevesSanto = new Date(2026, 3, 2);
    const viernesSanto = new Date(2026, 3, 3);
    const lunesDespues = new Date(2026, 3, 6);

    expect(isHolyWeek(juevesSanto)).toBe(true);
    expect(isHolyWeek(viernesSanto)).toBe(true);
    expect(isHolyWeek(lunesDespues)).toBe(false);
  });
});
