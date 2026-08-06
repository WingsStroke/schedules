"use strict";

import { ErrorHandler } from './core.js';
import { bloquesDiurnos, bloquesNocturnos } from './core.js';
import { StorageDB } from './storage-db.js';
import { removeGhostSubject, clearDuplicateVisualState, setDuplicateCursor } from './dom-renderer.js';

// ==========================================
// GLOBALES DE ESTADO
// ==========================================
export let schedules = []; // Declaración ÚNICA de la variable
export let currentScheduleIndex = null;
export function setCurrentScheduleIndex(index) { currentScheduleIndex = index; }

// ==========================================
// LÓGICA DE PERSISTENCIA (INDEXED DB)
// ==========================================
export async function initializeState() {
  try {
    await StorageDB.init(); // Levanta la DB y hace la migración si es necesario
    const data = await StorageDB.getItem("schedules");
    
    if (data && Array.isArray(data)) {
      schedules = data;
      schedules.forEach(schedule => {
        if (typeof schedule.schemaVersion !== "number") schedule.schemaVersion = 1;
        if (Array.isArray(schedule.subjects)) {
          schedule.subjects = schedule.subjects.map(normalizeSubject);
        }
      });
    }
  } catch (error) {
    ErrorHandler.handleError(error, "Inicializando Base de Datos");
  }
}

export async function saveData(invalidatePreviewCache = true) {
  try {
    // Se guarda en segundo plano (no congela la pantalla)
    const success = await StorageDB.setItem("schedules", schedules);
    
    if (invalidatePreviewCache) {
      const prefix = `${currentScheduleIndex}:`;
      Object.keys(window._previewCache).forEach(k => { 
        if (k.startsWith(prefix)) delete window._previewCache[k]; 
      });
    }
    return success;
  } catch (error) {
    ErrorHandler.handleError(error, "Guardando en Base de Datos");
    return false;
  }
}

// ==========================================
// ESTADO DE LA INTERFAZ
// ==========================================
export const editorState = {
  editingSubjectIndex: null, duplicatingSubject: null,
  currentCell: null, cellMatrix: [], ghostSubject: null, globalRowIndex: 0
};

export const renderCache = { renderedSubjects: new Map() };
window._previewCache = window._previewCache || {};


export const state = {
  resetEditor() { editorState.editingSubjectIndex = null; editorState.currentCell = null; editorState.ghostSubject = null; },
  startDuplication(subject) { editorState.duplicatingSubject = subject; setDuplicateCursor(true); },
  cancelDuplication() { editorState.duplicatingSubject = null; removeGhostSubject(); clearDuplicateVisualState(); setDuplicateCursor(false); },
  isDuplicating() { return editorState.duplicatingSubject !== null; },
  setCurrentCell(cell) { editorState.currentCell = cell; },
  clearCurrentCell() { editorState.currentCell = null; }
};

// ==========================================
// LÓGICA DE TIEMPOS Y HORARIOS
// ==========================================
export const JORNADA_BASE = { 
  diurna: { startMinutes: 7 * 60, blockMinutes: 100 }, 
  nocturna: { startMinutes: 17 * 60, blockMinutes: 90 } 
};

function getCanonicalRangeFromGrid(subject) {
  if (!subject) return null;

  const row = Number(subject.row);
  const blocks = Number(subject.blocks);
  const safeBlocks = Number.isFinite(blocks) && blocks > 0 ? Math.floor(blocks) : 1;

  if (!Number.isFinite(row) || row < 0 || !subject.jornada) return null;

  if (subject.jornada === 'diurna') {
    const startIndex = Math.floor(row);
    const endIndex = startIndex + safeBlocks - 1;
    if (startIndex < 0 || endIndex >= bloquesDiurnos.length) return null;
    return {
      startMinutes: bloquesDiurnos[startIndex].startMinutes,
      endMinutes: bloquesDiurnos[endIndex].endMinutes
    };
  }

  if (subject.jornada === 'nocturna') {
    const diurnaOffset = bloquesDiurnos.length;
    // Compatibilidad: soporta filas nocturnas globales y locales.
    const localRow = row >= diurnaOffset ? Math.floor(row - diurnaOffset) : Math.floor(row);
    const endIndex = localRow + safeBlocks - 1;
    if (localRow < 0 || endIndex >= bloquesNocturnos.length) return null;
    return {
      startMinutes: bloquesNocturnos[localRow].startMinutes,
      endMinutes: bloquesNocturnos[endIndex].endMinutes
    };
  }

  return null;
}

