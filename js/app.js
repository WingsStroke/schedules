"use strict";

const ErrorHandler = {
  config: {
    logToConsole: true,
    showUserMessages: true,
    maxErrorLogs: 50
  },

  errorLog: [],
  
  init() {

    window.addEventListener('error', (event) => {
      this.logError({
        type: 'JavaScript Error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
      
      event.preventDefault();
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'Unhandled Promise Rejection',
        message: event.reason?.message || event.reason,
        error: event.reason
      });
      
      this.handleError(event.reason);
      event.preventDefault();
    });
    
    if (this.config.logToConsole) {
      console.log('Debuging inicializado');
    }
  },
  
  logError(errorInfo) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...errorInfo
    };
    
    this.errorLog.push(logEntry);
    
    if (this.errorLog.length > this.config.maxErrorLogs) {
      this.errorLog.shift();
    }
    
    if (this.config.logToConsole) {
      console.error('Error capturado:', logEntry);
    }
  },
  
  handleError(error, context = null) {
    if (!error) return;
    
    const errorName = error.name || 'Error';
    const errorMessage = error.message || String(error);
    
    let userMessage = '';
    let errorType = 'error';
    
    if (errorName === 'QuotaExceededError' || errorMessage.includes('quota')) {
      userMessage = 'Almacenamiento lleno. Elimina algunos horarios para continuar.';
      errorType = 'warning';
    } 
    else if (errorName === 'NetworkError' || errorMessage.includes('network') || errorMessage.includes('fetch')) {
      userMessage = '📡 Error de conexión. Verifica tu internet.';
      errorType = 'error';
    }
    else if (errorName === 'SyntaxError' && errorMessage.includes('JSON')) {
      userMessage = 'Archivo corrupto o inválido. Verifica el formato.';
      errorType = 'error';
    }
    else if (errorName === 'TypeError' && errorMessage.includes('null')) {
      userMessage = 'Error al procesar datos. Intenta recargar la página.';
      errorType = 'error';
    }
    else if (context) {
      userMessage = `Error en ${context}. ${errorMessage}`;
      errorType = 'error';
    }
    else {
      userMessage = 'Ocurrió un error inesperado. Intenta recargar la página.';
      errorType = 'error';
    }
    
    if (this.config.showUserMessages) {
      alert(userMessage);
    }
  },

  wrap(fn, context = 'operación') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.logError({
          type: 'Wrapped Function Error',
          context: context,
          message: error.message,
          error: error
        });
        
        this.handleError(error, context);
        throw error;
      }
    };
  },
  
  async safeExecute(fn, context = 'operación', defaultValue = null) {
    try {
      return await fn();
    } catch (error) {
      this.logError({
        type: 'Safe Execute Error',
        context: context,
        message: error.message,
        error: error
      });
      
      this.handleError(error, context);
      return defaultValue;
    }
  },
  
  getErrorLog() {
    return [...this.errorLog];
  },
  
  clearErrorLog() {
    this.errorLog = [];
    if (this.config.logToConsole) {
      console.log('🧹 Registro de errores limpiado');
    }
  },
  
  exportErrorLog() {
    const logText = this.errorLog
      .map(entry => `[${entry.timestamp}] ${entry.type}: ${entry.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

const SafeStorage = {

  setItem(key, value) {
    try {
      const jsonString = JSON.stringify(value);
      localStorage.setItem(key, jsonString);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        ErrorHandler.handleError(error);
        return false;
      }
      
      ErrorHandler.logError({
        type: 'Storage Write Error',
        key: key,
        message: error.message,
        error: error
      });
      
      console.error('Error al guardar en localStorage:', error);
      return false;
    }
  },

  getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      
      return JSON.parse(item);
    } catch (error) {
      ErrorHandler.logError({
        type: 'Storage Read Error',
        key: key,
        message: error.message,
        error: error
      });
      
      console.error('Error al leer de localStorage:', error);
      return defaultValue;
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      ErrorHandler.logError({
        type: 'Storage Delete Error',
        key: key,
        message: error.message,
        error: error
      });
      
      console.error('Error al eliminar de localStorage:', error);
      return false;
    }
  },
  
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      ErrorHandler.logError({
        type: 'Storage Clear Error',
        message: error.message,
        error: error
      });
      
      console.error('Error al limpiar localStorage:', error);
      return false;
    }
  },
  
  hasSpace() {
    try {
      const testKey = '__storage_test__';
      const testData = 'x'.repeat(1024 * 100);
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  },
  
  getUsage() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return {
      bytes: total,
      kb: (total / 1024).toFixed(2),
      mb: (total / 1024 / 1024).toFixed(2)
    };
  }
};

function safeJSONParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    ErrorHandler.logError({
      type: 'JSON Parse Error',
      message: error.message,
      input: jsonString?.substring(0, 100) + '...',
      error: error
    });
    
    console.error('Error al parsear JSON:', error);
    return defaultValue;
  }
}

function safeJSONStringify(obj, defaultValue = '{}') {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    ErrorHandler.logError({
      type: 'JSON Stringify Error',
      message: error.message,
      error: error
    });
    
    console.error('Error al convertir a JSON:', error);
    return defaultValue;
  }
}

async function safeFetch(url, options = {}) {
  const timeout = options.timeout || 10000;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Timeout: La petición tardó demasiado');
      ErrorHandler.handleError(timeoutError, 'cargar datos');
      throw timeoutError;
    }
    
    ErrorHandler.logError({
      type: 'Fetch Error',
      url: url,
      message: error.message,
      error: error
    });
    
    throw error;
  }
}

// Inicializar el sistema de errores al cargar
ErrorHandler.init();

console.log('Uso de localStorage:', SafeStorage.getUsage());

const APP_CONFIG = {
  SCHEMA_VERSION: 3,
  LAST_VERSION_KEY: "lastSeenChangelogVersion",
  
  JORNADAS: {
    diurna: {
      start: "07:00",
      end: "18:00",
      visualBlockMinutes: 50,
      startMinutes: 7 * 60,
      blockMinutes: 100
    },
    nocturna: {
      start: "17:30",
      end: "22:00",
      visualBlockMinutes: 45,
      startMinutes: 17 * 60,
      blockMinutes: 90
    }
  }
};

const monthlyModal = document.getElementById("monthlyModal");

const duplicateBar = document.getElementById("duplicateBar");
const cancelDuplicateBtn = document.getElementById("cancelDuplicateBtn");
const calculateBtn = document.getElementById("calculateMonthlyBtn");
const monthlyResult = document.getElementById("monthlyResult");
const resultMonth = document.getElementById("resultMonth");
const resultTrips = document.getElementById("resultTrips");
const resultTotal = document.getElementById("resultTotal");
const closeMonthlyResultBtn = document.getElementById("closeMonthlyResult");

const changelogBtn = document.getElementById("changelogBtn");
const changelogPanel = document.getElementById("changelogPanel");
const closeChangelogBtn = document.getElementById("closeChangelogBtn");
const changelogAlert = document.getElementById("changelogAlert");
const lastVersionKey = APP_CONFIG.LAST_VERSION_KEY;
const currentScheduleSchema = APP_CONFIG.SCHEMA_VERSION;
const scheduleBody = document.querySelector("#schedule tbody");

const editorState = {
  currentScheduleIndex: null,
  editingSubjectIndex: null,
  duplicatingSubject: null,
  currentCell: null,
  cellMatrix: [],
  ghostSubject: null,
  globalRowIndex: 0
};

const renderCache = {
  renderedSubjects: new Map()
};

function setDuplicateCursor(active){
  document.body.style.cursor = active ? "copy" : "default";
  duplicateBar.style.display = active ? "flex" : "none";
}

const state = {
  resetEditor() {
    editorState.editingSubjectIndex = null;
    editorState.currentCell = null;
    editorState.ghostSubject = null;
  },

  startDuplication(subject) {
    editorState.duplicatingSubject = subject;
    setDuplicateCursor(true);
  },

  cancelDuplication() {
    editorState.duplicatingSubject = null;
    removeGhostSubject();
    clearDuplicateVisualState();
    setDuplicateCursor(false);
  },

  isDuplicating() {
    return editorState.duplicatingSubject !== null;
  },

  setCurrentCell(cell) {
    editorState.currentCell = cell;
  },

  clearCurrentCell() {
    editorState.currentCell = null;
  }
};

const JORNADA_BASE = {
  diurna: {
    startMinutes: 7 * 60,
    blockMinutes: 100
  },
  nocturna: {
    startMinutes: 17 * 60,
    blockMinutes: 90
  }
};

function getTimeRangePure(subject) {
  if (
    !subject ||
    typeof subject.row !== "number" ||
    typeof subject.blocks !== "number" ||
    !JORNADA_BASE[subject.jornada]
  ) {
    return null;
  }

  const base = JORNADA_BASE[subject.jornada];

  const startMinutes =
    base.startMinutes + subject.row * base.blockMinutes;

  const endMinutes =
    startMinutes + subject.blocks * base.blockMinutes;

  return { startMinutes, endMinutes };
}

const bloquesDiurnos = generarBloques("diurna");
const bloquesNocturnos = generarBloques("nocturna");

changelogBtn.addEventListener("click", async () => {
  changelogPanel.classList.add("open");
  const data = await loadChangelog();

  if(data && Array.isArray(data) && data.length > 0){
    renderChangelog(data);
    const latestVersion = data[0].version;
    SafeStorage.setItem(lastVersionKey, latestVersion);
    changelogAlert.style.display = "none";
  } 
  else {
    const container = document.getElementById("changelogContent");
    container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">No se pudo cargar el historial de cambios.</p>';
  }
});

closeChangelogBtn.addEventListener("click", () => {
  changelogPanel.classList.remove("open");
});

closeMonthlyResultBtn.onclick = () => {
  monthlyResult.style.display = "none";

  const detailPanel = document.getElementById("monthlyDetailPanel");
  if (detailPanel) {
    detailPanel.classList.add("hidden");
    detailPanel.innerHTML = "";
  }
};

function renderChangelog(changelogData){
  const container = document.getElementById("changelogContent");
  container.innerHTML = "";

  changelogData.forEach(entry => {
    const card = document.createElement("div");
    card.className = "changelog-entry";

    const title = document.createElement("h3");
    title.textContent = `Versión ${entry.version}`;

    const list = document.createElement("ul");
    entry.changes.forEach(change => {
      const li = document.createElement("li");
      li.textContent = change;
      list.appendChild(li);
    });

    const date = document.createElement("div");
    date.className = "date";
    date.textContent = `Fecha de publicación: ${entry.date}`;

    card.appendChild(title);
    card.appendChild(list);
    card.appendChild(date);

    container.appendChild(card);
  });
}

function checkChangelogVersion(changelogData){
  if(!Array.isArray(changelogData) || changelogData.length === 0) return;

  const latestVersion = changelogData[0].version;
  const lastSeenVersion = SafeStorage.getItem(lastVersionKey, null);

  if(lastSeenVersion !== latestVersion){
    changelogAlert.style.display = "inline-flex";
  }else{
    changelogAlert.style.display = "none";
  }
}

async function loadChangelog() {
  const cacheBuster = Date.now();
  
  try {
    const response = await safeFetch(`changelog.json?v=${cacheBuster}`, {
      cache: "no-store",
      timeout: 5000
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('No se pudo cargar el changelog:', error);
    return [];
  }
}

// JORNADAS - INICIO

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function timeToMinutes(time){
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min){
  let h = Math.floor(min / 60);
  let m = min % 60;

  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;

  return `${h}:${String(m).padStart(2,"0")} ${period}`;
}

function generarBloques(jornada) {
  const { start, end, visualBlockMinutes } = APP_CONFIG.JORNADAS[jornada];
  const bloques = [];
  let actual = timeToMinutes(start);
  const limite = timeToMinutes(end);

  while (actual + visualBlockMinutes <= limite) {

    bloques.push({
      startMinutes: actual,
      endMinutes: actual + visualBlockMinutes
    });

    actual += visualBlockMinutes;

    if (jornada === "diurna" && actual === timeToMinutes("12:50")) {
      actual += 10;
    }
  }

  return bloques;
}

function removeGhostSubject(){
  if(editorState.ghostSubject){
    editorState.ghostSubject.remove();
    editorState.ghostSubject = null;
  }
}

function clearDuplicateVisualState() {
  if (editorState.ghostSubject) {
    editorState.ghostSubject.remove();
    editorState.ghostSubject = null;
  }

  document.querySelectorAll(".cell.active-root").forEach(c => {
    c.classList.remove("active-root");
    c.style.removeProperty("--active-height");
  });
}
  
function createGhostSubject(subject, cell){
  removeGhostSubject();

  const div = document.createElement("div");
  div.className = "ghost-subject";
  div.style.background = subject.color;
  div.style.opacity = "0.35";
  div.style.pointerEvents = "none";

  cell.appendChild(div);
  editorState.ghostSubject = div;
}

function construirSeccion(titulo, bloques, jornada) {

  const header = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = diasSemana.length + 1;
  td.textContent = titulo;
  td.classList.add("jornada-header");

  if(jornada === "nocturna"){
    td.classList.add("nocturna-divider");
  }

  header.appendChild(td);
  scheduleBody.appendChild(header);

  bloques.forEach((bloque) => {
    const rowIndex = editorState.globalRowIndex;
    editorState.globalRowIndex++;

    const row = document.createElement("tr");
    row.dataset.jornada = jornada;

    const matrixRow = [];

    const hourCell = document.createElement("td");
    hourCell.textContent =
      `${minutesToTime(bloque.startMinutes)} - ${minutesToTime(bloque.endMinutes)}`;
    hourCell.classList.add("time");
    row.appendChild(hourCell);

    diasSemana.forEach((dia, colIndex) => {
      const cell = document.createElement("td");
      cell.classList.add("cell");
      cell.dataset.day = dia;
      cell.dataset.startMinutes = bloque.startMinutes;
      cell.dataset.endMinutes = bloque.endMinutes;
      cell.dataset.jornada = jornada;

      const matrixCell = {
        element: cell,
        day: dia,
        startMinutes: bloque.startMinutes,
        endMinutes: bloque.endMinutes,
        jornada,
        subject: null
      };

      cell.onclick = (e) => {
        e.stopPropagation();

        if (state.isDuplicating()) {
          placeDuplicatedSubject(rowIndex, colIndex);
          return;
        }

        openSubjectModal(rowIndex, colIndex);
      };

        cell.onmouseenter = () => {
          if (!state.isDuplicating()) return;
          if (cell.classList.contains("blocked")) return;
          removeGhostSubject();
          createGhostSubject(editorState.duplicatingSubject, cell);
        };

        cell.onmouseleave = () => {
          removeGhostSubject();
        };

      matrixRow.push(matrixCell);

      row.appendChild(cell);
    });

    editorState.cellMatrix.push(matrixRow);
    scheduleBody.appendChild(row);
  });
}

function construirHorario() {

  state.cancelDuplication();

  scheduleBody.innerHTML = "";
  editorState.cellMatrix = [];
  editorState.globalRowIndex = 0;

  construirSeccion(
    "JORNADA DIURNA",
    bloquesDiurnos,
    "diurna"
  );

  construirSeccion(
    "JORNADA NOCTURNA",
    bloquesNocturnos,
    "nocturna"
  );
}

function resetSubjectModalState(){
  state.cancelDuplication();
  editorState.editingSubjectIndex = null;
  clearCurrentCell();
  removeGhostSubject();
}

cancelDuplicateBtn.onclick = () => {
  resetSubjectModalState();
};

let schedules = SafeStorage.getItem("schedules", []);

schedules.forEach(schedule => {
  if (typeof schedule.schemaVersion !== "number") {
    schedule.schemaVersion = 1;
  }
});

let currentScheduleIndex = null;

// ELEMENTOS HOME

const homeView = document.getElementById("home");
const appView = document.getElementById("app");
const scheduleList = document.getElementById("scheduleList");
const createScheduleBtn = document.getElementById("createScheduleBtn");
const sortSelect = document.querySelector("#sortBar select");

const nameModal = document.getElementById("newScheduleModal");
const renameModal = document.getElementById("renameScheduleModal");
const deleteModal = document.getElementById("deleteScheduleModal");

const scheduleNameInput = nameModal.querySelector("input");
const renameInput = renameModal.querySelector("input");

const confirmCreateBtn = nameModal.querySelector("button:not(.close-btn)");
const confirmRenameBtn = renameModal.querySelector("button:not(.close-btn)");
const confirmDeleteBtn = deleteModal.querySelector("button:not(.close-btn)");

let selectedScheduleIndex = null;

function showErrorLog() {
  const errors = ErrorHandler.getErrorLog();
  
  if (errors.length === 0) {
    alert("No hay errores registrados");
    return;
  }
  
  const errorText = errors
    .map(e => `[${new Date(e.timestamp).toLocaleString()}] ${e.type}: ${e.message}`)
    .join('\n\n');
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content" style="width: 600px; max-width: 90%;">
      <span class="close-btn" onclick="this.parentElement.parentElement.remove()">✕</span>
      <h3>Registro de Errores</h3>
      <pre style="
        background: #f5f5f5;
        padding: 15px;
        border-radius: 4px;
        max-height: 400px;
        overflow-y: auto;
        font-size: 12px;
        white-space: pre-wrap;
      ">${errorText}</pre>
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <button onclick="ErrorHandler.exportErrorLog()" style="flex: 1;">
          Exportar Log
        </button>
        <button onclick="ErrorHandler.clearErrorLog(); this.closest('.modal').remove();" style="flex: 1; background: #d32f2f;">
          Limpiar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function showStorageInfo() {
  const usage = SafeStorage.getUsage();
  
  alert(`
    Uso de Almacenamiento:

    Tamaño: ${usage.kb} KB
    Espacio disponible: ${SafeStorage.hasSpace() ? 'Sí' : 'Casi lleno'}
  `);
}

// GUARDAR EN LOCALSTORAGE

function saveData() {

  if (!SafeStorage.hasSpace()) {
    alert("Almacenamiento casi lleno. Considera eliminar horarios antiguos.");
  }

  const success = SafeStorage.setItem("schedules", schedules);
  
  if (!success) {
    console.error('No se pudieron guardar los cambios');
  }
  
  return success;
}

// RENDER DE HORARIOS FUNCIONA YA

function normalizeSubject(subject) {

  const day =
    Number.isInteger(Number(subject.day))
      ? Number(subject.day)
      : Number(subject.col);

  const normalized = {
    id: subject.id ?? crypto.randomUUID(),
    name: subject.name ?? "",
    color: subject.color ?? "#1d4ed8",
    row: Number(subject.row),
    col: Number(subject.col),
    blocks: Number(subject.blocks),
    group: subject.group ?? "",
    program: subject.program ?? "",
    credits: subject.credits ?? 0,
    jornada: subject.jornada,
    day: day,
    startMinutes: subject.startMinutes,
    endMinutes: subject.endMinutes,
    showCredits: subject.showCredits ?? false,
    showGroup: subject.showGroup ?? false,
    showProgram: subject.showProgram ?? false
  };

  if (
    typeof normalized.startMinutes !== "number" ||
    typeof normalized.endMinutes !== "number"
  ) {
    const bloques =
      normalized.jornada === "nocturna"
        ? bloquesNocturnos
        : bloquesDiurnos;

    if (
      Number.isInteger(normalized.row) &&
      Number.isInteger(normalized.blocks)
    ) {
      const timeRange =
        ScheduleTimeModel.getSubjectTimeRange(
          normalized,
        );

      if (timeRange) {
        normalized.startMinutes = timeRange.startMinutes;
        normalized.endMinutes = timeRange.endMinutes;
      }
    }
  }

  return normalized;
}

function normalizeSubjectsForCalculation(subjects) {
  return subjects
    .filter(s =>
      typeof s.day === "number" &&
      typeof s.startMinutes === "number" &&
      typeof s.endMinutes === "number"
    )
    .map(s => ({
      day: s.day,
      startMinutes: s.startMinutes,
      endMinutes: s.endMinutes,
      jornada: s.jornada
    }));
}

function isLegacySchedule(schedule) {
  return schedule.schemaVersion < currentScheduleSchema;
}

const scheduleTitle = document.querySelector("#app h2");

function rebuildScheduleView() {

  renderCache.renderedSubjects.clear();

  if (currentScheduleIndex === null) return;

  construirHorario();
  syncSubjectsWithGrid();
  renderSubjects();
}

function openSchedule(index){

  state.cancelDuplication();

  if(index === null || schedules[index] === undefined) return;

  changelogPanel.classList.remove("open");

  currentScheduleIndex = index;

  renderCache.renderedSubjects.clear();

  let currentSchedule = schedules[currentScheduleIndex];

  if (currentSchedule.schemaVersion < currentScheduleSchema) {
    currentSchedule = migrateSchedule(currentSchedule);
    schedules[index] = currentSchedule;

    console.info(
      `[Horarios] Horario "${currentSchedule.name}" migrado y guardado correctamente`
    );
  }

  scheduleTitle.textContent = currentSchedule.name;

  updateScheduleInfo();

  homeView.classList.remove("active");
  appView.classList.add("active");

  currentSchedule.subjects =
    currentSchedule.subjects.map(normalizeSubject);

  saveData();
  rebuildScheduleView();
}

const legacySchedules = schedules.filter(isLegacySchedule);

if (legacySchedules.length > 0) {
  console.warn(
    `[Horarios] ${legacySchedules.length} horario(s) creados con versiones antiguas:`,
    legacySchedules.map(s => ({
      name: s.name,
      schemaVersion: s.schemaVersion
    }))
  );
}

function rebuildMinutesFromGrid(subject) {
  const range = getTimeRangePure(subject);

  if (!range) {
    console.warn("[Migración] No se pudo reconstruir tiempo:", subject);
    return null;
  }

  return {
    ...subject,
    startMinutes: range.startMinutes,
    endMinutes: range.endMinutes
  };
}

function migrateLegacySubject(subject) {
  const normalized = normalizeSubject(subject);
  const rebuilt = rebuildMinutesFromGrid(normalized);

  if (!rebuilt) return null;

  return rebuilt;
}

function migrateSchedule(schedule) {
  console.info(
    `[Horarios] Migrando horario "${schedule.name}" de v${schedule.schemaVersion} → v${currentScheduleSchema}`
  );

  return {
    ...schedule,
    schemaVersion: currentScheduleSchema,
    subjects: schedule.subjects.map(migrateLegacySubject).filter(Boolean)
  };
}

function validateScheduleSchema(schedule) {
  if(!schedule || typeof schedule !== 'object') {
    return "El horario debe ser un objeto válido";
  }

  if(!schedule.name || typeof schedule.name !== 'string') {
    return "El horario debe tener un nombre válido";
  }

  if(typeof schedule.created !== 'number') {
    return `Horario "${schedule.name}": falta fecha de creación`;
  }

  if(!Array.isArray(schedule.subjects)) {
    return `Horario "${schedule.name}": subjects debe ser un array`;
  }

  for(let i = 0; i < schedule.subjects.length; i++) {
    const sub = schedule.subjects[i];
    
    if(!sub.name || typeof sub.name !== 'string') {
      return `Horario "${schedule.name}": asignatura #${i + 1} sin nombre`;
    }

    if(!sub.id) {
      return `Horario "${schedule.name}": asignatura "${sub.name}" sin ID`;
    }

    if(typeof sub.row !== 'number' || sub.row < 0) {
      return `Horario "${schedule.name}": asignatura "${sub.name}" con row inválida`;
    }

    if(typeof sub.col !== 'number' || sub.col < 0 || sub.col > 4) {
      return `Horario "${schedule.name}": asignatura "${sub.name}" con columna inválida`;
    }

    if(typeof sub.blocks !== 'number' || sub.blocks < 1) {
      return `Horario "${schedule.name}": asignatura "${sub.name}" debe tener al menos 1 bloque`;
    }

    if(!sub.jornada || (sub.jornada !== 'diurna' && sub.jornada !== 'nocturna')) {
      return `Horario "${schedule.name}": asignatura "${sub.name}" con jornada inválida`;
    }

    if(!sub.color || typeof sub.color !== 'string') {
      return `Horario "${schedule.name}": asignatura "${sub.name}" sin color`;
    }
  }

  return null;
}

