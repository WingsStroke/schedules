# 🏗️ Arquitectura Técnica - Sistema Horarios UdeC

> Documentación técnica completa de la arquitectura, patrones de diseño y decisiones técnicas del sistema.

---

## 📐 **Visión General de la Arquitectura**

### **Patrón de Diseño: Modular Vanilla JS**

El sistema está construido sin frameworks, utilizando JavaScript vanilla con módulos cohesivos que se comunican mediante:
- Variables globales compartidas (schedules, currentScheduleIndex)
- Objetos singleton (MotorCombinaciones, SidebarPanel)
- Event-driven architecture (eventos del DOM)

```
┌──────────────────────────────────────────────────────────┐
│                    index.html (509L)                      │
│              Estructura + Modales + Tablas                │
└────────────────────────┬─────────────────────────────────┘
                         │
         ┌───────────────┴────────────────┐
         │                                │
         ▼                                ▼
┌─────────────────┐              ┌──────────────────┐
│   CSS Layer     │              │    JS Layer      │
│   (3,944L)      │              │    (5,278L)      │
└─────────────────┘              └──────────────────┘
         │                                │
         │                                │
    6 archivos                       8 archivos
         │                                │
         ▼                                ▼
┌─────────────────┐              ┌──────────────────┐
│ Rendering Layer │◄────────────►│  Data Layer      │
│ (Browser DOM)   │              │  (LocalStorage)  │
└─────────────────┘              └──────────────────┘
```

---

## 🎯 **Capas de la Aplicación**

### **1. Data Layer (Persistencia)**

**LocalStorage Structure:**
```javascript
{
  // === SCHEDULES ===
  "schedules": [
    {
      id: "uuid",
      name: "Mi Horario 2026-1",
      jornada: "diurna",
      subjects: [
        {
          id: "uuid",
          name: "Programación I",
          row: 0,           // Índice de bloque temporal
          col: 1,           // Día de semana (0=Lunes)
          blocks: 2,        // Bloques de 90min
          color: "#1d4ed8",
          // ... más campos
        }
      ]
    }
  ],
  
  // === STATE ===
  "currentScheduleIndex": 0,
  
  // === PREFERENCES ===
  "darkMode": true,
  "lastSeenChangelogVersion": "1.0.8",
  
  // === CACHED DATA ===
  "ofertaAcademica": {
    // JSON completo de oferta académica UdeC
  }
}
```

**Gestión:**
- `SafeStorage` (app.js, línea 159): Wrapper con manejo de errores
- Auto-save en cada operación crítica
- Validación de schema version para migraciones

---

### **2. Business Logic Layer**

#### **A. Core Module (app.js - 2,960 líneas)**

**Responsabilidades:**
- Gestión del estado global de schedules
- CRUD de horarios
- Renderizado de tabla principal
- Sistema de modales
- Calculadora mensual
- Changelog system

**Secciones clave:**
```javascript
// ErrorHandler (línea 3-157)
// ├─ Captura errores globales
// ├─ Logging estructurado
// └─ Mensajes user-friendly

// SafeStorage (línea 159-261)
// ├─ Wrapper de localStorage
// ├─ Manejo de QuotaExceededError
// └─ JSON parsing seguro

// APP_CONFIG (línea 338-357)
// └─ Constantes globales

// Schedule Management (línea 753-1500)
// ├─ createSchedule()
// ├─ deleteSchedule()
// ├─ renameSchedule()
// └─ switchSchedule()

// Subject Management (línea 1695-2150)
// ├─ Modal de asignaturas
// ├─ addSubject()
// ├─ editSubject()
// └─ deleteSubject()

// Rendering Engine (línea 2200-2600)
// ├─ renderSchedule()
// ├─ createSubjectDiv()
// └─ createSubjectContent()
```

#### **B. Combinations Engine (motor-combinaciones.js - 394 líneas)**

