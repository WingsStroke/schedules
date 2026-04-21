# 🪟 Sistema de Modales - Documentación Completa

> Guía detallada del sistema de modales del proyecto, su arquitectura, patrones y cómo trabajar con ellos.

---

## 📋 **Catálogo de Modales**

### **1. subjectModal** - Crear/Editar Asignatura
**ID:** `#subjectModal`  
**Propósito:** Formulario para agregar o editar asignaturas en el horario  
**Ubicación HTML:** index.html, línea ~155

**Campos:**
- Nombre (text, requerido)
- Grupo (text + checkbox)
- Programa (text + checkbox)
- Aula (text + checkbox)
- Créditos (number + checkbox)
- Color (color picker)
- Bloques (select 1-4)

**Botones:**
- Guardar asignatura / Guardar cambios
- Eliminar (solo en modo edición)
- Duplicar (solo en modo edición)

**Funciones JS:**
- `openSubjectModal(row, col)` - Crear nueva
- `openEditSubjectModal(subject)` - Editar existente

---

### **2. newScheduleModal** - Crear Horario
**ID:** `#newScheduleModal`  
**Propósito:** Crear un nuevo horario vacío  
**Ubicación HTML:** index.html, línea ~200

**Campos:**
- Nombre del horario (text, requerido)

**Botones:**
- Crear horario

**Funciones JS:**
- Se abre desde home view
- Crea schedule y llama `createSchedule(name, [])`

---

### **3. renameScheduleModal** - Renombrar Horario
**ID:** `#renameScheduleModal`  
**Propósito:** Cambiar nombre de horario existente  
**Ubicación HTML:** index.html, línea ~220

**Campos:**
- Nuevo nombre (text, requerido)

**Botones:**
- Guardar nombre

**Funciones JS:**
- `openRenameModal(index)`
- Llama `renameSchedule(index, newName)`

---

### **4. deleteScheduleModal** - Confirmar Eliminación
**ID:** `#deleteScheduleModal`  
**Propósito:** Confirmación antes de eliminar horario  
**Ubicación HTML:** index.html, línea ~240

**Campos:**
- Ninguno (solo confirmación)

**Botones:**
- Sí, eliminar
- Cancelar

**Funciones JS:**
- `openDeleteModal(index)`
- Llama `deleteSchedule(index)`

---

### **5. monthlyModal** - Calculadora Mensual
**ID:** `#monthlyModal`  
**Propósito:** Calcular costos mensuales de transporte y alimentación  
**Ubicación HTML:** index.html, línea ~260

**Campos:**
- Mes (select)
- Año (number)
- Merienda diaria (number)
- Transporte ida+vuelta (number)
- Minutos mínimos de hueco (number)

**Botones:**
- Calcular
- Abrir calendario (exclusión de días)

**Funciones JS:**
- Se abre desde botón en app
- `calculateBtn.onclick` (línea ~1303)

---

### **6. monthlyResult** - Resultado Cálculo
**ID:** `#monthlyResult`  
**Propósito:** Mostrar resultado del cálculo mensual  
**Ubicación HTML:** index.html, línea ~320

**Contenido:**
- Mes calculado
- Días con clases
- Total estimado

**Botones:**
- Cerrar

**Funciones JS:**
- Se muestra después de calcular
- Datos en `resultMonth`, `resultTrips`, `resultTotal`

---

### **7. changelogPanel** - Panel de Changelog
**ID:** `#changelogPanel`  
**Propósito:** Mostrar historial de versiones  
**Ubicación HTML:** index.html, línea ~350

**Contenido:**
- Lista de versiones
- Cambios por versión
- Fecha de lanzamiento

**Botones:**
- Cerrar

**Funciones JS:**
- `renderChangelog(changelogData)`
- Se carga de changelog.json
- `checkChangelogVersion()` detecta nueva versión

---

### **8. Sidebar Panel** - Panel Lateral
**ID:** `#sidebar`  
**Propósito:** Gestión de asignaturas y combinaciones  
**Ubicación HTML:** index.html, línea ~400

**Secciones:**
- Búsqueda de asignaturas
- Asignaturas seleccionadas
- Filtros (grupos, programas, profesores)
- Control de máximo de combinaciones

**Botones:**
- Regenerar combinaciones
- Cerrar

**Funciones JS:**
- `SidebarPanel.abrir()`
- `SidebarPanel.cerrar()`

---