function renderSchedules(){
  scheduleList.innerHTML = "";

  let sorted = [...schedules];

  switch(sortSelect.value){
    case "dateDesc":
      sorted.sort((a,b)=>b.created - a.created);
      break;
    case "dateAsc":
      sorted.sort((a,b)=>a.created - b.created);
      break;
    case "nameAsc":
      sorted.sort((a,b)=>a.name.localeCompare(b.name));
      break;
    case "nameDesc":
      sorted.sort((a,b)=>b.name.localeCompare(a.name));
      break;
  }

  sorted.forEach(schedule=>{
    const index = schedules.indexOf(schedule);

    const card = document.createElement("div");
    card.className = "schedule-card";

    const uniqueSubjects = new Set(
      (schedule.subjects || []).map(s => s.name.trim().toLowerCase())
    );
    const subjectCount = uniqueSubjects.size;
    const subjectText = subjectCount === 1 ? "asignatura" : "asignaturas";

    card.innerHTML = `
      <h3>${schedule.name}</h3>
      <span>${new Date(schedule.created).toLocaleDateString()}</span>
      <span class="subject-count">${subjectCount} ${subjectText}</span>
      <div class="card-actions">
        <button data-action="rename">
          <img src="assets/edit.png?v=2" alt="Editar">
        </button>
        <button data-action="delete">
          <img src="assets/delete.png?v=2" alt="Eliminar">
        </button>
      </div>
    `;

    card.onclick = (e)=>{
      if(e.target.closest('[data-action]')) return;
      openSchedule(index);
    };

    const renameBtn = card.querySelector('[data-action="rename"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');

    renameBtn.onclick = ()=>{
      selectedScheduleIndex = index;
      renameInput.value = schedules[index].name;
      renameModal.classList.add("active");
    };

    deleteBtn.onclick = ()=>{
      selectedScheduleIndex = index;
      deleteModal.classList.add("active");
    };

    scheduleList.appendChild(card);
  });
}