export function getTimeRangePure(subject) {
  return getCanonicalRangeFromGrid(subject);
}

// Definir ScheduleTimeModel ANTES de normalizeSubject para evitar forward reference
export const ScheduleTimeModel = {
  getSubjectTimeRange(subject) {
    if (typeof subject.startMinutes === "number") return { startMinutes: subject.startMinutes, endMinutes: subject.endMinutes };
    return getTimeRangePure(subject);
  },
  calculateGaps(timeline, minGapMinutes) {
    let gaps = 0;
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i].startMinutes - timeline[i - 1].endMinutes >= minGapMinutes) gaps++;
    }
    return gaps;
  }
};

export function normalizeSubject(subject) {
  const col = Number(subject.col);
  const dayFromSubject = Number(subject.day);
  const day = Number.isInteger(col) ? col : dayFromSubject;

  const normalizedRow = Number(subject.row);
  const normalizedBlocksRaw = Number(subject.blocks);
  const normalizedBlocks = Number.isFinite(normalizedBlocksRaw) && normalizedBlocksRaw > 0
    ? Math.floor(normalizedBlocksRaw)
    : 1;

  const normalized = {
    id: subject.id ?? crypto.randomUUID(), name: subject.name ?? "", color: subject.color ?? "#1d4ed8",
    row: normalizedRow, col: col, blocks: normalizedBlocks,
    group: subject.group ?? "", program: subject.program ?? "", aula: subject.aula ?? "", credits: subject.credits ?? 0,
    jornada: subject.jornada, day: day, startMinutes: subject.startMinutes, endMinutes: subject.endMinutes,
    showCredits: subject.showCredits ?? false, showGroup: subject.showGroup ?? false, showProgram: subject.showProgram ?? false, showAula: subject.showAula ?? false
  };

  const timeRange = getTimeRangePure(normalized);
  const hasNumericRange = typeof normalized.startMinutes === "number" && typeof normalized.endMinutes === "number";

  // Repara registros legacy/inconsistentes usando la grilla como fuente de verdad.
  if (timeRange && (!hasNumericRange || normalized.startMinutes !== timeRange.startMinutes || normalized.endMinutes !== timeRange.endMinutes)) {
    normalized.startMinutes = timeRange.startMinutes;
    normalized.endMinutes = timeRange.endMinutes;
  }

  return normalized;
}

export function normalizeSubjectsForCalculation(subjects) {
  return subjects
    .map(normalizeSubject)
    .filter(s => Number.isInteger(s.day) && typeof s.startMinutes === "number" && typeof s.endMinutes === "number")
    .map(s => ({ day: s.day, startMinutes: s.startMinutes, endMinutes: s.endMinutes, jornada: s.jornada }));
}

export const ScheduleLogic = {
  canPlaceSubject({ schedule, row, col, blocks, jornada, excludeSubject }) {
    for (let i = 0; i < blocks; i++) {
      const r = row + i;
      const conflict = schedule.subjects.some(s => {
        if (excludeSubject && s.id === excludeSubject.id) return false;
        if (s.col !== col || s.jornada !== jornada) return false;
        return r >= s.row && r < s.row + s.blocks;
      });
      if (conflict) return false;
    }
    return true;
  }
};

export function isCellOccupied(schedule, row, col, blocks, excludeSubject, jornada) {
  return !ScheduleLogic.canPlaceSubject({ schedule, row, col, blocks, jornada, excludeSubject });
}

export function validateScheduleSchema(schedule) {
  if (!schedule || typeof schedule !== 'object') return "Objeto inválido";
  if (!schedule.name) return "Sin nombre";
  if (!Array.isArray(schedule.subjects)) return "Subjects debe ser array";
  return null;
}