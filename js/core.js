"use strict";

export const ErrorHandler = {
  config: { logToConsole: true, showUserMessages: true, maxErrorLogs: 50 },
  errorLog: [],
  init() {
    window.addEventListener('error', (event) => {
      this.logError({ type: 'JavaScript Error', message: event.message, filename: event.filename, lineno: event.lineno, colno: event.colno, error: event.error });
      event.preventDefault();
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({ type: 'Unhandled Promise Rejection', message: event.reason?.message || event.reason, error: event.reason });
      this.handleError(event.reason);
      event.preventDefault();
    });
  },
  logError(errorInfo) {
    const logEntry = { timestamp: new Date().toISOString(), ...errorInfo };
    this.errorLog.push(logEntry);
    if (this.errorLog.length > this.config.maxErrorLogs) this.errorLog.shift();
    if (this.config.logToConsole) console.error('Error capturado:', logEntry);
  },
  handleError(error, context = null) {
    if (!error) return;
    const errorName = error.name || 'Error';
    const errorMessage = error.message || String(error);
    let userMessage = 'Ocurrió un error inesperado. Intenta recargar la página.';
    
    if (errorName === 'QuotaExceededError' || errorMessage.includes('quota')) userMessage = 'Almacenamiento lleno. Elimina horarios.';
    else if (errorName === 'NetworkError' || errorMessage.includes('fetch')) userMessage = 'Error de conexión. Verifica tu red.';
    else if (errorName === 'SyntaxError' && errorMessage.includes('JSON')) userMessage = 'Archivo corrupto o inválido.';
    else if (context) userMessage = `Error en ${context}. ${errorMessage}`;
    
    if (this.config.showUserMessages) {
      if (typeof window.Toast !== 'undefined') window.Toast.show(userMessage, 'error', 5000);
      else alert(userMessage);
    }
  },
  wrap(fn, context = 'operación') {
    return async (...args) => {
      try { return await fn(...args); } 
      catch (error) { this.logError({ context, message: error.message, error }); this.handleError(error, context); throw error; }
    };
  },
  async safeExecute(fn, context = 'operación', defaultValue = null) {
    try { return await fn(); } 
    catch (error) { this.logError({ context, message: error.message, error }); this.handleError(error, context); return defaultValue; }
  },
  getErrorLog() { return [...this.errorLog]; },
  clearErrorLog() { this.errorLog = []; },
  exportErrorLog() {
    const logText = this.errorLog.map(e => `[${e.timestamp}] ${e.type}: ${e.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `error-log.txt`; a.click(); URL.revokeObjectURL(url);
  }
};

export const SafeStorage = {
  setItem(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } 
    catch (error) { if (error.name === 'QuotaExceededError') { ErrorHandler.handleError(error); } return false; }
  },
  getItem(key, defaultValue = null) {
    try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : defaultValue; } 
    catch (error) { return defaultValue; }
  },
  removeItem(key) { try { localStorage.removeItem(key); return true; } catch (e) { return false; } },
  clear() { try { localStorage.clear(); return true; } catch (e) { return false; } },
  hasSpace() { try { const k = '_test_'; localStorage.setItem(k, 'x'); localStorage.removeItem(k); return true; } catch (e) { return false; } },
  getUsage() {
    let total = 0;
    for (let key in localStorage) if (localStorage.hasOwnProperty(key)) total += localStorage[key].length + key.length;
    return { bytes: total, kb: (total / 1024).toFixed(2), mb: (total / 1024 / 1024).toFixed(2) };
  }
};

export function safeJSONParse(jsonString, defaultValue = null) { try { return JSON.parse(jsonString); } catch (e) { return defaultValue; } }
export function safeJSONStringify(obj, defaultValue = '{}') { try { return JSON.stringify(obj, null, 2); } catch (e) { return defaultValue; } }
export async function safeFetch(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), options.timeout || 10000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (error) { clearTimeout(id); throw error; }
}

export const APP_CONFIG = {
  SCHEMA_VERSION: 3,
  LAST_VERSION_KEY: "lastSeenChangelogVersion",
  R2_BUCKET_URL: "https://TU_BUCKET_R2.r2.dev", // Reemplaza esto con tu URL real de Cloudflare R2
  JORNADAS: {
    diurna: { start: "07:00", end: "18:00", visualBlockMinutes: 50, startMinutes: 7 * 60, blockMinutes: 100 },
    nocturna: { start: "17:30", end: "22:00", visualBlockMinutes: 45, startMinutes: 17 * 60, blockMinutes: 90 }
  }
};

export const SUBJECT_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B500", "#6C5CE7",
  "#E74C3C", "#3498DB", "#2ECC71", "#F39C12", "#9B59B6"
];

export function getSubjectColor(nombre) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

export const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export function timeToMinutes(time) { const [h, m] = time.split(":").map(Number); return h * 60 + m; }
export function minutesToTime(min) { const h = Math.floor(min / 60); const m = min % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }

export function generarBloques(jornada) {
  const { start, end, visualBlockMinutes } = APP_CONFIG.JORNADAS[jornada];
  const bloques = [];
  let actual = timeToMinutes(start);
  const limite = timeToMinutes(end);
  while (actual + visualBlockMinutes <= limite) {
    bloques.push({ startMinutes: actual, endMinutes: actual + visualBlockMinutes });
    actual += visualBlockMinutes;
    if (jornada === "diurna" && actual === timeToMinutes("12:50")) actual += 10;
  }
  return bloques;
}

export const bloquesDiurnos = generarBloques("diurna");
export const bloquesNocturnos = generarBloques("nocturna");

// El registro del Service Worker se gestiona en index.html