// CREAR HORARIO

createScheduleBtn.onclick = ()=>{
  scheduleNameInput.value = "";
  nameModal.classList.add("active");
};

confirmCreateBtn.onclick = ()=>{
  const name = scheduleNameInput.value.trim();
  if(!name) return alert("Debes escribir un nombre");

  schedules.push({
    name,
    created: Date.now(),
    subjects: [],
    schemaVersion: currentScheduleSchema
  });

  saveData();
  nameModal.classList.remove("active");
  renderSchedules();
};

// RENOMBRAR HORARIO

confirmRenameBtn.onclick = ()=>{
  const name = renameInput.value.trim();
  if(!name) return;

  schedules[selectedScheduleIndex].name = name;
  saveData();
  renameModal.classList.remove("active");
  renderSchedules();
};

// ELIMINAR HORARIO

confirmDeleteBtn.onclick = ()=>{
  schedules.splice(selectedScheduleIndex,1);
  saveData();
  deleteModal.classList.remove("active");
  renderSchedules();
};

//CERRAR MODALES

document.querySelectorAll(".close-btn").forEach(btn=>{
  btn.onclick = ()=>{
    const modal = btn.closest(".modal");

    const duplicateBtn = modal.querySelector("#duplicateSubjectBtn");
    if(duplicateBtn) duplicateBtn.remove();

    modal.classList.remove("active");

    if(modal.id === "subjectModal"){
      if(!editorState.duplicatingSubject){
        resetSubjectModalState();
      }
      subjectNameInput.value = "";
      subjectBlocksInput.value = "1";
    }

    if(modal.id === "monthlyModal"){
      const toggle = document.getElementById("aguinaldoToggle");
      const detailPanel = document.getElementById("monthlyDetailPanel");
      if(toggle) toggle.checked = false;
      if(detailPanel) detailPanel.classList.add("hidden");
    }
  };
});