**Algoritmo de generación:**
```javascript
MotorCombinaciones = {
  asignaturasSeleccionadas: [],  // Input: Asignaturas elegidas
  maxCombinaciones: 5,            // Límite de resultados
  combinaciones: [],              // Output: Combinaciones válidas
  
  generarCombinaciones() {
    // 1. Aplicar filtros (grupos, programas, profesores)
    // 2. Producto cartesiano de grupos
    // 3. Validar choques (detectarChoque)
    // 4. Retornar primeras N combinaciones válidas
  },
  
  detectarChoque(bloque1, bloque2) {
    // Lógica: Mismo día + overlap de horarios
    // Retorna: boolean
  }
}
```

**Flujo:**
```
Asignaturas + Filtros
        ↓
Producto Cartesiano
        ↓
Validación de Choques  ──> Combinaciones Válidas
        ↓                          ↓
Combinaciones Descartadas    todasLasCombinaciones[]
```

#### **C. Combinations Loader (cargador-combinaciones.js - 507 líneas)**

**Responsabilidad:** Convertir combinaciones abstractas a formato de horario renderizable

```javascript
CargadorCombinaciones = {
  // Input: Combinación (array de grupos)
  // Output: Array de subjects para renderizar
  
  cargarCombinacion(combinacion, jornada) {
    // 1. Por cada grupo en combinación:
    //    a. Obtener horarios del grupo
    //    b. Mapear a bloques de tabla
    //    c. Calcular row/col/blocks
    // 2. Retornar subjects[]
  },
  
  determinarJornada(horarios) {
    // Heurística: Si >50% son nocturnos → "nocturna"
  }
}
```

**Mapeo de horarios:**
```
Horario del grupo:
{
  dia: "Lunes",
  inicio: "08:00",
  fin: "11:00"
}
        ↓
Conversión a bloques:
{
  col: 0,              // Lunes = 0
  row: 0,              // Bloque 8:00-9:30 = 0
  blocks: 2,           // (11:00-8:00)/90min = 2
  startMinutes: 480,   // 8*60 = 480
  endMinutes: 660      // 11*60 = 660
}
```

---

### **3. Presentation Layer**

#### **A. Main Schedule Table**

**Construcción (app.js, línea 709):**
```javascript
function construirHorario() {
  // 1. Determinar jornada (diurna/nocturna)
  // 2. Obtener bloques correspondientes
  // 3. Construir secciones (mañana, tarde, noche)
  // 4. Insertar en DOM
}
```

**Bloques de tiempo:**
```javascript
// Diurna (generada dinámicamente)
bloquesDiurnos = [
  { inicio: "08:00", fin: "09:30", minutes: 480 },
  { inicio: "09:40", fin: "11:10", minutes: 580 },
  { inicio: "11:20", fin: "12:50", minutes: 680 },
  // ... hasta 20:00
]

// Nocturna
bloquesNocturnos = [
  { inicio: "18:05", fin: "19:35", minutes: 1085 },
  { inicio: "19:45", fin: "21:15", minutes: 1185 },
  { inicio: "21:20", fin: "22:50", minutes: 1280 }
]
```

**Matrix de celdas (editorState.cellMatrix):**
```javascript
// Array 2D: [filas][columnas]
cellMatrix[row][col] = {
  row: 0,
  col: 1,
  startMinutes: 480,
  endMinutes: 570,
  element: HTMLElement  // Referencia al TD
}
```

#### **B. Subject Rendering**

**Proceso (app.js, línea 2360):**
```javascript
function createSubjectDiv(subject) {
  // 1. Crear DIV con clase "subject"
  // 2. Calcular height (blocks * 90px)
  // 3. Agregar createSubjectContent()
  // 4. Event listeners (dobleclick → edit)
  // 5. Insertar en celda correspondiente
}

function createSubjectContent(subject) {
  // Renderiza interior de tarjeta:
  // ┌─────────────────┐
  // │ Nombre          │ ← Siempre
  // │ Programa        │ ← Si showProgram
  // │ Aula            │ ← Si showAula
  // │ A        5 cr   │ ← Si showGroup/showCredits
  // └─────────────────┘
}
```