### **9. Minihorarios Panel** - Vista Previa Combinaciones
**ID:** `#minihorariosPanel`  
**Propósito:** Visualizar combinaciones generadas  
**Ubicación HTML:** index.html, línea ~500

**Contenido:**
- Cards con mini-tablas de horarios
- Botones por combinación

**Botones:**
- Crear horario (por combinación)
- Descartar (por combinación)
- Cerrar panel

**Funciones JS:**
- `MinihorariosUI.mostrarCombinaciones()`
- `MinihorariosUI.crearHorarioDesdeCombinacion(index)`

---

## 🏗️ **Arquitectura de Modales**

### **Estructura HTML Estándar**

```html
<div class="modal" id="modalId">
  <div class="modal-content">
    <span class="close-btn">✕</span>
    <h3>Título del Modal</h3>
    
    <!-- Contenido -->
    <label>Campo 1</label>
    <input type="text" id="campo1Input">
    
    <label>Campo 2</label>
    <select id="campo2Select">
      <option>Opción 1</option>
    </select>
    
    <!-- Botones de acción -->
    <button id="actionBtn">Acción</button>
    <button class="secondary">Cancelar</button>
  </div>
</div>
```

---

### **Patrón CSS**

```css
/* Modal overlay (fondo oscuro) */
.modal {
  display: none;              /* Oculto por defecto */
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}

/* Visible cuando tiene clase active */
.modal.active {
  display: flex;
}

/* Contenido del modal (cuadro blanco) */
.modal-content {
  background: white;
  padding: 32px;
  border-radius: 12px;
  min-width: 400px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  position: relative;
}

/* Botón de cerrar (X) */
.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  background: none;
  border: none;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}
```

---

### **Patrón JavaScript**

```javascript
// 1. REFERENCIAS
const miModal = document.getElementById("miModal");
const miModalCloseBtn = miModal.querySelector(".close-btn");
const actionBtn = document.getElementById("actionBtn");

// 2. ABRIR MODAL
function openMiModal() {
  // a. Limpiar/resetear campos
  document.getElementById("campo1Input").value = "";
  document.getElementById("campo2Select").selectedIndex = 0;
  
  // b. Cargar datos si es necesario
  // const data = loadDataFromSomewhere();
  // populateForm(data);
  
  // c. Mostrar modal
  miModal.classList.add("active");
}

// 3. CERRAR MODAL - Botón X
miModalCloseBtn.addEventListener("click", () => {
  miModal.classList.remove("active");
});

// 4. CERRAR MODAL - Click fuera
miModal.addEventListener("click", (e) => {
  if (e.target === miModal) {
    miModal.classList.remove("active");
  }
});

// 5. CERRAR MODAL - Tecla ESC (opcional)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && miModal.classList.contains("active")) {
    miModal.classList.remove("active");
  }
});

// 6. ACCIÓN PRINCIPAL
actionBtn.addEventListener("click", () => {
  // a. Obtener datos del formulario
  const campo1 = document.getElementById("campo1Input").value;
  const campo2 = document.getElementById("campo2Select").value;
  
  // b. Validar
  if (!campo1) {
    alert("Campo 1 es obligatorio");
    return;
  }
  
  // c. Procesar
  procesarDatos(campo1, campo2);
  
  // d. Cerrar modal
  miModal.classList.remove("active");
  
  // e. Guardar si es necesario
  saveData();
  
  // f. Actualizar UI
  renderSchedule();
});
```

---

## 🎨 **Estilos Dark Mode**

### **Patrón Estándar**

```css
/* dark-mode.css */

/* Modal overlay */
body.dark-mode .modal {
  background: rgba(0, 0, 0, 0.7);  /* Más oscuro */
}

/* Modal content con glass morphism */
body.dark-mode .modal-content {
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
}

/* Títulos */
body.dark-mode .modal-content h3 {
  color: #e0e0e0;
}

/* Labels */
body.dark-mode .modal-content label {
  color: #e0e0e0;
}

/* Inputs */
body.dark-mode .modal-content input[type="text"],
body.dark-mode .modal-content input[type="number"],
body.dark-mode .modal-content input[type="email"],
body.dark-mode .modal-content select,
body.dark-mode .modal-content textarea {
  background: rgba(40, 40, 40, 0.8);
  color: #e0e0e0;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

body.dark-mode .modal-content input::placeholder {
  color: #808080;
}

/* Checkboxes */
body.dark-mode .modal-content input[type="checkbox"] {
  filter: brightness(0.8);
}

/* Botón cerrar */
body.dark-mode .close-btn {
  color: #b0b0b0;
}

body.dark-mode .close-btn:hover {
  color: #e0e0e0;
}

/* Botones */
body.dark-mode .modal-content button {
  background: rgba(59, 130, 246, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.5);
}

body.dark-mode .modal-content button.secondary {
  background: rgba(60, 60, 60, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
```

