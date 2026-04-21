# ⚡ Guía de Desarrollo Rápido

> Referencia rápida para tareas comunes de desarrollo. Si necesitas hacer algo específico, busca aquí primero.

---

## 📋 **Índice de Tareas**

1. [Agregar Campo a Asignatura](#agregar-campo-a-asignatura)
2. [Crear Nuevo Modal](#crear-nuevo-modal)
3. [Agregar Estilo Dark Mode](#agregar-estilo-dark-mode)
4. [Modificar Tabla de Horarios](#modificar-tabla-de-horarios)
5. [Agregar Nueva Funcionalidad al Sidebar](#agregar-funcionalidad-sidebar)
6. [Modificar Generador de Combinaciones](#modificar-generador-combinaciones)
7. [Agregar Nuevo Módulo JS](#agregar-nuevo-modulo-js)
8. [Debugging Común](#debugging-común)

---

## 1. **Agregar Campo a Asignatura**

**Ejemplo:** Agregar campo "Profesor" a las asignaturas

### **Paso 1: HTML - Agregar input en modal**
```html
<!-- index.html, dentro de #subjectModal -->
<label>Profesor</label>
<div class="input-with-checkbox">
  <input type="text" id="subjectProfesorInput" placeholder="Ej: Juan Pérez">
  <input type="checkbox" id="showProfesorCheckbox" title="Mostrar en horario">
</div>
```

**Ubicación:** Después del campo existente similar (ej: después de "aula")

---

### **Paso 2: JS - Declarar variable del input**
```javascript
// app.js, línea ~1699 (sección de declaraciones de modal)
const subjectProfesorInput = document.getElementById("subjectProfesorInput");
```

---

### **Paso 3: JS - Limpiar modal al abrir**
```javascript
// app.js, línea ~1730 (función openSubjectModal o similar)
subjectProfesorInput.value = "";
// ...
document.getElementById("showProfesorCheckbox").checked = false;
```

---

### **Paso 4: JS - Cargar datos al editar**
```javascript
// app.js, línea ~1918 (función openEditSubjectModal)
subjectProfesorInput.value = subject.profesor || "";
// ...
document.getElementById("showProfesorCheckbox").checked = subject.showProfesor || false;
```

---

### **Paso 5: JS - Guardar en objeto subject**
```javascript
// app.js, línea ~2126 (saveSubjectBtn.onclick)
const showProfesor = document.getElementById("showProfesorCheckbox").checked;

const newSubject = {
  // ... campos existentes
  profesor: subjectProfesorInput.value.trim(),
  showProfesor: showProfesor
};
```

---

### **Paso 6: JS - Normalizar en normalizeSubject**
```javascript
// app.js, línea ~860 (función normalizeSubject)
const normalized = {
  // ... campos existentes
  profesor: subject.profesor ?? "",
  // ...
  showProfesor: subject.showProfesor ?? false
};
```

---

### **Paso 7: JS - Renderizar en tarjeta**
```javascript
// app.js, línea ~2424 (función createSubjectContent)
// Después del aula o donde corresponda:
if (subject.showProfesor && subject.profesor) {
  const profesorDiv = document.createElement("div");
  profesorDiv.className = "subject-profesor";
  profesorDiv.textContent = subject.profesor;
  content.appendChild(profesorDiv);
}
```

---

### **Paso 8: CSS - Estilos**
```css
/* styles.css, después de .subject-aula */
.subject-profesor {
  position: relative;
  font-size: 11px;
  margin-top: 4px;
  font-weight: 400;
  background: rgba(0, 0, 0, 0.2);
  padding: 3px 8px;
  border-radius: 4px;
}
```

---

### **Paso 9: CSS - Dark Mode**
```css
/* dark-mode.css, sección de tabla */
body.dark-mode .subject-profesor {
  background: rgba(255, 255, 255, 0.15);
  color: #e0e0e0;
}
```

---

### **✅ Checklist**
```
□ HTML: Input agregado
□ JS: Variable declarada
□ JS: Modal limpiado
□ JS: Carga en edición
□ JS: Guardado en subject
□ JS: Normalización
□ JS: Renderizado
□ CSS: Estilos base
□ CSS: Dark mode
□ Probar: Crear, editar, visualizar
```

---

## 2. **Crear Nuevo Modal**

**Ejemplo:** Modal de "Configuración Avanzada"

### **Paso 1: HTML - Estructura**
```html
<!-- index.html, después de otros modales -->
<div class="modal" id="settingsModal">
  <div class="modal-content">
    <span class="close-btn">✕</span>
    <h3>Configuración Avanzada</h3>
    
    <!-- Contenido del modal -->
    <label>Opción 1</label>
    <input type="text" id="option1Input">
    
    <button id="saveSettingsBtn">Guardar</button>
  </div>
</div>
```

---

### **Paso 2: JS - Referencias**
```javascript
// app.js, sección de variables globales
const settingsModal = document.getElementById("settingsModal");
const settingsCloseBtn = settingsModal.querySelector(".close-btn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
```

---

### **Paso 3: JS - Event Listeners**
```javascript
// Cerrar con X
settingsCloseBtn.addEventListener("click", () => {
  settingsModal.classList.remove("active");
});

// Cerrar clickeando fuera
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove("active");
  }
});

// Botón de guardar
saveSettingsBtn.addEventListener("click", () => {
  // Lógica de guardado
  const value = document.getElementById("option1Input").value;
  
  // Guardar en localStorage
  SafeStorage.setItem("settings", JSON.stringify({ option1: value }));
  
  // Cerrar modal
  settingsModal.classList.remove("active");
});
```

---

### **Paso 4: JS - Función para abrir**
```javascript
function openSettingsModal() {
  // Cargar configuración actual
  const settings = JSON.parse(SafeStorage.getItem("settings") || "{}");
  document.getElementById("option1Input").value = settings.option1 || "";
  
  // Mostrar modal
  settingsModal.classList.add("active");
}
```

---

### **Paso 5: Conectar con botón**
```javascript
// En algún lugar del HTML o JS
const settingsBtn = document.getElementById("settingsBtn");
settingsBtn.addEventListener("click", openSettingsModal);
```

---

## 3. **Agregar Estilo Dark Mode**

**Patrón:** Siempre usar `body.dark-mode` como prefijo

### **Para Elemento Nuevo:**
```css
/* 1. styles.css - Modo claro (primero) */
.mi-elemento {
  background: white;
  color: #333;
  border: 1px solid #e0e0e0;
}

/* 2. dark-mode.css - Modo oscuro (después) */
body.dark-mode .mi-elemento {
  background: rgba(30, 30, 30, 0.95);
  color: #e0e0e0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

### **Para Modal:**
```css
/* dark-mode.css */
body.dark-mode #miModal .modal-content {
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
}

/* Labels y textos */
body.dark-mode #miModal label {
  color: #e0e0e0;
}

/* Inputs */
body.dark-mode #miModal input,
body.dark-mode #miModal select,
body.dark-mode #miModal textarea {
  background: rgba(40, 40, 40, 0.8);
  color: #e0e0e0;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
```

---

### **Paleta de Referencia:**
```css
/* Backgrounds oscuros */
--bg-dark-primary: rgba(30, 30, 30, 0.95);
--bg-dark-secondary: rgba(40, 40, 40, 0.8);
--bg-dark-tertiary: rgba(50, 50, 50, 0.7);

/* Textos */
--text-primary: #e0e0e0;
--text-secondary: #b0b0b0;

/* Borders */
--border-light: rgba(255, 255, 255, 0.1);
--border-medium: rgba(255, 255, 255, 0.15);
--border-strong: rgba(255, 255, 255, 0.2);

/* Glass effect */
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
```

---

## 4. **Modificar Tabla de Horarios**

### **Cambiar altura de bloques:**
```css
/* styles.css, línea ~151 */
.cell {
  min-height: 90px;  /* Cambiar este valor */
}
```

⚠️ **También actualizar en JavaScript:**
```javascript
// app.js, función createSubjectDiv
const height = subject.blocks * 90;  // Cambiar multiplicador
div.style.height = `${height}px`;
```

---

### **Agregar nueva columna (día):**

**1. Modificar diasSemana:**
```javascript
// app.js, línea ~557
const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
```

**2. Actualizar construcción de tabla:**
```javascript
// app.js, función construirSeccion
// Agregar <th>Domingo</th> en el header
```

**3. Actualizar mapeo de días:**
```javascript
// cargador-combinaciones.js
const diasMap = {
  "Lunes": 0,
  "Martes": 1,
  // ...
  "Domingo": 6  // Nuevo
};
```

---

### **Cambiar bloques de tiempo:**
```javascript
// app.js, función generarBloques, línea ~575
function generarBloques(jornada) {
  if (jornada === "diurna") {
    return [
      { inicio: "08:00", fin: "09:30", minutes: 480 },
      { inicio: "09:40", fin: "11:10", minutes: 580 },
      // Agregar/modificar bloques aquí
    ];
  }
}
```

---

## 5. **Agregar Funcionalidad al Sidebar**

**Ejemplo:** Botón para "Limpiar todas las asignaturas"

### **Paso 1: HTML**
```html
<!-- En el sidebar, agregar botón -->
<button id="clearAllSubjectsBtn" class="danger-btn">
  Limpiar Todo
</button>
```

---

### **Paso 2: JS - Event Listener**
```javascript
// sidebar-panel.js, en inicializar()
const clearBtn = document.getElementById("clearAllSubjectsBtn");
clearBtn.addEventListener("click", () => {
  if (confirm('¿Eliminar todas las asignaturas seleccionadas?')) {
    MotorCombinaciones.limpiarAsignaturas();
    SidebarPanel.actualizarAsignaturasSeleccionadas();
  }
});
```

---

### **Paso 3: CSS**
```css
/* sidebar-panel.css */
.danger-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.danger-btn:hover {
  background: #dc2626;
}

/* Dark mode */
body.dark-mode .danger-btn {
  background: #b91c1c;
}
```

---

## 6. **Modificar Generador de Combinaciones**

### **Cambiar límite de combinaciones:**
```javascript
// motor-combinaciones.js, línea ~4
maxCombinaciones: 5,  // Cambiar valor
```

---

### **Agregar nuevo filtro:**

**Ejemplo:** Filtro por "Modalidad" (presencial/online)

**1. Agregar campo a estructura de filtros:**
```javascript
// motor-combinaciones.js, en generarCombinaciones
if (asig.filtros.modalidadesPermitidas && asig.filtros.modalidadesPermitidas.length > 0) {
  gruposFiltrados = gruposFiltrados.filter(g => 
    asig.filtros.modalidadesPermitidas.includes(g.modalidad)
  );
}
```

**2. UI en sidebar:**
```javascript
// sidebar-panel.js, en actualizarAsignaturasSeleccionadas
// Agregar checkboxes de modalidades en el modal de filtros
```

---

### **Modificar lógica de detección de choques:**
```javascript
// motor-combinaciones.js, línea ~230 (aprox)
detectarChoque(bloque1, bloque2) {
  // Lógica actual: mismo día + overlap
  
  // Nueva lógica: agregar condición extra
  if (bloque1.modalidad === "online" || bloque2.modalidad === "online") {
    return false;  // Clases online no chocan
  }
  
  // ... resto de lógica original
}
```

---

## 7. **Agregar Nuevo Módulo JS**

**Ejemplo:** Módulo de exportación a PDF

### **Paso 1: Crear archivo**
```javascript
// js/export-pdf.js
const ExportadorPDF = {
  // Estado
  config: {
    pageSize: 'A4',
    orientation: 'portrait'
  },
  
  // API pública
  exportarHorario(schedule) {
    // Lógica de exportación
  },
  
  // Helper privado
  _generarTablaHTML(schedule) {
    // ...
  }
};
```

---

### **Paso 2: Cargar en HTML**
```html
<!-- index.html, antes del cierre de </body> -->
<script src="js/export-pdf.js"></script>
```

⚠️ **Orden de carga importa:** Si usa otros módulos, cargar después de dependencias.

---

### **Paso 3: Usar desde app.js**
```javascript
// app.js
const exportBtn = document.getElementById("exportPDFBtn");
exportBtn.addEventListener("click", () => {
  const schedule = schedules[currentScheduleIndex];
  ExportadorPDF.exportarHorario(schedule);
});
```

---

### **Paso 4: Documentar**
```markdown
<!-- js/MODULES.md -->
## 9. export-pdf.js

**Líneas:** XX
**Propósito:** Exportación de horarios a PDF

### API Pública:
- exportarHorario(schedule)
- configurar(options)

### Dependencias:
- Usa: schedules[] (app.js)
- Usado por: app.js
```

---

## 8. **Debugging Común**

### **Problema: Modal no se muestra**

**Checklist:**
```javascript
// 1. Verificar que modal existe en DOM
const modal = document.getElementById("miModal");
console.log("Modal existe:", modal !== null);

// 2. Verificar clase active
console.log("Tiene clase active:", modal.classList.contains("active"));

// 3. Verificar z-index en CSS
// Modal debe tener z-index > elementos debajo
```

---

### **Problema: Datos no se guardan en localStorage**

```javascript
// 1. Verificar que saveData() se llama
function saveData() {
  console.log("💾 Guardando datos...");
  console.log("Schedules:", schedules);
  SafeStorage.setItem("schedules", JSON.stringify(schedules));
  console.log("✅ Guardado completo");
}

// 2. Verificar quota
try {
  SafeStorage.setItem("test", "test");
  console.log("✅ LocalStorage disponible");
} catch (e) {
  console.error("❌ Error de localStorage:", e.name);
}

// 3. Ver en DevTools
// Application > Local Storage > ver keys
```

---

### **Problema: Asignatura no se renderiza**

```javascript
// 1. Verificar que subject está en array
console.log("Subjects:", schedules[currentScheduleIndex].subjects);

// 2. Verificar normalización
const normalized = normalizeSubject(subject);
console.log("Normalizado:", normalized);

// 3. Verificar que createSubjectDiv se llama
function createSubjectDiv(subject) {
  console.log("📦 Creando div para:", subject.name);
  // ...
}

// 4. Verificar que se inserta en celda correcta
const cell = editorState.cellMatrix[subject.row][subject.col];
console.log("Celda destino:", cell);
```

---

### **Problema: Combinaciones no se generan**

```javascript
// 1. Verificar asignaturas seleccionadas
console.log("Asignaturas:", MotorCombinaciones.asignaturasSeleccionadas);

// 2. Verificar que tienen grupos
MotorCombinaciones.asignaturasSeleccionadas.forEach(asig => {
  console.log(`${asig.nombre}: ${asig.grupos.length} grupos`);
});

// 3. Verificar filtros aplicados
// 4. Ejecutar generarCombinaciones con logs
const resultado = MotorCombinaciones.generarCombinaciones();
console.log("Resultado:", resultado);
```

---

### **Problema: Dark mode no aplica**

```css
/* Verificar orden de carga en HTML */
<!-- dark-mode.css DEBE ir ÚLTIMO -->
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="css/dark-mode.css">  ← Último

/* Verificar especificidad */
/* BIEN */
body.dark-mode .elemento { }

/* MAL (muy específico) */
body.dark-mode #app .container .elemento { }
```

---

### **Herramientas de Debugging:**

```javascript
// 1. Error log global
console.log("Errores recientes:", ErrorHandler.errorLog);

// 2. Estado actual
console.log("Schedule actual:", schedules[currentScheduleIndex]);
console.log("Índice:", currentScheduleIndex);
console.log("Celda seleccionada:", editorState.currentCell);

// 3. LocalStorage completo
Object.keys(localStorage).forEach(key => {
  console.log(key, localStorage.getItem(key));
});

// 4. Modo oscuro
console.log("Dark mode activo:", DarkMode.isEnabled());
```

---

## 🎯 **Atajos Útiles**

### **Re-renderizar todo:**
```javascript
renderSchedule();
```

### **Forzar guardado:**
```javascript
saveData();
```

### **Limpiar localStorage (debugging):**
```javascript
localStorage.clear();
location.reload();
```

### **Ver estructura de schedule:**
```javascript
console.table(schedules[currentScheduleIndex].subjects);
```

---

## 9. **Estructura del Modal de Asignatura**

El modal `#subjectModal` tiene un layout específico que debe respetarse al añadir nuevos campos.

### Estructura HTML de referencia

```html
<!-- Campo simple (Nombre, Color, Bloques) -->
<div class="subject-form-field">
  <label>Nombre del campo</label>
  <input type="text">
</div>

<!-- Campo con checkbox de visibilidad (Programa) -->
<div class="subject-form-field">
  <div class="subject-label-row">
    <label>Nombre del campo</label>
    <input type="checkbox" id="showXxxCheckbox" title="Mostrar en horario">
  </div>
  <input type="text" id="subjectXxxInput" placeholder="...">
</div>

<!-- Fila de tres campos compactos (Grupo | Aula | Créditos) -->
<div class="subject-row-triple">
  <div class="subject-field">
    <div class="subject-label-row">
      <label>Campo A</label>
      <input type="checkbox" id="showACheckbox" title="Mostrar en horario">
    </div>
    <input type="text" id="subjectAInput">
  </div>
  <!-- ... más subject-field -->
</div>
```

### Reglas de layout

```
.subject-form-field  → margin-top: 16px, flex column, gap: 4px
.subject-label-row   → flex, justify-content: space-between (label izq, checkbox der)
.subject-row-triple  → CSS Grid 1fr 1fr 96px (Grupo | Aula | Créditos)
```

### Campo de color

El campo de color usa un patrón especial: `#colorPreview` es una barra clicable que abre `#subjectColorPicker` (oculto, posicionado en `top: 100%` para anclar el popover del navegador):

```javascript
// En app.js — el click en la barra abre el picker nativo
colorPreview.onclick = () => { subjectColorInput.click(); };
subjectColorInput.oninput = () => { colorPreview.style.background = subjectColorInput.value; };
```

### Al añadir un campo nuevo con checkbox

Seguir el checklist de la Sección 1, pero usar `.subject-label-row` en lugar de `.input-with-checkbox`:

```html
<!-- NUEVO patrón (usar este) -->
<div class="subject-label-row">
  <label>Mi Campo</label>
  <input type="checkbox" id="showMiCampoCheckbox" title="Mostrar en horario">
</div>
<input type="text" id="subjectMiCampoInput">

<!-- PATRÓN ANTIGUO (no usar en subjectModal) -->
<div class="input-with-checkbox">
  <input type="text" id="subjectMiCampoInput">
  <input type="checkbox" id="showMiCampoCheckbox">
</div>
```

---

## 📚 **Referencias Rápidas** (actualizado)

- **Agregar campo:** Sección 1 + Sección 9 (patrón actualizado de subjectModal)
- **Modal nuevo:** Sección 2
- **Dark mode:** Sección 3
- **Modificar tabla:** Sección 4
- **Estructura subjectModal:** Sección 9
- **Debugging:** Sección 8
- **Arquitectura completa:** Ver ARCHITECTURE.md
- **Módulos JS:** Ver js/MODULES.md
- **Estilos:** Ver css/README.md

---

**Última actualización:** Marzo 2026 — post v2.0.0dev