#### **C. Sidebar Panel (sidebar-panel.js - 836 líneas)**

**Arquitectura:**
```javascript
SidebarPanel = {
  isOpen: false,
  
  // === LIFECYCLE ===
  inicializar() {
    // Setup event listeners
  },
  
  abrir() {
    // Mostrar panel + overlay
  },
  
  cerrar() {
    // Ocultar panel
  },
  
  // === ASIGNATURAS ===
  actualizarAsignaturasSeleccionadas() {
    // Renderiza lista de asignaturas
  },
  
  agregarAsignaturaAlMotor(asignatura) {
    // MotorCombinaciones.agregarAsignatura()
  },
  
  // === FILTROS ===
  toggleGrupo(index, grupoId) {
    // Marca/desmarca grupo en filtros
  },
  
  togglePrograma(index, programaNombre) {
    // Similar para programas
  },
  
  // === COMBINACIONES ===
  regenerarCombinaciones() {
    // 1. MotorCombinaciones.generarCombinaciones()
    // 2. MinihorariosUI.mostrar()
  }
}
```

#### **D. Minihorarios (minihorarios-ui.js - 406 líneas)**

**Renderizado de vista previa:**
```javascript
MinihorariosUI = {
  mostrarCombinaciones(combinaciones) {
    // 1. Por cada combinación:
    //    a. Crear mini-tabla
    //    b. Renderizar bloques simplificados
    //    c. Agregar botones (crear/descartar)
    // 2. Mostrar panel
  },
  
  crearHorarioDesdeCombinacion(index) {
    // 1. CargadorCombinaciones.cargarCombinacion()
    // 2. app.js → createSchedule()
    // 3. Cerrar panel
  }
}
```

---

## 🔄 **Flujos de Datos Críticos**

### **Flujo 1: Crear Asignatura Manualmente**

```
Usuario click celda vacía
        ↓
openSubjectModal(row, col)  [app.js:1724]
        ↓
Usuario completa formulario
        ↓
saveSubjectBtn.onclick  [app.js:2087]
        ↓
┌─ Validaciones
├─ Crear newSubject objeto
├─ schedules[i].subjects.push(newSubject)
├─ saveData() → localStorage
└─ renderSchedule() → DOM update
```

### **Flujo 2: Generar Combinaciones desde Oferta Académica**

```
1. Cargar JSON oferta
   ↓
   sistema-carga-ofertas.js
   │
   ├─ parsearOfertaAcademica(json)
   ├─ Normalizar estructura
   └─ localStorage.ofertaAcademica = data

2. Buscar asignaturas
   ↓
   integracion-busqueda.js
   │
   ├─ Usuario escribe query
   ├─ Filtrar asignaturas
   └─ Mostrar resultados en sidebar

3. Seleccionar asignaturas
   ↓
   sidebar-panel.js
   │
   ├─ Click en asignatura
   ├─ MotorCombinaciones.agregarAsignatura()
   └─ Actualizar UI

4. Aplicar filtros (opcional)
   ↓
   sidebar-panel.js
   │
   ├─ Expandir asignatura
   ├─ Marcar grupos/programas/profesores
   └─ asignatura.filtros = {...}

5. Generar combinaciones
   ↓
   motor-combinaciones.js
   │
   ├─ generarCombinaciones()
   ├─ Producto cartesiano con filtros
   ├─ Validar choques
   └─ Retornar primeras N válidas

6. Visualizar minihorarios
   ↓
   minihorarios-ui.js
   │
   ├─ mostrarCombinaciones()
   └─ Renderizar mini-tablas

7. Crear horario desde combinación
   ↓
   cargador-combinaciones.js → app.js
   │
   ├─ cargarCombinacion() → subjects[]
   ├─ createSchedule(name, subjects)
   ├─ saveData()
   └─ switchSchedule(index)
```

### **Flujo 3: Cálculo Mensual**