// ORDENAMIENTO

sortSelect.onchange = ()=>{
  renderSchedules();
};

// ABRIR HORARIO

const backHomeBtn = document.querySelector("#app header button");


// VOLVER AL HOME

backHomeBtn.onclick = ()=>{
  appView.classList.remove("active");
  homeView.classList.add("active");
  currentScheduleIndex = null;
  renderSchedules();
};

renderSchedules();

function enforceMinZero(input){
  input.addEventListener("input", () => {
    if (input.value < 0) input.value = 0;
  });
}

enforceMinZero(document.getElementById("snackCostInput"));
enforceMinZero(document.getElementById("transportCostInput"));
enforceMinZero(document.getElementById("minGapMinutes"));

(async function initChangelog() {
  const data = await loadChangelog();
  if (data && Array.isArray(data) && data.length > 0) {
    checkChangelogVersion(data); // ✅ Ahora sí verifica
  }
})();

loadChangelog();

function getSubjectScheduleText(subject) {
  if (
    typeof subject.startMinutes !== "number" ||
    typeof subject.endMinutes !== "number"
  ) {
    return "Horario inválido";
  }

  const dayName = diasSemana[subject.day];
  const start = minutesToTime(subject.startMinutes);
  const end = minutesToTime(subject.endMinutes);

  return `${dayName} ${start} - ${end}`;
}

function buildSubjectsScheduleData() {
  if (currentScheduleIndex === null) return [];

  const map = {};

  const currentSchedule = schedules[currentScheduleIndex];

  currentSchedule.subjects.forEach(subject => {
    const scheduleText = getSubjectScheduleText(subject);

    const key = `${subject.name}||${subject.group}||${subject.program}||${subject.jornada}||${subject.color}`;

    if (!map[key]) {
      map[key] = {
      name: subject.name,
      group: subject.group || "",
      program: subject.program || "",
      times: []
      };
    }

    map[key].times.push(scheduleText);

  });

  return Object.values(map).map(item => ({
    name: item.name,
    schedule: item.times.join(" / "),
    group: item.group,
    program: item.program
  }));
}

function exportUniversityPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const headers = [[
    "Asignatura",
    "Horario",
    "Grupo",
    "Programa"
  ]];

  const body = buildSubjectsScheduleData().map(item => [
    item.name,
    item.schedule,
    item.group || "",
    item.program || ""
  ]);

  doc.autoTable({
    startY: 10,
    head: headers,
    body: body,
    styles: {
      fontSize: 10,
      cellPadding: 3,
      valign: "middle",
      halign: "left",
      lineWidth: 0.2,
      lineColor: [0, 0, 0],
      textColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: false,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineWidth: 0.3,
      lineColor: [0, 0, 0]
    },
    bodyStyles: {
      fillColor: false
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 80 },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 40 }
    },
    theme: "grid"
  });

  const fileName = "Formato_UdeC.pdf";
  doc.save(fileName);
}

// CONSTRUCCION TABLA

const monthSelect = document.getElementById("monthSelect");
const yearInput = document.getElementById("yearInput");

const snackInput = document.getElementById("snackCostInput");
const transportInput = document.getElementById("transportCostInput");
const gapInput = document.getElementById("minGapMinutes");
const resultadoAguinaldo = document.getElementById("monthlyResult");

[yearInput, snackInput, transportInput, gapInput].forEach(input => {
  input.addEventListener("input", updateCalculateButtonState);
});

function validateMonthlyInputs(showErrors = false){
  const fields = [
    {
      input: document.getElementById("yearInput"),
      error: document.getElementById("yearError"),
      validate: (val) => val !== "" && val >= 2020,
      errorMsg: "El año debe ser 2020 o mayor."
    },
    {
      input: document.getElementById("snackCostInput"),
      error: document.getElementById("snackError"),
      validate: (val) => val !== "" && val >= 0,
      errorMsg: "La merienda no puede ser negativa."
    },
    {
      input: document.getElementById("transportCostInput"),
      error: document.getElementById("transportError"),
      validate: (val) => val !== "" && val >= 0,
      errorMsg: "El transporte no puede ser negativo."
    },
    {
      input: document.getElementById("minGapMinutes"),
      error: document.getElementById("gapError"),
      validate: (val) => val !== "" && val >= 0,
      errorMsg: "Los minutos mínimos no pueden ser negativos."
    }
  ];

  let valid = true;

  fields.forEach(field => {
    if(showErrors){
      field.input.classList.remove("input-error");
      field.error.textContent = "";
    }

    if(!field.validate(field.input.value)){
      if(showErrors){
        field.input.classList.add("input-error");
        field.error.textContent = field.errorMsg;
      }
      valid = false;
    }
  });

  return valid;
}

function updateCalculateButtonState(){
  const isValid = validateMonthlyInputs(false);
  confirmMonthlyBtn.disabled = !isValid;
}

function getCalculationConfig() {
  return {
    minGapMinutes: Number(gapInput.value) || 0,
    transportCost: Number(transportInput.value) || 0,
    snackCost: Number(snackInput.value) || 0,
    year: Number(yearInput.value),
    month: Number(monthSelect.value)
  };
}

function saveCalculationConfig(config) {
  const excludedDaysArray = Array.from(excludedDaysSet);
  
  localStorage.setItem("lastCalculationConfig", JSON.stringify({
    minGapMinutes: config.minGapMinutes,
    transportCost: config.transportCost,
    snackCost: config.snackCost,
    year: config.year,
    month: config.month,
    excludedDays: excludedDaysArray
  }));
}

const excludedDaysSet = new Set();

function openCalendarModal() {
  const year = parseInt(yearInput.value) || new Date().getFullYear();
  const month = parseInt(monthSelect.value);
  
  document.getElementById("excludeDaysModal").classList.add("active");
  generateExcludeDaysCalendar(year, month);
}

function closeCalendarModal() {
  document.getElementById("excludeDaysModal").classList.remove("active");
}

document.getElementById("openCalendarBtn").onclick = openCalendarModal;
document.getElementById("backToAguinaldoBtn").onclick = closeCalendarModal;

let dailyDetailData = null;

function openDailyDetailModal() {
  const detailContent = document.getElementById("monthlyDetailContent");
  
  detailContent.innerHTML = `
    <ul>
      ${dailyDetailData.map(d => {
        const monthName = d.date.toLocaleDateString('es-ES', { month: 'long' });
        return `
          <li>
            <div class="day-info">
              <strong>${d.dayName}</strong>
              <span class="day-date">${d.date.getDate()} de ${monthName}</span>
            </div>
            <div class="trip-info">
              <div class="trip-count">${d.trips} viaje${d.trips !== 1 ? "s" : ""}</div>
              ${d.hasGaps ? "<div class='gap-flag'>Hueco</div>" : ""}
            </div>
          </li>
        `;
      }).join("")}
    </ul>
  `;
  
  document.getElementById("dailyDetailModal").classList.add("active");
}

function closeDailyDetailModal() {
  document.getElementById("dailyDetailModal").classList.remove("active");
}

document.getElementById("viewDailyDetailBtn").onclick = openDailyDetailModal;
document.getElementById("backToResultBtn").onclick = closeDailyDetailModal;

function generateExcludeDaysCalendar(year, month) {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";
  
  const daysOfWeek = ["L", "M", "M", "J", "V", "S", "D"];
  daysOfWeek.forEach(day => {
    const header = document.createElement("div");
    header.className = "calendar-day-header";
    header.textContent = day;
    grid.appendChild(header);
  });
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  let startDayOfWeek = firstDay.getDay();
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyDay = document.createElement("div");
    grid.appendChild(emptyDay);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";
    dayElement.textContent = day;
    
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0) {
      dayElement.classList.add("calendar-day-disabled");
      dayElement.title = "Domingo";
    } else if (isHolyWeek(date)) {
      dayElement.classList.add("calendar-day-holyweek");
      dayElement.title = "Semana Santa";
    } else if (isHoliday(date)) {
      dayElement.classList.add("calendar-day-holiday");
      dayElement.title = "Festivo nacional";
    } else {
      if (excludedDaysSet.has(dateString)) {
        dayElement.classList.add("calendar-day-excluded");
      }
      
      dayElement.onclick = () => {
        if (excludedDaysSet.has(dateString)) {
          excludedDaysSet.delete(dateString);
          dayElement.classList.remove("calendar-day-excluded");
        } else {
          excludedDaysSet.add(dateString);
          dayElement.classList.add("calendar-day-excluded");
        }
        updateExcludedDaysCount();
        
        const currentConfig = getCalculationConfig();
        saveCalculationConfig(currentConfig);
      };
    }
    
    grid.appendChild(dayElement);
  }
  
  updateExcludedDaysCount();
}

