"use strict";

// ==========================================
// GLOBALES DE ESTADO
// ==========================================
let schedules = []; // Declaración ÚNICA de la variable
let currentScheduleIndex = null;

// ==========================================
// LÓGICA DE PERSISTENCIA (INDEXED DB)
// ==========================================
async function initializeState() {
  try {
    await StorageDB.init(); // Levanta la DB y hace la migración si es necesario
    const data = await StorageDB.getItem("schedules");
    
    if (data && Array.isArray(data)) {
      schedules = data;
      schedules.forEach(schedule => {
        if (typeof schedule.schemaVersion !== "number") schedule.schemaVersion = 1;
      });
    }
  } catch (error) {
    ErrorHandler.handleError(error, "Inicializando Base de Datos");
  }
}

async function saveData(invalidatePreviewCache = true) {
  try {
    // Se guarda en segundo plano (no congela la pantalla)
    const success = await StorageDB.setItem("schedules", schedules);
    
    if (invalidatePreviewCache) {
      const prefix = `${currentScheduleIndex}:`;
      Object.keys(_previewCache).forEach(k => { 
        if (k.startsWith(prefix)) delete _previewCache[k]; 
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
const editorState = {
  editingSubjectIndex: null, duplicatingSubject: null,
  currentCell: null, cellMatrix: [], ghostSubject: null, globalRowIndex: 0
};

const renderCache = { renderedSubjects: new Map() };
const _previewCache = {};

function _previewCacheKey() {
  const d = document.getElementById("exportDiurna").checked ? "1" : "0";
  const n = document.getElementById("exportNocturna").checked ? "1" : "0";
  const e = document.getElementById("exportEnhanced").checked ? "1" : "0";
  const h = document.getElementById("exportHideEmpty").checked ? "1" : "0";
  return `${currentScheduleIndex ?? "null"}:${d}:${n}:${e}:${h}`;
}

const state = {
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
const JORNADA_BASE = { 
  diurna: { startMinutes: 7 * 60, blockMinutes: 100 }, 
  nocturna: { startMinutes: 17 * 60, blockMinutes: 90 } 
};

function getTimeRangePure(subject) {
  if (!subject || typeof subject.row !== "number" || typeof subject.blocks !== "number" || !JORNADA_BASE[subject.jornada]) return null;
  const base = JORNADA_BASE[subject.jornada];
  const startMinutes = base.startMinutes + subject.row * base.blockMinutes;
  return { startMinutes, endMinutes: startMinutes + subject.blocks * base.blockMinutes };
}

function normalizeSubject(subject) {
  const day = Number.isInteger(Number(subject.day)) ? Number(subject.day) : Number(subject.col);
  const normalized = {
    id: subject.id ?? crypto.randomUUID(), name: subject.name ?? "", color: subject.color ?? "#1d4ed8",
    row: Number(subject.row), col: Number(subject.col), blocks: Number(subject.blocks),
    group: subject.group ?? "", program: subject.program ?? "", aula: subject.aula ?? "", credits: subject.credits ?? 0,
    jornada: subject.jornada, day: day, startMinutes: subject.startMinutes, endMinutes: subject.endMinutes,
    showCredits: subject.showCredits ?? false, showGroup: subject.showGroup ?? false, showProgram: subject.showProgram ?? false, showAula: subject.showAula ?? false
  };
  
  if (typeof normalized.startMinutes !== "number") {
    const timeRange = ScheduleTimeModel.getSubjectTimeRange(normalized);
    if (timeRange) { normalized.startMinutes = timeRange.startMinutes; normalized.endMinutes = timeRange.endMinutes; }
  }
  return normalized;
}

function normalizeSubjectsForCalculation(subjects) {
  return subjects.filter(s => typeof s.day === "number" && typeof s.startMinutes === "number").map(s => ({
    day: s.day, startMinutes: s.startMinutes, endMinutes: s.endMinutes, jornada: s.jornada
  }));
}

const ScheduleLogic = {
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

const ScheduleTimeModel = {
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

function isCellOccupied(schedule, row, col, blocks, excludeSubject, jornada) {
  return !ScheduleLogic.canPlaceSubject({ schedule, row, col, blocks, jornada, excludeSubject });
}

function validateScheduleSchema(schedule) {
  if (!schedule || typeof schedule !== 'object') return "Objeto inválido";
  if (!schedule.name) return "Sin nombre";
  if (!Array.isArray(schedule.subjects)) return "Subjects debe ser array";
  return null;
}