---

## 🔧 **Casos de Uso Comunes**

### **1. Modal con Datos Dinámicos**

**Ejemplo:** Modal que carga información de una asignatura

```javascript
function openViewSubjectModal(subjectId) {
  // 1. Buscar subject
  const subject = schedules[currentScheduleIndex].subjects.find(
    s => s.id === subjectId
  );
  
  if (!subject) {
    alert("Asignatura no encontrada");
    return;
  }
  
  // 2. Poblar modal
  document.getElementById("viewSubjectName").textContent = subject.name;
  document.getElementById("viewSubjectGroup").textContent = subject.group;
  document.getElementById("viewSubjectProgram").textContent = subject.program;
  // ... más campos
  
  // 3. Mostrar modal
  viewSubjectModal.classList.add("active");
}
```

---

### **2. Modal con Validación Compleja**

```javascript
saveBtn.addEventListener("click", () => {
  const errors = [];
  
  // Validaciones
  const name = nameInput.value.trim();
  if (!name) errors.push("El nombre es obligatorio");
  if (name.length < 3) errors.push("El nombre debe tener al menos 3 caracteres");
  
  const credits = parseInt(creditsInput.value);
  if (isNaN(credits) || credits < 0) errors.push("Créditos inválidos");
  if (credits > 10) errors.push("Créditos no pueden exceder 10");
  
  // Mostrar errores
  if (errors.length > 0) {
    alert(errors.join("\n"));
    return;
  }
  
  // Procesar si todo OK
  procesarFormulario();
});
```

---

### **3. Modal con Estado (Crear vs Editar)**

```javascript
// Variable de estado
let modalMode = "create";  // "create" o "edit"
let editingIndex = null;

function openModalForCreate() {
  modalMode = "create";
  editingIndex = null;
  
  // Limpiar formulario
  clearForm();
  
  // Cambiar texto del botón
  saveBtn.textContent = "Crear";
  
  // Ocultar botón de eliminar
  deleteBtn.style.display = "none";
  
  modal.classList.add("active");
}

function openModalForEdit(index) {
  modalMode = "edit";
  editingIndex = index;
  
  // Cargar datos
  const item = items[index];
  loadFormData(item);
  
  // Cambiar texto del botón
  saveBtn.textContent = "Guardar Cambios";
  
  // Mostrar botón de eliminar
  deleteBtn.style.display = "block";
  
  modal.classList.add("active");
}

// En el handler de save
saveBtn.addEventListener("click", () => {
  const data = getFormData();
  
  if (modalMode === "create") {
    items.push(data);
  } else {
    items[editingIndex] = data;
  }
  
  saveData();
  renderList();
  modal.classList.remove("active");
});
```

---

### **4. Modal con Confirmación**

```javascript
function openDeleteConfirmation(itemId) {
  // Guardar ID para usar después
  confirmModal.dataset.itemId = itemId;
  
  // Mostrar nombre del item
  const item = findItemById(itemId);
  document.getElementById("confirmItemName").textContent = item.name;
  
  confirmModal.classList.add("active");
}

confirmYesBtn.addEventListener("click", () => {
  const itemId = confirmModal.dataset.itemId;
  deleteItem(itemId);
  confirmModal.classList.remove("active");
});

confirmNoBtn.addEventListener("click", () => {
  confirmModal.classList.remove("active");
});
```

---

### **5. Modal con Múltiples Pasos**

```javascript
let currentStep = 1;
const totalSteps = 3;

function showStep(step) {
  // Ocultar todos los pasos
  document.querySelectorAll(".step").forEach(s => {
    s.style.display = "none";
  });
  
  // Mostrar paso actual
  document.getElementById(`step${step}`).style.display = "block";
  
  // Actualizar botones
  prevBtn.disabled = step === 1;
  nextBtn.textContent = step === totalSteps ? "Finalizar" : "Siguiente";
  
  // Actualizar indicador
  document.getElementById("stepIndicator").textContent = `Paso ${step} de ${totalSteps}`;
}

nextBtn.addEventListener("click", () => {
  if (currentStep < totalSteps) {
    currentStep++;
    showStep(currentStep);
  } else {
    // Finalizar
    procesarFormulario();
    modal.classList.remove("active");
    currentStep = 1;
    showStep(1);
  }
});

prevBtn.addEventListener("click", () => {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
});
```

