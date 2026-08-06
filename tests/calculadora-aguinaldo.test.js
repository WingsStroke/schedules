import { describe, it, expect, vi } from 'vitest';

// Mockear main.js y dom-renderer.js para evitar errores de DOM (querySelector en null)
vi.mock('../js/main.js', () => ({}));
vi.mock('../js/dom-renderer.js', () => ({}));

import { isHoliday, isHolyWeek, calculateMonthlyCost } from '../js/calculadora-aguinaldo.js';
import { normalizeSubjectsForCalculation } from '../js/state-manager.js';

function buildExcludedDaysSetExceptDate(year, month, includedDateString) {
  const excludedDaysSet = new Set();
  const date = new Date(year, month, 1);

  while (date.getMonth() === month) {
    const dayIndex = date.getDay() - 1;
    if (dayIndex >= 0 && dayIndex <= 5) {
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (dateString !== includedDateString) excludedDaysSet.add(dateString);
    }
    date.setDate(date.getDate() + 1);
  }

  return excludedDaysSet;
}

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

describe('Calculadora Aguinaldo - Huecos y viajes por jornada', () => {
  const baseConfig = {
    minGapMinutes: 60,
    transportCost: 0,
    snackCost: 0,
    year: 2026,
    month: 1
  };

  const onlyOneMondaySet = buildExcludedDaysSetExceptDate(2026, 1, '2026-02-02');

  it('suma viaje extra y marca hueco en diurna -> nocturna con brecha grande', () => {
    const subjects = [
      { day: 0, startMinutes: 8 * 60, endMinutes: 10 * 60, jornada: 'diurna' },
      { day: 0, startMinutes: 18 * 60, endMinutes: 20 * 60, jornada: 'nocturna' }
    ];

    const result = calculateMonthlyCost(subjects, baseConfig, onlyOneMondaySet);

    expect(result.totalTrips).toBe(2);
    expect(result.dailyDetails).toHaveLength(1);
    expect(result.dailyDetails[0].trips).toBe(2);
    expect(result.dailyDetails[0].hasGaps).toBe(true);
  });

  it('no suma viaje extra ni hueco en diurna -> nocturna con brecha menor al umbral', () => {
    const subjects = [
      { day: 0, startMinutes: 8 * 60, endMinutes: 10 * 60, jornada: 'diurna' },
      { day: 0, startMinutes: 10 * 60 + 30, endMinutes: 12 * 60, jornada: 'nocturna' }
    ];

    const result = calculateMonthlyCost(subjects, baseConfig, onlyOneMondaySet);

    expect(result.totalTrips).toBe(1);
    expect(result.dailyDetails).toHaveLength(1);
    expect(result.dailyDetails[0].trips).toBe(1);
    expect(result.dailyDetails[0].hasGaps).toBe(false);
  });

  it('ignora hueco nocturna -> nocturna aunque la brecha supere el umbral', () => {
    const subjects = [
      { day: 0, startMinutes: 18 * 60, endMinutes: 19 * 60, jornada: 'nocturna' },
      { day: 0, startMinutes: 21 * 60, endMinutes: 22 * 60, jornada: 'nocturna' }
    ];

    const result = calculateMonthlyCost(subjects, baseConfig, onlyOneMondaySet);

    expect(result.totalTrips).toBe(1);
    expect(result.dailyDetails).toHaveLength(1);
    expect(result.dailyDetails[0].trips).toBe(1);
    expect(result.dailyDetails[0].hasGaps).toBe(false);
  });

  it('en cadena diurna -> nocturna -> nocturna solo cuenta brechas válidas', () => {
    const subjects = [
      { day: 0, startMinutes: 8 * 60, endMinutes: 10 * 60, jornada: 'diurna' },
      { day: 0, startMinutes: 18 * 60, endMinutes: 19 * 60, jornada: 'nocturna' },
      { day: 0, startMinutes: 21 * 60, endMinutes: 22 * 60, jornada: 'nocturna' }
    ];

    const result = calculateMonthlyCost(subjects, baseConfig, onlyOneMondaySet);

    expect(result.totalTrips).toBe(2);
    expect(result.dailyDetails).toHaveLength(1);
    expect(result.dailyDetails[0].trips).toBe(2);
    expect(result.dailyDetails[0].hasGaps).toBe(true);
  });

  it('corrige tiempos inconsistentes por fila/jornada y detecta hueco de 160 minutos en jueves con umbral 150', () => {
    const config150 = {
      minGapMinutes: 150,
      transportCost: 0,
      snackCost: 0,
      year: 2026,
      month: 1
    };

    const onlyOneThursdaySet = buildExcludedDaysSetExceptDate(2026, 1, '2026-02-05');

    const rawSubjects = [
      // Jueves 14:40 - 16:20 (correcto)
      { day: 3, col: 3, row: 9, blocks: 2, jornada: 'diurna', startMinutes: 880, endMinutes: 980 },
      // Jueves 19:00 - 22:00 (correcto)
      { day: 3, col: 3, row: 15, blocks: 4, jornada: 'nocturna', startMinutes: 1140, endMinutes: 1320 },
      // Registro inconsistente legacy: fila diurna con minutos incorrectos (debe repararse a 13:00 - 14:40)
      { day: 3, col: 3, row: 7, blocks: 2, jornada: 'diurna', startMinutes: 1120, endMinutes: 1320 }
    ];

    const subjects = normalizeSubjectsForCalculation(rawSubjects);
    const repairedSubject = subjects.find(s => s.jornada === 'diurna' && s.endMinutes === 880);

    expect(repairedSubject).toBeTruthy();
    expect(repairedSubject.startMinutes).toBe(780);
    expect(repairedSubject.endMinutes).toBe(880);

    const result = calculateMonthlyCost(subjects, config150, onlyOneThursdaySet);

    expect(result.dailyDetails).toHaveLength(1);
    expect(result.dailyDetails[0].dayName).toBe('Jueves');
    expect(result.dailyDetails[0].hasGaps).toBe(true);
    expect(result.dailyDetails[0].trips).toBe(2);
  });
});