```
Usuario abre modal mensual
        ↓
Selecciona mes/año + costos
        ↓
calculateMonthlyBtn.onclick  [app.js:1303]
        ↓
┌─ Obtener días del mes
├─ Obtener días con clases (from subjects)
├─ Detectar huecos entre bloques
├─ Calcular viajes extras por huecos
├─ Total = (días × (transporte + merienda))
└─ Mostrar resultado en modal
```

---

## 🎨 **Sistema de Estilos**

### **Arquitectura CSS**

```
styles.css (BASE)
    ↓
┌───┴────┬─────────┬──────────┐
│        │         │          │
▼        ▼         ▼          ▼
dark    sidebar   filtros   mini
mode              asig.     horarios
```

**Modo Nocturno:**
- `body.dark-mode` selector universal
- Sobrescribe colores de `styles.css`
- Glass morphism: `backdrop-filter: blur(10px)`
- Variables CSS no usadas (para futuro)

**Convenciones:**
```css
/* Estructura de archivo */
/* ===== SECCIÓN ===== */
.selector {
  /* Propiedades alfabéticas (aprox) */
}

/* Especificidad */
- Evitar !important (excepto dark-mode overrides)
- Max 3 niveles de anidación conceptual
- IDs para elementos únicos, clases para estilos
```

---

## 🧩 **Patrones de Código**

### **1. Error Handling**

```javascript
// Patrón usado en todo el código:
try {
  // Operación riesgosa
  const data = JSON.parse(input);
} catch (error) {
  ErrorHandler.handleError(error, 'contexto');
  return defaultValue;
}

// ErrorHandler centralizado:
ErrorHandler = {
  logError(errorInfo),        // Registra en errorLog[]
  handleError(error, context), // Muestra al usuario
  wrap(fn, context)           // Wrapper para async functions
}
```

### **2. Modal Management**

```javascript
// Patrón estándar para todos los modales:

// Abrir
function openModal() {
  modal.classList.add("active");
  resetModalState();  // Limpiar campos
}

// Cerrar
closeBtn.onclick = () => {
  modal.classList.remove("active");
  clearState();
};

// Click fuera cierra
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.remove("active");
  }
});
```

### **3. State Management**

```javascript
// Estado global en variables top-level:
let schedules = [];
let currentScheduleIndex = null;

// Estado local en objetos:
const editorState = {
  currentCell: { row: null, col: null },
  cellMatrix: [],
  editingSubjectIndex: null
};

// Persistencia:
function saveData() {
  SafeStorage.setItem("schedules", JSON.stringify(schedules));
  SafeStorage.setItem("currentScheduleIndex", currentScheduleIndex);
}
```

### **4. DOM Manipulation**

```javascript
// Preferencia: createElement sobre innerHTML
const div = document.createElement("div");
div.className = "subject";
div.textContent = subject.name;
div.style.background = subject.color;

// Event delegation cuando aplica
table.addEventListener("click", (e) => {
  const cell = e.target.closest("td.cell");
  if (cell) handleCellClick(cell);
});
```

---

## 🔐 **Seguridad y Validación**

### **Input Sanitization**

```javascript
// Sanitización básica (no hay XSS risk por createElement)
const name = subjectNameInput.value.trim();
if (!name) {
  alert("El nombre es obligatorio");
  return;
}

// JSON parsing seguro
function safeJSONParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    ErrorHandler.logError({...});
    return defaultValue;
  }
}
```

### **LocalStorage Limits**

```javascript
// Manejo de QuotaExceededError
SafeStorage = {
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert('Almacenamiento lleno. Elimina horarios.');
      }
      throw e;
    }
  }
}
```

---

## 🚀 **Performance**

### **Optimizaciones Actuales**

1. **Render Caching (limitado)**
   ```javascript
   const renderCache = {
     lastRenderedScheduleId: null,
     cellElements: {}
   };
   ```

2. **Event Delegation**
   - Un listener en `<table>` en lugar de N en cada celda

3. **Lazy Rendering**
   - Minihorarios solo se renderizan al mostrar panel

4. **LocalStorage Batch**
   - saveData() agrupa escrituras