function updateExcludedDaysCount() {
  const count = excludedDaysSet.size;
  const countElement = document.getElementById("excludeDaysCount");
  
  if (count === 0) {
    countElement.textContent = "Ningún día excluido";
  } else {
    countElement.textContent = `${count} día${count !== 1 ? 's' : ''} excluido${count !== 1 ? 's' : ''}`;
  }
}

function loadCalculationConfig() {
  const saved = localStorage.getItem("lastCalculationConfig");
  if (!saved) return null;
  
  try {
    const config = safeJSONParse(saved, {});
    
    if (config.excludedDays && Array.isArray(config.excludedDays)) {
      excludedDaysSet.clear();
      config.excludedDays.forEach(day => excludedDaysSet.add(day));
    }
    
    return config;
  } catch (e) {
    console.error("Error al cargar configuración guardada:", e);
    return null;
  }
}

function calculateMonthlyCost(subjects, config) {

  const dailyMap = buildDailySubjects(subjects);

  let totalTrips = 0;
  let totalSnackDays = 0;
  const dailyDetails = [];

  const date = new Date(config.year, config.month, 1);

  while (date.getMonth() === config.month) {

    const jsDay = date.getDay();
    const dayIndex = jsDay - 1;

    if (dayIndex >= 0 && dayIndex <= 5 && !isHoliday(date)) {
      
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1)
        .padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (excludedDaysSet.has(dateString)) {
        date.setDate(date.getDate() + 1);
        continue;
      }
      
      const subjectsToday = dailyMap[dayIndex];

      if (subjectsToday && subjectsToday.length > 0) {

        const trips = calculateTripsForDay(
          subjectsToday,
          config.minGapMinutes
        );

        const hasGaps =
          config.minGapMinutes > 0 &&
          ScheduleTimeModel.calculateGaps(
            subjectsToday,
            config.minGapMinutes
          ) > 0;

        totalTrips += trips;
        totalSnackDays++;

        dailyDetails.push({
          date: new Date(date),
          dayName: diasSemana[dayIndex],
          trips,
          hasGaps
        });
      }
    }

    date.setDate(date.getDate() + 1);
  }

  const totalCost =
    totalTrips * config.transportCost +
    totalSnackDays * config.snackCost;

  return {
    totalTrips,
    totalSnackDays,
    totalCost,
    dailyDetails
  };
}

const confirmMonthlyBtn = document.getElementById("confirmMonthlyBtn");

const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

function populateMonths(){
  monthSelect.innerHTML = "";

  months.forEach((month, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = month;
    monthSelect.appendChild(option);
  });

  const today = new Date();
  monthSelect.value = today.getMonth();
  yearInput.value = today.getFullYear();
}

populateMonths();

const subjectModal = document.getElementById("subjectModal");
const subjectNameInput = subjectModal.querySelector("input[type='text']");
const subjectGroupInput = document.getElementById("subjectGroupInput");
const subjectProgramInput = document.getElementById("subjectProgramInput");
const subjectCreditsInput = document.getElementById("subjectCreditsInput");
const subjectColorInput = document.getElementById("subjectColorPicker");
const colorPreview = document.getElementById("colorPreview");
const subjectBlocksInput = subjectModal.querySelector("select");
const saveSubjectBtn = subjectModal.querySelector("button:not(.close-btn)");

function cleanSubjectModalButtons(){
  ["#deleteSubjectBtn", "#duplicateSubjectBtn"].forEach(id=>{
    const btn = subjectModal.querySelector(id);
    if(btn) btn.remove();
  });
}

function openSubjectModal(row, col){

  state.cancelDuplication();

  const cell = editorState.cellMatrix[row][col];

  if(cell.element.classList.contains("blocked")){
    clearCurrentCell();
    return;
  }

  setCurrentCell(row, col);
  editorState.editingSubjectIndex = null;

  subjectNameInput.value = "";
  subjectGroupInput.value = "";
  subjectProgramInput.value = "";
  subjectCreditsInput.value = "";
  subjectColorInput.value = "#1d4ed8";
  colorPreview.style.background = subjectColorInput.value;
  subjectBlocksInput.value = "1";
  
  document.getElementById("showCreditsCheckbox").checked = false;
  document.getElementById("showGroupCheckbox").checked = false;
  document.getElementById("showProgramCheckbox").checked = false;
  
  saveSubjectBtn.textContent = "Guardar asignatura";

  cleanSubjectModalButtons();
  subjectModal.classList.add("active");
}

function buildScheduleTable() {
  if (currentScheduleIndex === null) return;
  rebuildScheduleView();
}

calculateBtn.onclick = () => {

  if (currentScheduleIndex === null) {
    alert("Abre un horario primero.");
    return;
  }

  const savedConfig = loadCalculationConfig();
  
  if (savedConfig) {
    if (savedConfig.year) yearInput.value = savedConfig.year;
    if (savedConfig.month !== undefined) monthSelect.value = savedConfig.month;
    if (savedConfig.snackCost !== undefined) snackInput.value = savedConfig.snackCost;
    if (savedConfig.transportCost !== undefined) transportInput.value = savedConfig.transportCost;
    if (savedConfig.minGapMinutes !== undefined) gapInput.value = savedConfig.minGapMinutes;
  }

  monthlyModal.classList.add("active");
  monthlyResult.style.display = "none";
  updateCalculateButtonState();
};

confirmMonthlyBtn.onclick = () => {

  if (!validateMonthlyInputs(true)) return;

  const config = getCalculationConfig();

  const subjects = normalizeSubjectsForCalculation(
    schedules[currentScheduleIndex].subjects
  );

  const result = calculateMonthlyCost(subjects, config);

  if (!result) return;

  saveCalculationConfig(config);

  monthlyResult.style.display = "block";

  resultadoAguinaldo.innerHTML = `
    <div class="aguinaldo-layout">
      
      <div class="aguinaldo-main">
        <p><strong>Total viajes:</strong> ${result.totalTrips}</p>
        <p><strong>Días con clase:</strong> ${result.totalSnackDays}</p>
        <p><strong>Total aguinaldo:</strong> $${result.totalCost.toLocaleString()}</p>

        <button type="button" id="openDetailBtn" style="
          background: transparent;
          border: none;
          color: #000;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
          float: right;
          margin-top: 8px;
        ">Ver detalle por día →</button>
      </div>

    </div>
  `;

  dailyDetailData = result.dailyDetails;

  setTimeout(() => {
    const detailBtn = document.getElementById("openDetailBtn");
    if (detailBtn) {
      detailBtn.onclick = openDailyDetailModal;
    }
  }, 0);
};

// MODAL ASIGNATURA

const CELL_HEIGHT = 60;

function highlightCurrentCell(subject = null) {

  document
    .querySelectorAll(".cell.active-root")
    .forEach(c => {
      c.classList.remove("active-root");
      c.style.removeProperty("--active-height");
    });

  if (subject) {
    const rootCell =
      editorState.cellMatrix[subject.row]?.[subject.col];

    if (rootCell) {
      rootCell.element.classList.add("active-root");
      rootCell.element.style.setProperty(
        "--active-height",
        `${subject.blocks * CELL_HEIGHT}px`
      );
    }
    return;
  }

  if (!hasCurrentCell()) return;

  const { row, col } = editorState.currentCell;
  const cell = editorState.cellMatrix[row]?.[col];

  if (cell) {
    cell.element.classList.add("active-root");
    cell.element.style.setProperty(
      "--active-height",
      `${CELL_HEIGHT}px`
    );
  }
}

function setCurrentCell(row, col){
  if (typeof row !== "number" || typeof col !== "number" || row < 0 || col < 0){

    clearCurrentCell();
    return;

  }

  editorState.currentCell = { row, col };
  highlightCurrentCell();
}

function clearCurrentCell(){
  editorState.currentCell = null;

  document
    .querySelectorAll(".cell.active-root")
    .forEach(c => {
      c.classList.remove("active-root");
      c.style.removeProperty("--active-height");
    });
}

function hasCurrentCell(){
  return editorState.currentCell !== null;
}

function createDeleteButton(){
  const deleteBtn = document.createElement("button");
  deleteBtn.id = "deleteSubjectBtn";
  deleteBtn.textContent = "Eliminar asignatura";
  deleteBtn.style.background = "#b00020";
  deleteBtn.style.marginTop = "6px";
  deleteBtn.onclick = deleteSubject;
  return deleteBtn;
}

function createDuplicateButton(subject){
  const duplicateBtn = document.createElement("button");
  duplicateBtn.id = "duplicateSubjectBtn";
  duplicateBtn.textContent = "Duplicar asignatura";
  duplicateBtn.style.background = "#0066cc";
  duplicateBtn.style.marginTop = "6px";
  duplicateBtn.onclick = () => duplicateSubject(subject);
  return duplicateBtn;
}