---

## 🐛 **Problemas Comunes y Soluciones**

### **Problema: Modal no se cierra al hacer click fuera**

**Causa:** Event listener no configurado o bubbling no funciona

**Solución:**
```javascript
modal.addEventListener("click", (e) => {
  // IMPORTANTE: Verificar que el click fue EN el modal, no en su contenido
  if (e.target === modal) {
    modal.classList.remove("active");
  }
});
```

---

### **Problema: Scroll de la página cuando modal está abierto**

**Solución:**
```javascript
// Al abrir modal
function openModal() {
  document.body.style.overflow = "hidden";
  modal.classList.add("active");
}

// Al cerrar modal
function closeModal() {
  document.body.style.overflow = "";
  modal.classList.remove("active");
}
```

---

### **Problema: Modal aparece detrás de otros elementos**

**Solución:**
```css
.modal {
  z-index: 1000;  /* Aumentar si es necesario */
}

/* Asegurar que otros elementos tengan z-index menor */
.header {
  z-index: 100;
}

.sidebar {
  z-index: 500;
}
```

---

### **Problema: Inputs no se limpian al cerrar**

**Solución:**
```javascript
function closeModal() {
  // Limpiar SIEMPRE al cerrar
  clearFormInputs();
  modal.classList.remove("active");
}

function clearFormInputs() {
  modal.querySelectorAll("input[type='text']").forEach(input => {
    input.value = "";
  });
  
  modal.querySelectorAll("select").forEach(select => {
    select.selectedIndex = 0;
  });
  
  modal.querySelectorAll("input[type='checkbox']").forEach(checkbox => {
    checkbox.checked = false;
  });
}
```

---

### **Problema: ESC cierra modal equivocado**

**Solución:**
```javascript
// Usar variable de tracking
let activeModal = null;

function openModal(modal) {
  activeModal = modal;
  modal.classList.add("active");
}

function closeModal(modal) {
  activeModal = null;
  modal.classList.remove("active");
}

// Event listener global
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && activeModal) {
    closeModal(activeModal);
  }
});
```

---

## 📊 **Jerarquía de z-index**

```css
/* Recomendado */
.header {
  z-index: 100;
}

.sidebar {
  z-index: 500;
}

.sidebar-overlay {
  z-index: 498;  /* Detrás del sidebar */
}

.modal {
  z-index: 1000;
}

.modal-overlay {
  z-index: 999;  /* Opcional si hay overlay separado */
}

.dropdown {
  z-index: 200;
}

.tooltip {
  z-index: 300;
}
```

---

## 🎨 **Variantes de Diseño**

### **Modal Pequeño (Confirmación)**
```css
.modal-content.small {
  min-width: 300px;
  max-width: 400px;
}
```

### **Modal Grande (Formulario Complejo)**
```css
.modal-content.large {
  min-width: 600px;
  max-width: 800px;
}
```

### **Modal Fullscreen (Móvil)**
```css
@media (max-width: 768px) {
  .modal-content {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
  }
}
```

---

## ✅ **Checklist: Crear Nuevo Modal**

```
□ HTML: Estructura con .modal y .modal-content
□ HTML: Botón de cerrar (.close-btn)
□ HTML: Título descriptivo
□ HTML: Formulario con IDs únicos
□ HTML: Botones de acción

□ CSS: Estilos base en styles.css
□ CSS: Estilos dark mode en dark-mode.css
□ CSS: z-index apropiado

□ JS: Referencias a elementos (modal, botones, inputs)
□ JS: Función para abrir modal
□ JS: Event listener para cerrar (X)
□ JS: Event listener para cerrar (click fuera)
□ JS: Event listener para acción principal
□ JS: Validación de inputs
□ JS: Limpieza al cerrar

□ Probar: Abrir modal
□ Probar: Cerrar con X
□ Probar: Cerrar clickeando fuera
□ Probar: Cerrar con ESC
□ Probar: Validaciones
□ Probar: Acción principal
□ Probar: Modo oscuro
□ Probar: Responsive (opcional)
```

---

**Última actualización:** Marzo 2026  
**Próxima revisión:** Al agregar nuevos modales