### **Áreas de Mejora Potencial**

- ⚠️ `renderSchedule()` reconstruye DOM completo cada vez
- ⚠️ No usa Virtual DOM
- ⚠️ Búsqueda no está debounced (pero tiene timeout 300ms)
- ⚠️ Sin Web Workers para generación de combinaciones grandes

---

## 📦 **Dependencias Externas**

**NINGUNA.** El proyecto es 100% vanilla:
- ❌ No jQuery
- ❌ No React/Vue/Angular
- ❌ No Lodash
- ❌ No CSS frameworks (Bootstrap, Tailwind)

**Solo APIs del navegador:**
- localStorage API
- DOM API
- Fetch API (potencialmente para futuro)

---

## 🔄 **Ciclo de Vida de la Aplicación**

```javascript
// 1. DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  
  // 2. Inicialización de subsistemas
  ErrorHandler.init();
  DarkMode.initialize();
  SidebarPanel.inicializar();
  MinihorariosUI.inicializar();
  
  // 3. Cargar datos de localStorage
  loadData();
  
  // 4. Verificar changelog
  checkChangelogVersion(changelogData);
  
  // 5. Renderizar vista inicial
  if (schedules.length === 0) {
    showHomeView();
  } else {
    renderScheduleList();
    if (currentScheduleIndex !== null) {
      switchSchedule(currentScheduleIndex);
    }
  }
  
  // 6. Setup event listeners globales
  // ...
});
```

---

## 🗂️ **Convenciones de Nomenclatura**

### **Variables**
```javascript
// camelCase para variables y funciones
let currentScheduleIndex = 0;
function renderSchedule() {}

// UPPER_CASE para constantes
const APP_CONFIG = {...};
const JORNADA_BASE = {...};

// PascalCase para constructores/singletons
const MotorCombinaciones = {...};
const ErrorHandler = {...};
```

### **Archivos**
```
kebab-case.js          // Archivos JS/CSS
PascalCase.md          // Docs importantes
lowercase.html         // HTML
```

### **CSS**
```css
/* kebab-case para clases */
.subject-content {}
.mini-horario {}

/* camelCase para IDs (matching JS) */
#subjectModal {}
#currentScheduleIndex {}
```

---

## 🧪 **Testing (Estado Actual)**

**No hay suite de tests automáticos.**

Testing manual recomendado:
- ✅ Crear/editar/eliminar horarios
- ✅ Agregar asignaturas manualmente
- ✅ Importar oferta académica
- ✅ Generar combinaciones
- ✅ Modo nocturno toggle
- ✅ Cálculo mensual
- ✅ Exportar/Importar JSON

---

## 📊 **Métricas del Proyecto**

```
Complejidad:
- Archivos: 14 (1 HTML, 5 CSS, 8 JS)  — glass-design-system.css eliminado
- Líneas JS: ~5,278 (−541 por limpieza de código muerto)
- Líneas CSS: ~3,944
- Objetos singleton: 7 (se añadió SUBJECT_COLORS/getSubjectColor como API global)
- Modales activos: 8

Tamaño estimado:
- HTML: ~9 KB
- CSS: ~79 KB
- JS: ~150 KB
- Total: ~238 KB (sin comprimir)
```

---

## 🔮 **Decisiones de Diseño Importantes**

### **¿Por qué Vanilla JS?**
- Control total sobre el código
- Cero overhead de frameworks
- Curva de aprendizaje baja
- Tamaño final pequeño (~260KB)

### **¿Por qué LocalStorage y no IndexedDB?**
- Datos estructurados simples
- API síncrona más fácil
- 5MB suficiente para use case
- No necesita queries complejas

### **¿Por qué un solo archivo app.js grande?**
- Proyecto evolucionó orgánicamente
- No hay build step (no bundler)
- Todos los módulos comparten estado global
- Refactorización futura posible

### **¿Por qué no TypeScript?**
- Mantener simplicidad
- No hay build step
- Proyecto académico/personal

---

## 🛠️ **Herramientas de Desarrollo Recomendadas**