function openEditSubjectModal(subject){

  state.cancelDuplication();
  removeGhostSubject();

  editorState.editingSubjectIndex = schedules[currentScheduleIndex].subjects.findIndex(
    s => s.id === subject.id
  );

  setCurrentCell(subject.row, subject.col);

  subjectNameInput.value = subject.name;
  subjectGroupInput.value = subject.group || "";
  subjectProgramInput.value = subject.program || "";
  subjectCreditsInput.value = subject.credits || "";
  subjectColorInput.value = subject.color;
  colorPreview.style.background = subject.color;
  subjectBlocksInput.value = subject.blocks;

  document.getElementById("showCreditsCheckbox").checked = subject.showCredits || false;
  document.getElementById("showGroupCheckbox").checked = subject.showGroup || false;
  document.getElementById("showProgramCheckbox").checked = subject.showProgram || false;

  subjectModal.classList.add("active");
  saveSubjectBtn.textContent = "Guardar cambios";

  const modalContent = subjectModal.querySelector(".modal-content");

  const oldDelete = modalContent.querySelector("#deleteSubjectBtn");
  if(oldDelete) oldDelete.remove();

  const oldDuplicate = modalContent.querySelector("#duplicateSubjectBtn");
  if(oldDuplicate) oldDuplicate.remove();

  modalContent.appendChild(createDeleteButton());
  modalContent.appendChild(createDuplicateButton(subject));

  highlightCurrentCell(subject);
}

subjectColorInput.oninput = () => {
  colorPreview.style.background = subjectColorInput.value;
};

// GUARDAR ASIGNATURA

const ScheduleLogic = {

  canPlaceSubject({ schedule, row, col, blocks, jornada, excludeSubject }) {
    for (let i = 0; i < blocks; i++) {
      const r = row + i;

      const conflict = schedule.subjects.some(s => {
        if (excludeSubject && s.id === excludeSubject.id) return false;

        if (s.col !== col) return false;
        if (s.jornada !== jornada) return false;

        return r >= s.row && r < s.row + s.blocks;
      });

      if (conflict) return false;
    }
    return true;
  },

  exceedsJornadaLimit({ row, blocks, jornadaRowsLength }) {
    return row + blocks > jornadaRowsLength;
  }

};

