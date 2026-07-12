import { describe, it, expect } from 'vitest';
import { CalendarioAcademico } from '../js/calendario-academico.js';

describe('CalendarioAcademico - hardening helpers', () => {
  it('escapa HTML peligroso en textos del tooltip', () => {
    const result = CalendarioAcademico.escapeHtml('<img src=x onerror="alert(1)">');

    expect(result).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });

  it('acepta colores CSS permitidos', () => {
    expect(CalendarioAcademico.normalizeEventColor('var(--cal-evaluacion)')).toBe('var(--cal-evaluacion)');
    expect(CalendarioAcademico.normalizeEventColor('#ff0000')).toBe('#ff0000');
    expect(CalendarioAcademico.normalizeEventColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
  });

  it('usa color por defecto cuando el valor no es válido', () => {
    expect(CalendarioAcademico.normalizeEventColor('javascript:alert(1)')).toBe('var(--cal-academico)');
    expect(CalendarioAcademico.normalizeEventColor('url(http://example.com)')).toBe('var(--cal-academico)');
  });

  it('tolera nulos o undefined al escapar y normalizar', () => {
    expect(CalendarioAcademico.escapeHtml(null)).toBe('');
    expect(CalendarioAcademico.normalizeEventColor(undefined)).toBe('var(--cal-academico)');
  });
});