- **Editor:** VS Code con extensiones:
  - ESLint (opcional, no configurado)
  - Live Server
  - CSS Peek
  
- **Debugging:**
  - Chrome DevTools
  - localStorage inspector
  - Console para ErrorHandler.errorLog

- **Testing:**
  - Manual en Chrome, Firefox, Safari, Edge
  - Responsive design mode (móvil no optimizado)

---

**Última actualización:** Marzo 2026  
**Próxima revisión:** Al agregar módulo nuevo o cambio arquitectónico mayor

---

## Historial de cambios arquitectónicos (v2.0.0dev)

### Correcciones críticas aplicadas
- **HTML inválido:** Eliminado el segundo `<body>` duplicado.
- **Script duplicado:** `html2canvas` cargaba dos veces; eliminada la instancia duplicada.
- **Validación de importación:** `validateScheduleSchema` rechazaba asignaturas en Sábado (`col > 4`); corregido a `col > 5`.
- **Re-renders en cadena:** `cargador-combinaciones.js` usaba 4 `setTimeout` encadenados para forzar el re-render. Reemplazados por secuencia síncrona: `saveData()` → `rebuildScheduleView()` → `updateScheduleInfo()`.
- **Bypass de SafeStorage:** El cargador escribía directamente en `localStorage`; eliminado, queda únicamente `saveData()`.

### Correcciones moderadas aplicadas
- **`obtenerEstadisticas()` duplicado** en `motor-combinaciones.js`: el primero renombrado a `obtenerEstadisticasCombinaciones()`.
- **`minutesToTime()`** reescrita a formato 24h (`"HH:MM"`), eliminando la inconsistencia con el sistema de horarios.
- **`loadChangelog()`** se llamaba dos veces al iniciar; eliminada la segunda llamada sin uso del resultado.
- **Listener `Escape` duplicado** entre `app.js` y `sidebar-panel.js`: `app.js` ahora cede el control cuando `SidebarPanel.isOpen` es `true`.
- **Seguridad en filtros del sidebar:** Añadido `_escAttr()` en `SidebarPanel` para escapar `grupo.grupo`, `programa` y `profesor` antes de interpolarse en atributos `onchange` inline.

### Mejoras estructurales aplicadas
- **Paleta centralizada:** `SUBJECT_COLORS` y `getSubjectColor()` definidos en `app.js`. Los tres módulos que tenían copias locales de la paleta (`cargador-combinaciones`, `minihorarios-ui`, `integracion-busqueda`) ahora delegan en esta función global.
- **Código muerto eliminado:**
  - `#combinacionesPanel` (panel inferior legacy) eliminado del HTML y de todas las referencias JS.
  - `#searchSubjectModal` (modal huérfano sin lógica JS) eliminado del HTML.
  - `MinihorariosUI.inicializar()`, `container`, `renderizar()`, `renderizarCombinaciones()` eliminados; el módulo ahora sirve exclusivamente al sidebar.
  - `actualizarAsignaturasSeleccionadas()`, `actualizarMaxCombinaciones()` y el bloque del contador legacy eliminados de `integracion-busqueda.js`.
- **`defer` en scripts:** Los 11 scripts (3 CDN + 8 propios) cargan con `defer`, permitiendo al navegador parsear el HTML completo antes de ejecutar JavaScript.

**Última actualización:** Marzo 2026 — v2.0.0dev

### Mejoras visuales y funcionales adicionales (post v2.0.0dev)

**Modal de asignatura (`#subjectModal`) rediseñado:**
- Layout de tres columnas para Grupo | Aula | Créditos usando `.subject-row-triple` (CSS Grid `1fr 1fr 96px`)
- Cada campo usa `.subject-form-field` con `margin-top: 16px` para respiración vertical
- Checkboxes movidos al lado del label usando `.subject-label-row` (flex `justify-content: space-between`)
- Campo de color reemplazado por barra `.color-picker-wrapper` con `#colorPreview` (100% ancho, 36px alto) y `#subjectColorPicker` posicionado en `position: absolute; top: 100%` para anclar el popover del navegador
- Scroll eliminado con `max-height: none; overflow-y: visible` en `#subjectModal .modal-content`