const ScheduleTimeModel = {

  getSubjectTimeRange(subject) {
    if (
      typeof subject.startMinutes === "number" &&
      typeof subject.endMinutes === "number"
    ) {
      return {
        startMinutes: subject.startMinutes,
        endMinutes: subject.endMinutes
      };
    }

    const pure = getTimeRangePure(subject);
    if (pure) return pure;

    console.warn("[TimeModel] No se pudo calcular tiempo", subject);
    return null;
  },

  getScheduleDayTimeline(schedule, day, jornada) {
    return schedule.subjects
      .filter(s => s.day === day && s.jornada === jornada)
      .map(s => {
        const range = this.getSubjectTimeRange(s);
        if (!range) return null;

        return {
          id: s.id,
          startMinutes: range.startMinutes,
          endMinutes: range.endMinutes
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.startMinutes - b.startMinutes);
  },

  calculateGaps(timeline, minGapMinutes) {
    let gaps = 0;

    for (let i = 1; i < timeline.length; i++) {
      const gap =
        timeline[i].startMinutes -
        timeline[i - 1].endMinutes;

      if (gap >= minGapMinutes) {
        gaps++;
      }
    }
    return gaps;
  }
};

function isCellOccupied(schedule, row, col, blocks, excludeSubject, jornada) {
  return !ScheduleLogic.canPlaceSubject({
    schedule,
    row,
    col,
    blocks,
    jornada,
    excludeSubject
  });
}

saveSubjectBtn.onclick = () => {

  if(!hasCurrentCell()){
    alert("Primero selecciona una celda del horario.");
    return;
  }

  if(currentScheduleIndex === null) return;

  const name = subjectNameInput.value.trim();
  const color = subjectColorInput.value;
  const blocks = parseInt(subjectBlocksInput.value);

  if(!name) return alert("Nombre obligatorio");

  let editingSubject = null;
  const currentSchedule = schedules[currentScheduleIndex];

  if (editorState.editingSubjectIndex !== null) {
    editingSubject = currentSchedule.subjects.splice(
      editorState.editingSubjectIndex,
      1
    )[0];
    editorState.editingSubjectIndex = null;
  }

  const targetCell =
    editorState.cellMatrix[editorState.currentCell.row][editorState.currentCell.col];

  const jornada = targetCell.jornada;

  let lastValidRow = -1;

  for (let r = editorState.currentCell.row; r < editorState.cellMatrix.length; r++) {
    if (editorState.cellMatrix[r][0]?.jornada === jornada) {
      lastValidRow = r;
    }
  }

  let lastRowOfJornada = -1;

  for (let r = 0; r < editorState.cellMatrix.length; r++) {
    if (editorState.cellMatrix[r][0]?.jornada === jornada) {
      lastRowOfJornada = r;
    }
  }

  if (editorState.currentCell.row + blocks - 1 > lastRowOfJornada) {
    alert("La asignatura excede el horario disponible");
    return;
  }

 if (isCellOccupied(
  currentSchedule,
  editorState.currentCell.row,
  editorState.currentCell.col,
  blocks,
  editingSubject,
  jornada
  )){

    if (editingSubject) {
      currentSchedule.subjects.push(editingSubject);
    }

    alert("Ese espacio ya está ocupado por otra asignatura");
    resetSubjectModalState();
    return;
  }

  const startCell = editorState.cellMatrix[editorState.currentCell.row][editorState.currentCell.col];
  const endCell = editorState.cellMatrix[editorState.currentCell.row + blocks - 1][editorState.currentCell.col];

  const startMinutes = startCell.startMinutes;
  const endMinutes = endCell.endMinutes;

  const credits = subjectCreditsInput.value.trim() 
    ? parseInt(subjectCreditsInput.value) 
    : 0;

  const showCredits = document.getElementById("showCreditsCheckbox").checked;
  const showGroup = document.getElementById("showGroupCheckbox").checked;
  const showProgram = document.getElementById("showProgramCheckbox").checked;

  const newSubject = {
    id: editingSubject ? editingSubject.id : crypto.randomUUID(),
    name,
    color,
    row: editorState.currentCell.row,
    col: editorState.currentCell.col,
    day: editorState.currentCell.col,
    blocks,
    group: subjectGroupInput.value.trim(),
    program: subjectProgramInput.value.trim(),
    credits,
    jornada,
    startMinutes,
    endMinutes,
    showCredits: showCredits,
    showGroup: showGroup,
    showProgram: showProgram
  };

  schedules[currentScheduleIndex].subjects.push(newSubject);


  saveData();
  subjectModal.classList.remove("active");
  clearCurrentCell();
  editorState.editingSubjectIndex = null;
  saveSubjectBtn.textContent = "Guardar asignatura";

  cleanSubjectModalButtons();

  const duplicateBtn = subjectModal.querySelector("#duplicateSubjectBtn");
  if(duplicateBtn) duplicateBtn.remove();

  rebuildScheduleView();
  updateScheduleInfo();
};

function deleteSubject(){

  if(editorState.editingSubjectIndex === null) return;

  const currentSchedule = schedules[currentScheduleIndex];
  currentSchedule.subjects.splice(editorState.editingSubjectIndex, 1);
  saveData();

  subjectModal.classList.remove("active");
  clearCurrentCell();
  editorState.editingSubjectIndex = null;
  saveSubjectBtn.textContent = "Guardar asignatura";

  cleanSubjectModalButtons();

  const duplicateBtn = subjectModal.querySelector("#duplicateSubjectBtn");
  if(duplicateBtn) duplicateBtn.remove();

  rebuildScheduleView();
  updateScheduleInfo();
}

function duplicateSubject(subject){
  subjectModal.classList.remove("active");

  state.startDuplication({
    name: subject.name,
    color: subject.color,
    blocks: subject.blocks,
    group: subject.group || "",
    program: subject.program || "",
    credits: subject.credits || 0,
    jornada: subject.jornada,
    showCredits: subject.showCredits || false,
    showGroup: subject.showGroup || false,
    showProgram: subject.showProgram || false
  });

  editorState.editingSubjectIndex = null;
  clearCurrentCell();
}

setDuplicateCursor(false);

function placeDuplicatedSubject(row, col){

  if(!editorState.duplicatingSubject) return;

  setCurrentCell(row, col);

  const blocks = editorState.duplicatingSubject.blocks;
  const maxRows = editorState.cellMatrix.length;

  if(row + blocks > maxRows){
    alert("La asignatura excede el horario disponible");
    resetSubjectModalState();
    return;
  }

  const targetCell = editorState.cellMatrix[row][col];

  if(isCellOccupied(
    schedules[currentScheduleIndex],
    row,
    col,
    blocks,
    null,
    targetCell.jornada
  )){
    alert("Ese espacio ya está ocupado por otra asignatura");
    resetSubjectModalState();
    return;
  }

  const startCell = editorState.cellMatrix[row][col];
  const endCell = editorState.cellMatrix[row + blocks - 1][col];

  const startMinutes = startCell.startMinutes;
  const endMinutes = endCell.endMinutes;

  const newSubject = {
    id: crypto.randomUUID(),
    name: editorState.duplicatingSubject.name,
    color: editorState.duplicatingSubject.color,
    row,
    col,
    day: col,
    blocks,
    group: editorState.duplicatingSubject.group || "",
    program: editorState.duplicatingSubject.program || "",
    credits: editorState.duplicatingSubject.credits || 0,
    jornada: targetCell.jornada,
    startMinutes,
    endMinutes,
    showCredits: editorState.duplicatingSubject.showCredits || false,
    showGroup: editorState.duplicatingSubject.showGroup || false,
    showProgram: editorState.duplicatingSubject.showProgram || false
  };

  schedules[currentScheduleIndex].subjects.push(newSubject);

  saveData();
  rebuildScheduleView();
  updateScheduleInfo();
  resetSubjectModalState();
}

// DIBUJAR ASIGNATURAS

function getSubjectPixelHeight(subject){
  return subject.blocks * CELL_HEIGHT;
}

function syncSubjectsWithGrid() {
  const schedule = schedules[currentScheduleIndex];
  if (!schedule) return;

  schedule.subjects.forEach(sub => {
    if (
      typeof sub.row === "number" &&
      typeof sub.col === "number"
    ) return;

    for (let r = 0; r < editorState.cellMatrix.length; r++) {
      const cell = editorState.cellMatrix[r][sub.day];
      if (
        cell &&
        cell.startMinutes === sub.startMinutes &&
        cell.jornada === sub.jornada
      ) {
        sub.row = r;
        sub.col = sub.day;
        break;
      }
    }
  });
}

// RENDER SUBJECTS

function renderSubjects() {
  if (currentScheduleIndex === null) return;
  
  removeDeletedSubjects();
  updateExistingSubjects();
}


function removeDeletedSubjects() {
  const currentSchedule = schedules[currentScheduleIndex];
  const currentSubjects = new Map(
    currentSchedule.subjects.map(s => [s.id, s])
  );
  
  renderCache.renderedSubjects.forEach((cachedSub, id) => {
    if (!currentSubjects.has(id)) {
      removeSubjectFromDOM(id);
      clearBlockedCells(cachedSub);
      renderCache.renderedSubjects.delete(id);
    }
  });
}

function updateExistingSubjects() {
  const currentSchedule = schedules[currentScheduleIndex];
  
  currentSchedule.subjects.forEach(sub => {
    if (needsRerender(sub)) {
      renderSingleSubject(sub);
    }
  });
}

function needsRerender(subject) {
  const cached = renderCache.renderedSubjects.get(subject.id);
  
  if (!cached) return true;
  
  return (
    cached.name !== subject.name ||
    cached.color !== subject.color ||
    cached.row !== subject.row ||
    cached.col !== subject.col ||
    cached.blocks !== subject.blocks ||
    cached.jornada !== subject.jornada ||
    cached.credits !== subject.credits ||
    cached.group !== subject.group ||
    cached.program !== subject.program ||
    cached.showCredits !== subject.showCredits ||
    cached.showGroup !== subject.showGroup ||
    cached.showProgram !== subject.showProgram
  );
}

function renderSingleSubject(subject) {
  removeExistingElement(subject.id);
  
  const cached = renderCache.renderedSubjects.get(subject.id);
  if (cached && cached.blocks) {
    clearBlockedCells(cached);
  }

  const baseCell = editorState.cellMatrix[subject.row]?.[subject.col];
  if (!baseCell || baseCell.jornada !== subject.jornada) return;
  
  const subjectElement = createSubjectElement(subject);
  
  blockCoveredCells(subject);
  
  baseCell.element.appendChild(subjectElement);
  
  renderCache.renderedSubjects.set(subject.id, {...subject});
}

function createSubjectElement(subject) {
  const div = document.createElement("div");
  div.className = "subject";
  div.setAttribute("data-subject-id", subject.id);
  div.style.position = "absolute";
  div.style.top = "0px";
  div.style.left = "0px";
  div.style.width = "100%";
  div.style.height = (subject.blocks * 60) + "px";
  div.style.boxSizing = "border-box";

  const content = createSubjectContent(subject);
  div.appendChild(content);
  
  div.onclick = (e) => {
    e.stopPropagation();
    if (state.isDuplicating()) {
      state.cancelDuplication();
      return;
    }
    openEditSubjectModal(subject);
  };
  
  return div;
}

function createSubjectContent(subject) {
  const content = document.createElement("div");
  content.className = "subject-content";
  content.style.background = subject.color;
  
  // Nombre
  const nameDiv = document.createElement("div");
  nameDiv.textContent = subject.name;
  content.appendChild(nameDiv);
  
  // Programa
  if (subject.showProgram && subject.program) {
    const programDiv = document.createElement("div");
    programDiv.className = "subject-program";
    programDiv.textContent = subject.program;
    content.appendChild(programDiv);
  }
  
  // Grupo
  if (subject.showGroup && subject.group) {
    const groupSpan = document.createElement("span");
    groupSpan.className = "subject-info subject-group";
    groupSpan.textContent = subject.group;
    content.appendChild(groupSpan);
  }
  
  // Creditos
  if (subject.showCredits && subject.credits) {
    const creditsSpan = document.createElement("span");
    creditsSpan.className = "subject-info subject-credits";
    creditsSpan.textContent = `${subject.credits} cr`;
    content.appendChild(creditsSpan);
  }
  
  return content;
}

function removeSubjectFromDOM(subjectId) {
  const element = document.querySelector(`[data-subject-id="${subjectId}"]`);
  if (element) element.remove();
}

function removeExistingElement(subjectId) {
  const existingElement = document.querySelector(`[data-subject-id="${subjectId}"]`);
  if (existingElement) existingElement.remove();
}

function clearBlockedCells(subject) {
  for (let i = 1; i < subject.blocks; i++) {
    const coveredCell = editorState.cellMatrix[subject.row + i]?.[subject.col];
    if (coveredCell) {
      coveredCell.element.classList.remove("blocked");
      coveredCell.element.style.borderTop = "1px solid #000";
    }
  }
}

function blockCoveredCells(subject) {
  for (let i = 1; i < subject.blocks; i++) {
    const coveredCell = editorState.cellMatrix[subject.row + i]?.[subject.col];
    if (coveredCell) {
      coveredCell.element.classList.add("blocked");
      coveredCell.element.style.borderTop = "none";
    }
  }
}

function updateScheduleInfo() {
  if (currentScheduleIndex === null) return;

  const currentSchedule = schedules[currentScheduleIndex];
  
  const uniqueSubjects = new Map();
  
  currentSchedule.subjects.forEach(subject => {
    const key = subject.name.trim().toLowerCase();
    
    if (!uniqueSubjects.has(key)) {
      uniqueSubjects.set(key, {
        name: subject.name,
        credits: subject.credits || 0
      });
    }
  });
  
  const uniqueCount = uniqueSubjects.size;
  const totalCredits = Array.from(uniqueSubjects.values()).reduce((sum, subject) => {
    return sum + subject.credits;
  }, 0);

  const subjectText = uniqueCount === 1 ? "asignatura" : "asignaturas";
  const creditText = totalCredits === 1 ? "crédito" : "créditos";

  document.getElementById("subjectCountInfo").textContent = 
    `${uniqueCount} ${subjectText}`;
  document.getElementById("totalCreditsInfo").textContent = 
    `${totalCredits} ${creditText}`;
}

function getEasterDate(year){
  const f = Math.floor,
        G = year % 19,
        C = f(year / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        month = 3 + f((L + 40) / 44),
        day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

function moveToMonday(date){
  const day = date.getDay();
  if(day === 1) return date;
  const diff = (8 - day) % 7;
  date.setDate(date.getDate() + diff);
  return date;
}

function generateColombianHolidays(year){
  const holidays = [];

  holidays.push(new Date(year, 4, 1));  // Día del Trabajo (1 de mayo)
  holidays.push(new Date(year, 6, 20)); // Independencia
  holidays.push(new Date(year, 7, 7));  // Batalla de Boyacá
  holidays.push(new Date(year, 11, 8)); // Inmaculada Concepción
  holidays.push(new Date(year, 11, 25)); // Navidad
  holidays.push(new Date(year, 0, 1)); // Año Nuevo

  holidays.push(moveToMonday(new Date(year, 0, 6))); // Epifanía
  holidays.push(moveToMonday(new Date(year, 2, 19))); // San José
  holidays.push(moveToMonday(new Date(year, 5, 29))); // San Pedro y San Pablo
  holidays.push(moveToMonday(new Date(year, 7, 15))); // Asunción
  holidays.push(moveToMonday(new Date(year, 9, 12))); // Día de la Raza
  holidays.push(moveToMonday(new Date(year, 10, 1))); // Todos los Santos
  holidays.push(moveToMonday(new Date(year, 10, 11))); // Independencia de Cartagena

  const easter = getEasterDate(year);

  // Semana Santa

  for (let i = 6; i >= 1; i--) {
    const holyWeekDay = new Date(easter);
    holyWeekDay.setDate(easter.getDate() - i);
    holidays.push(holyWeekDay);
  }

  const ascension = moveToMonday(new Date(easter.getTime() + 43 * 86400000));
  const corpusChristi = moveToMonday(new Date(easter.getTime() + 64 * 86400000));
  const sacredHeart = moveToMonday(new Date(easter.getTime() + 71 * 86400000));

  holidays.push(ascension);
  holidays.push(corpusChristi);
  holidays.push(sacredHeart);

  return holidays;
}

let holidayCache = {};

function isHoliday(date){
  const year = date.getFullYear();

  if(!holidayCache[year]){
    holidayCache[year] = generateColombianHolidays(year);
  }

  return holidayCache[year].some(h =>
    h.toDateString() === date.toDateString()
  );
}

function isHolyWeek(date) {
  const year = date.getFullYear();
  
  if (!holidayCache[year]) {
    holidayCache[year] = generateColombianHolidays(year);
  }
  
  const easter = getEasterDate(year);

  for (let i = 6; i >= 4; i--) {
    const holyDay = new Date(easter);
    holyDay.setDate(easter.getDate() - i);
    if (holyDay.toDateString() === date.toDateString()) {
      return true;
    }
  }
  
  const holySaturday = new Date(easter);
  holySaturday.setDate(easter.getDate() - 1);
  if (holySaturday.toDateString() === date.toDateString()) {
    return true;
  }
  
  return false;
}

function buildDailySubjects(subjects) {

  const map = {};

  subjects.forEach(s => {
    const key = s.day;
    if (!map[key]) map[key] = [];
    map[key].push({
      startMinutes: s.startMinutes,
      endMinutes: s.endMinutes,
      jornada: s.jornada
    });
  });

  Object.values(map).forEach(list =>
    list.sort((a, b) => a.startMinutes - b.startMinutes)
  );

  return map;
}

function calculateTripsForDay(subjectsOfDay, minGapMinutes) {

  if (!subjectsOfDay || subjectsOfDay.length === 0) return 0;

  let trips = 1;

  if (minGapMinutes <= 0) return trips;

  for (let i = 0; i < subjectsOfDay.length - 1; i++) {
    const current = subjectsOfDay[i];
    const next = subjectsOfDay[i + 1];

    const gap = next.startMinutes - current.endMinutes;

    const bothNocturnal =
      current.jornada === "nocturna" &&
      next.jornada === "nocturna";

    if (bothNocturnal) continue;

    if (gap >= minGapMinutes) {
      trips++;
    }
  }

  return trips;
}

// EXPORTAR JSON

document.getElementById("exportScheduleBtn").onclick = () => {

  if (currentScheduleIndex === null) {
    alert("Abre un horario primero.");
    return;
  }

  const currentSchedule = schedules[currentScheduleIndex];
  
  const jsonString = safeJSONStringify([currentSchedule], '[]');

  if (jsonString === '[]') {
    alert("Error al exportar el horario");
    return;
  }
  
  const blob = new Blob([jsonString], { type: "application/json" });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  
  const fileName = currentSchedule.name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
  
  link.download = `${fileName}.json`;
  
  link.click();
  
  URL.revokeObjectURL(url);
};

document.getElementById("importSchedulesBtn").onclick = () => {
  document.getElementById("importFileInput").click();
};

document.getElementById("importFileInput").onchange = (e) => {
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const backup = JSON.parse(JSON.stringify(schedules));
    
    try {

      let imported = safeJSONParse(event.target.result);

      if (!imported) {
        alert("Archivo JSON inválido o corrupto");
        return;
      }

      if(!Array.isArray(imported)) {
        imported = [imported];
      }

      const validationErrors = [];
      const validSchedules = [];

      imported.forEach((schedule, index) => {
        const error = validateScheduleSchema(schedule);
        
        if(error) {
          validationErrors.push(`Horario #${index + 1}: ${error}`);
          return;
        }

        if(Array.isArray(schedule.subjects)) {
          schedule.subjects = schedule.subjects.map(normalizeSubject);
        }

        const exists = schedules.some(s =>
          s.name === schedule.name && s.created === schedule.created
        );

        if(!exists) {
          validSchedules.push(schedule);
        }
      });

      if(validationErrors.length > 0) {
        throw new Error(
          `Se encontraron ${validationErrors.length} error(es):\n\n${validationErrors.join('\n')}`
        );
      }

      if(validSchedules.length === 0) {
        alert("No hay horarios nuevos para importar (ya existen todos).");
        document.getElementById("importFileInput").value = "";
        return;
      }

      validSchedules.forEach(schedule => {
        schedules.push(schedule);
      });

      saveData();
      renderSchedules();

      if(currentScheduleIndex !== null) {
        rebuildScheduleView();
      }

      alert(`${validSchedules.length} horario(s) importado(s) correctamente.`);
      document.getElementById("importFileInput").value = "";
    } 
    catch(err) {
      schedules.length = 0;
      schedules.push(...backup);
      
      if(err instanceof SyntaxError) {
        alert("Error: El archivo JSON está corrupto o mal formado.");
      } else {
        alert(`${err.message}`);
      }
      
      console.error("Error de importación:", err);
      document.getElementById("importFileInput").value = "";
    }
  };

  reader.readAsText(file);
}

document.getElementById("exportBtn").onclick = () => {
  if (currentScheduleIndex === null) return;
  document.getElementById("exportImageModal").classList.add("active");
};

document.getElementById("confirmExportImageBtn").onclick = () => {
  const includeDiurna = document.getElementById("exportDiurna").checked;
  const includeNocturna = document.getElementById("exportNocturna").checked;
  
  if (!includeDiurna && !includeNocturna) {
    alert("Selecciona al menos una jornada para exportar");
    return;
  }
  
  exportImageWithOptions(includeDiurna, includeNocturna);
  document.getElementById("exportImageModal").classList.remove("active");
};

function exportImageWithOptions(includeDiurna, includeNocturna) {
  const target = document.getElementById("scheduleContainer");
  const scheduleName = schedules[currentScheduleIndex].name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();

  const allRows = Array.from(document.querySelectorAll("#schedule tbody tr"));
  const hiddenRows = [];
  
  let inDiurna = false;
  let inNocturna = false;

  allRows.forEach(row => {
    const firstCell = row.querySelector("td");
    if (!firstCell) return;

    const cellText = firstCell.textContent.trim();
    
    if (cellText === "JORNADA DIURNA") {
      inDiurna = true;
      inNocturna = false;
      if (!includeDiurna) {
        row.style.display = "none";
        hiddenRows.push(row);
      }
      return;
    }
    
    if (cellText === "JORNADA NOCTURNA") {
      inDiurna = false;
      inNocturna = true;
      if (!includeNocturna) {
        row.style.display = "none";
        hiddenRows.push(row);
      }
      return;
    }

    if (inDiurna && !includeDiurna) {
      row.style.display = "none";
      hiddenRows.push(row);
    }
    
    if (inNocturna && !includeNocturna) {
      row.style.display = "none";
      hiddenRows.push(row);
    }
  });

  html2canvas(target, {
    backgroundColor: "#ffffff",
    scale: 2
  }).then(canvas => {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${scheduleName}.png`;
    link.click();

    hiddenRows.forEach(row => row.style.display = "");
  }).catch(err => {
    console.error("Error al exportar imagen:", err);
    hiddenRows.forEach(row => row.style.display = "");
    alert("Error al generar la imagen");
  });
}

// EXPORTAR FORMATO UdeC

document.getElementById("exportPdfBtn").addEventListener("click", exportUniversityPDF);

// EXPORTAR IMAGEN

if(currentScheduleIndex !== null){
  rebuildScheduleView();
}

document.addEventListener("keydown", (e) => {

  if (e.key === "Escape") {
    if (state.isDuplicating()) {
      state.cancelDuplication();
      setDuplicateCursor(false);
      removeGhostSubject();
      clearDuplicateVisualState();
      return;
    }

    const dailyDetailModal = document.getElementById("dailyDetailModal");
    if (dailyDetailModal && dailyDetailModal.classList.contains("active")) {
      closeDailyDetailModal();
      return;
    }

    const calendarModal = document.getElementById("excludeDaysModal");
    if (calendarModal && calendarModal.classList.contains("active")) {
      closeCalendarModal();
      return;
    }

    const activeModal = document.querySelector(".modal.active");
    if (activeModal) {
      const closeBtn = activeModal.querySelector(".close-btn");
      if (closeBtn) closeBtn.click();
    }
  }

  if (e.key === "Enter") {
    const activeModal = document.querySelector(".modal.active");
    if (!activeModal) return;

    if (activeModal.id === "subjectModal") {
      e.preventDefault();
      if (!saveSubjectBtn.disabled) {
        saveSubjectBtn.click();
      }
    }

    if (activeModal.id === "newScheduleModal") {
      e.preventDefault();
      if (scheduleNameInput.value.trim()) {
        confirmCreateBtn.click();
      }
    }

    if (activeModal.id === "renameScheduleModal") {
      e.preventDefault();
      if (renameInput.value.trim()) {
        confirmRenameBtn.click();
      }
    }
  }
});