**Tarjetas de asignatura en el horario:**
- `truncarNombre(nombre, max = 40)` trunca nombres largos con `…`; nombre completo en atributo `title`
- `.subject-program` y `.subject-aula` usan `align-self: center; max-width: 90%` para ajustarse al ancho del texto

**Exportación de imagen:**
- Clase `.subject-export` aplicada temporalmente durante exportación: fuentes a 22/17/15px
- `EXPORT_CELL_HEIGHT = 100px` para modo alta legibilidad
- `hideEmptyCols`: oculta columnas vacías y ajusta `colSpan` de filas de jornada
- Cuatro opciones independientes en el modal: jornada diurna, nocturna, alta legibilidad, ocultar días sin clase
- Tooltip en botón `?` implementado con CSS puro (`::after`/`::before` sobre `.export-tooltip-trigger`)

**Dark-mode:**
- `.mini-asignatura-tag` y `.minihorario-info` correctamente estilizados en modo nocturno
- `input[type="checkbox"]` excluido del selector universal de inputs para evitar fondos no deseados
- Modal de filtros (`#modalFiltrosFlotante`) con glass coherente: fondos transparentes en header, área de filtros y barra de acciones

**Fondo modo claro:**
- Gradiente de cuatro paradas en `160deg` con tonos azul-gris fríos (`#dde8f0 → #e8eef4 → #eaedf0 → #dde0e8`)
- `background-attachment: fixed` en ambos modos para comportamiento de scroll consistente

**Última actualización:** Marzo 2026 — post v2.0.0dev

### Sistema de previsualización de exportación (post v2.0.0dev)

**Exportar como imagen — modal rediseñado:**
- Layout de dos columnas: opciones a la izquierda (220px), preview a la derecha (resto)
- La preview se genera automáticamente al abrir el modal y se regenera en tiempo real al cambiar cualquier opción (jornadas, alta legibilidad, ocultar días)
- El botón "Descargar imagen" usa el `dataUrl` ya generado, sin re-renderizar con `html2canvas`
- `generarCanvasExport(includeDiurna, includeNocturna, enhancedExport, hideEmptyCols)` — función central que retorna `Promise<dataUrl>`, usada por preview y descarga

**Sistema de cache `_previewCache`:**
- Objeto en memoria declarado antes de `saveData()` para evitar `ReferenceError`
- Clave: `"idx:D:N:E:H"` — índice del horario + estado de los 4 checkboxes
- `_previewCacheKey()` genera la clave leyendo el DOM en tiempo real
- `saveData(invalidatePreviewCache = true)` acepta parámetro para controlar si invalida el cache
- `openSchedule()` llama `saveData(migrated)` — solo invalida si hubo migración real de esquema, no en navegación normal
- Al cambiar datos del horario, `saveData()` borra todas las claves del índice actual con `startsWith(prefix)`

**Exportar formato UdeC — modal de preview:**
- Nuevo modal `#exportPdfModal` que muestra una tabla HTML con los datos exactos antes de confirmar
- Estructura de contenedor doble para `border-radius` con scroll: `.export-pdf-preview-container` (externo: `overflow:hidden` + `border-radius`) y `.export-pdf-preview-scroll` (interno: `overflow-y:auto` + `max-height`)
- Tabla con `border-collapse: separate; border-spacing: 0` para que `border-radius` en `thead th:first-child` y `th:last-child` funcione correctamente
- Thead con color sólido (`#efefef` / `#2a2a2a` en dark) para que `position: sticky` no deje transparentar filas al hacer scroll
- Fondo sólido (`#ffffff` / `#1e1e1e`) en `.export-pdf-preview-container` para evitar que el glass del modal padre se filtre en las esquinas

**Última actualización:** Marzo 2026 — sistema de previsualización de exportación

### Auditoría v4 — Marzo 2026

**Assets añadidos al proyecto:**
- `assets/moon.svg` y `assets/sun.svg` — íconos del toggle de tema en `dark-mode.js` (inline SVG, los archivos existen pero no son referenciados directamente)
- `assets/icon-192.png` y `assets/icon-512.png` — íconos PWA para manifest e instalación

**Corrección sw.js:** Añadidos `moon.svg`, `sun.svg`, `icon-192.png` e `icon-512.png` al `SHELL_ASSETS` para garantizar disponibilidad offline completa.

**Estado de media queries antes de responsividad:**
- Solo existen 2 media queries en `styles.css` (líneas 1492 y 1527), ambas limitadas al modal de búsqueda de asignaturas
- Ningún componente principal (home, tabla de horario, app header, actions bar, sidebar, modales de exportación) tiene adaptación móvil
- El sidebar tiene ancho fijo de 550px — en móvil ocupa más del 100% de la pantalla
- La tabla del horario usa `table-layout: fixed` sin ancho mínimo — en móvil queda ilegible
- Los modales de exportación tienen anchos fijos (860px imagen, 700px PDF) sin adaptación

**Pendientes técnicos activos:**
- 137 `console.log` en producción (7 archivos)
- `ScheduleTimeModel` referenciado en línea ~917, definido en línea ~2036

**Última actualización:** Marzo 2026 — auditoría pre-responsividad

### Sistema de responsividad móvil (Marzo 2026)

**Nuevo archivo:** `css/responsive.css` (659 líneas) — toda la responsividad en un archivo dedicado, nunca mezclada con los CSS base.

**Breakpoints:** 768px (tablet/horizontal) y 480px (móvil vertical).

**Tabla de horarios en móvil:**
- Scroll horizontal con `overflow-x: auto` en `#scheduleContainer`
- Columna de horas sticky (`position: sticky; left: 0; z-index: 20`) con fondo opaco para tapar contenido al hacer scroll
- `getCellHeight()` — función dinámica que reemplaza la constante `CELL_HEIGHT = 60`. Lee `offsetHeight` del DOM en tiempo real con fallback a `getComputedStyle`. Garantiza que los subjects multibloque calculen su altura correctamente cuando CSS cambia el alto de celda en móvil
- Indicador de scroll horizontal: `#scheduleContainer::after` gradiente fade que desaparece con clase `.scroll-end` cuando se llega al tope derecho. JS detecta el tope con `scrollLeft + clientWidth >= scrollWidth - 4`
- Columnas de días con `min-width: 90px` (768px) / `78px` (480px) para dar espacio a las tarjetas
- `truncarNombre()` adapta el límite según el ancho de pantalla: 18 caracteres en 480px, 22 en 768px, 40 en escritorio

**Modal de asignatura — bottom sheet:**
- En ≤768px: `#subjectModal` con `align-items: flex-end`, `.modal-content` con `border-radius: 20px 20px 0 0` y animación `slideUpSheet`
- `abrirSubjectModal()` — función que envuelve `.classList.add("active")`. En móvil hace `window.scrollTo({ top: 0 })` antes de mostrar el modal para evitar que el teclado virtual desplace el panel
- `body:has(#subjectModal.active)` bloquea el scroll del body con `position: fixed` mientras el sheet está abierto

**PWA:**
- `sw.js` con tres cachés por `BUILD_TIMESTAMP`: `shell-*`, `cdn-*`, `data-*`
- `NEVER_CACHE` excluye `sw.js` y `manifest.json` del cache para que el navegador siempre detecte actualizaciones
- `manifest.json` con íconos separados: `purpose: "any"` (sin recorte) y `purpose: "maskable"` (para launchers adaptativos)
- `changelogOverlay` con acceso defensivo (`const overlay = getElementById(...)`, todos los usos con guard `if (overlay)`)

**Pendientes activos:**
- 137 `console.log` en 7 archivos
- `ScheduleTimeModel` referenciado en línea ~936, definido en línea ~2077

**Última actualización:** Marzo 2026 — responsividad completa
