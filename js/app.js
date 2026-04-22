"use strict";

// ==========================================
// 1. SELECTORES GLOBALES
// ==========================================
const scheduleList = document.getElementById("scheduleList");
const sortSelect = document.querySelector("#sortBar select");
const nameModal = document.getElementById("newScheduleModal");
const renameModal = document.getElementById("renameScheduleModal");
const deleteModal = document.getElementById("deleteScheduleModal");
const subjectModal = document.getElementById("subjectModal");

// Selectores de Asignatura
const subjectNameInput = subjectModal.querySelector("input[type='text']");
const subjectGroupInput = document.getElementById("subjectGroupInput");
const subjectProgramInput = document.getElementById("subjectProgramInput");
const subjectAulaInput = document.getElementById("subjectAulaInput");
const subjectCreditsInput = document.getElementById("subjectCreditsInput");
const subjectColorInput = document.getElementById("subjectColorPicker");
const subjectBlocksInput = subjectModal.querySelector("select");
const colorPreview = document.getElementById("colorPreview");
const saveSubjectBtn = subjectModal.querySelector("button:not(.close-btn)");

// Aguinaldo & Detalles
const monthlyModal = document.getElementById("monthlyModal");
const monthSelect = document.getElementById("monthSelect");
const yearInput = document.getElementById("yearInput");
const snackInput = document.getElementById("snackCostInput");
const transportInput = document.getElementById("transportCostInput");
const gapInput = document.getElementById("minGapMinutes");
const resultadoAguinaldo = document.getElementById("monthlyResult");
const confirmMonthlyBtn = document.getElementById("confirmMonthlyBtn");

// Changelog
const changelogBtn = document.getElementById("changelogBtn");
const changelogPanel = document.getElementById("changelogPanel");
const changelogAlert = document.getElementById("changelogAlert");
const changelogOverlay = document.getElementById("changelogOverlay");

// Variables globales para UI
let selectedScheduleIndex = null;
const excludedDaysSet = new Set();
let dailyDetailData = null;

// ==========================================
// 2. INICIALIZACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  ErrorHandler.init();
  if (typeof DarkMode !== 'undefined') DarkMode.initialize();
  
  if (typeof initializeState === 'function') {
      await initializeState();
  }
  
  if (schedules.length > 0) {
      DOMRenderer.rebuildScheduleView();
  }
  
  if (typeof SidebarPanel !== 'undefined') SidebarPanel.inicializar();
  
  renderSchedules();
  initChangelog();
  populateMonths();
});

// ==========================================
// 3. RENDER DE HOME Y HORARIOS
// ==========================================
function renderSchedules() {
  scheduleList.innerHTML = "";
  const sortBar = document.getElementById("sortBar");
  if (sortBar) sortBar.style.display = schedules.length === 0 ? "none" : "";

  if (schedules.length === 0) {
    scheduleList.innerHTML = `
      <div class="home-empty-state">
        <div class="home-empty-illustration">
          <img src="assets/empty.svg?v=2" alt="" class="home-empty-svg">
        </div>
        <h2 class="home-empty-title">Sin horarios aún</h2>
        <p class="home-empty-subtitle">Crea tu primer horario para comenzar a organizar tu semestre.</p>
        <button class="home-empty-btn" onclick="document.getElementById('createScheduleBtn').click()">
          + Crear primer horario
        </button>
      </div>
    `;
    return;
  }

  let sorted = [...schedules];
  switch(sortSelect.value){
    case "dateDesc": sorted.sort((a,b)=>b.created - a.created); break;
    case "dateAsc": sorted.sort((a,b)=>a.created - b.created); break;
    case "nameAsc": sorted.sort((a,b)=>a.name.localeCompare(b.name)); break;
    case "nameDesc": sorted.sort((a,b)=>b.name.localeCompare(a.name)); break;
  }

  sorted.forEach(schedule => {
    const index = schedules.indexOf(schedule);
    const card = document.createElement("div");
    card.className = "schedule-card";

    const uniqueSubjects = new Set((schedule.subjects || []).map(s => s.name.trim().toLowerCase()));
    const subjectCount = uniqueSubjects.size;
    const subjectText = subjectCount === 1 ? "asignatura" : "asignaturas";

    card.innerHTML = `
      <h3>${schedule.name}</h3>
      <span>${new Date(schedule.created).toLocaleDateString()}</span>
      <span class="subject-count">${subjectCount} ${subjectText}</span>
      <div class="card-actions">
        <button data-action="rename"><img src="assets/edit.png?v=2" alt="Editar"></button>
        <button data-action="delete"><img src="assets/delete.png?v=2" alt="Eliminar"></button>
      </div>
    `;

    card.onclick = (e) => { if(!e.target.closest('[data-action]')) openSchedule(index); };
    
    card.querySelector('[data-action="rename"]').onclick = () => { 
        selectedScheduleIndex = index; 
        renameModal.querySelector("input").value = schedule.name; 
        renameModal.classList.add("active"); 
    };
    card.querySelector('[data-action="delete"]').onclick = () => { 
        selectedScheduleIndex = index; 
        deleteModal.classList.add("active"); 
    };

    scheduleList.appendChild(card);
  });
}

function openSchedule(index) {
  state.cancelDuplication();
  currentScheduleIndex = index;
  document.getElementById("home").classList.remove("active");
  document.getElementById("app").classList.add("active");
  document.querySelector("#app h2").textContent = schedules[index].name;
  DOMRenderer.rebuildScheduleView();
  DOMRenderer.updateScheduleInfo();
}

// ==========================================
// 4. CRUD DE HORARIOS
// ==========================================
document.getElementById("createScheduleBtn").onclick = () => { 
    nameModal.querySelector("input").value = ""; 
    nameModal.classList.add("active"); 
};

nameModal.querySelector("button:not(.close-btn)").onclick = () => {
  const name = nameModal.querySelector("input").value.trim();
  if(!name) return alert("Debes escribir un nombre");
  schedules.push({ name, created: Date.now(), subjects: [], schemaVersion: APP_CONFIG.SCHEMA_VERSION });
  saveData(); nameModal.classList.remove("active"); renderSchedules();
};

renameModal.querySelector("button:not(.close-btn)").onclick = () => {
  const name = renameModal.querySelector("input").value.trim();
  if(!name) return;
  schedules[selectedScheduleIndex].name = name;
  saveData(); renameModal.classList.remove("active"); renderSchedules();
};

deleteModal.querySelector("button:not(.close-btn)").onclick = () => {
  schedules.splice(selectedScheduleIndex, 1);
  saveData(); deleteModal.classList.remove("active"); renderSchedules();
};

document.querySelector("#app header button").onclick = () => {
  document.getElementById("app").classList.remove("active");
  document.getElementById("home").classList.add("active");
  currentScheduleIndex = null;
  renderSchedules();
};

sortSelect.onchange = () => renderSchedules();

// ==========================================
// 5. CRUD DE ASIGNATURAS
// ==========================================
colorPreview.onclick = () => { subjectColorInput.click(); };
subjectColorInput.oninput = () => { colorPreview.style.background = subjectColorInput.value; };

function openSubjectModal(row, col) {
  state.cancelDuplication();
  state.setCurrentCell({ element: editorState.cellMatrix[row][col].element, row, col });
  editorState.editingSubjectIndex = null;
  
  subjectNameInput.value = "";
  if(subjectGroupInput) subjectGroupInput.value = "";
  if(subjectProgramInput) subjectProgramInput.value = "";
  if(subjectAulaInput) subjectAulaInput.value = "";
  if(subjectCreditsInput) subjectCreditsInput.value = "";
  subjectColorInput.value = "#1d4ed8";
  colorPreview.style.background = subjectColorInput.value;
  subjectBlocksInput.value = "1";
  
  if(document.getElementById("showCreditsCheckbox")) document.getElementById("showCreditsCheckbox").checked = false;
  if(document.getElementById("showGroupCheckbox")) document.getElementById("showGroupCheckbox").checked = false;
  if(document.getElementById("showProgramCheckbox")) document.getElementById("showProgramCheckbox").checked = false;
  if(document.getElementById("showAulaCheckbox")) document.getElementById("showAulaCheckbox").checked = false;
  
  saveSubjectBtn.textContent = "Guardar asignatura";
  cleanSubjectModalButtons();

  if (window.innerWidth <= 768) {
      window.scrollTo({ top: 0, behavior: "instant" });
  }
  subjectModal.classList.add("active");
}

function openEditSubjectModal(subject) {
  state.cancelDuplication();
  editorState.editingSubjectIndex = schedules[currentScheduleIndex].subjects.findIndex(s => s.id === subject.id);
  state.setCurrentCell({ element: editorState.cellMatrix[subject.row][subject.col].element, row: subject.row, col: subject.col });
  
  subjectNameInput.value = subject.name;
  if(subjectGroupInput) subjectGroupInput.value = subject.group || "";
  if(subjectProgramInput) subjectProgramInput.value = subject.program || "";
  if(subjectAulaInput) subjectAulaInput.value = subject.aula || "";
  if(subjectCreditsInput) subjectCreditsInput.value = subject.credits || "";
  subjectColorInput.value = subject.color;
  colorPreview.style.background = subject.color;
  subjectBlocksInput.value = subject.blocks;

  if(document.getElementById("showCreditsCheckbox")) document.getElementById("showCreditsCheckbox").checked = subject.showCredits || false;
  if(document.getElementById("showGroupCheckbox")) document.getElementById("showGroupCheckbox").checked = subject.showGroup || false;
  if(document.getElementById("showProgramCheckbox")) document.getElementById("showProgramCheckbox").checked = subject.showProgram || false;
  if(document.getElementById("showAulaCheckbox")) document.getElementById("showAulaCheckbox").checked = subject.showAula || false;

  saveSubjectBtn.textContent = "Guardar cambios";
  cleanSubjectModalButtons();
  
  const modalContent = subjectModal.querySelector(".modal-content");
  modalContent.appendChild(createDeleteButton());
  modalContent.appendChild(createDuplicateButton(subject));

  subjectModal.classList.add("active");
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag]));
}

saveSubjectBtn.onclick = () => {
  if(!editorState.currentCell) return;
  
  // 1. Sanitizamos las entradas de texto para evitar inyecciones maliciosas
  const name = escapeHTML(subjectNameInput.value.trim());
  if(!name) return alert("Nombre obligatorio");

  const color = subjectColorInput.value;
  const blocks = parseInt(subjectBlocksInput.value);
  const currentSchedule = schedules[currentScheduleIndex];
  let editingSubject = null;

  if (editorState.editingSubjectIndex !== null) {
    editingSubject = currentSchedule.subjects.splice(editorState.editingSubjectIndex, 1)[0];
    editorState.editingSubjectIndex = null;
  }

  const targetCell = editorState.cellMatrix[editorState.currentCell.row][editorState.currentCell.col];
  if (isCellOccupied(currentSchedule, editorState.currentCell.row, editorState.currentCell.col, blocks, editingSubject, targetCell.jornada)){
    if (editingSubject) currentSchedule.subjects.push(editingSubject);
    alert("Ese espacio ya está ocupado por otra asignatura");
    return;
  }

  const startCell = editorState.cellMatrix[editorState.currentCell.row][editorState.currentCell.col];
  const endCell = editorState.cellMatrix[editorState.currentCell.row + blocks - 1][editorState.currentCell.col];

  const newSubject = {
    id: editingSubject ? editingSubject.id : crypto.randomUUID(),
    name, // Ya está sanitizado arriba
    color,
    row: editorState.currentCell.row, col: editorState.currentCell.col, day: editorState.currentCell.col,
    blocks, jornada: targetCell.jornada,
    // Sanitizamos el resto de campos secundarios
    group: escapeHTML(subjectGroupInput ? subjectGroupInput.value.trim() : ""),
    program: escapeHTML(subjectProgramInput ? subjectProgramInput.value.trim() : ""),
    aula: escapeHTML(subjectAulaInput ? subjectAulaInput.value.trim() : ""),
    credits: subjectCreditsInput && subjectCreditsInput.value ? parseInt(subjectCreditsInput.value) : 0,
    startMinutes: startCell.startMinutes, endMinutes: endCell.endMinutes,
    showCredits: document.getElementById("showCreditsCheckbox")?.checked || false,
    showGroup: document.getElementById("showGroupCheckbox")?.checked || false,
    showProgram: document.getElementById("showProgramCheckbox")?.checked || false,
    showAula: document.getElementById("showAulaCheckbox")?.checked || false
  };

  currentSchedule.subjects.push(newSubject);
  saveData();
  subjectModal.classList.remove("active");
  state.clearCurrentCell();
  cleanSubjectModalButtons();
  
  DOMRenderer.rebuildScheduleView();
  DOMRenderer.updateScheduleInfo();
};

function deleteSubject() {
  if(editorState.editingSubjectIndex === null) return;
  schedules[currentScheduleIndex].subjects.splice(editorState.editingSubjectIndex, 1);
  saveData();
  subjectModal.classList.remove("active");
  state.clearCurrentCell();
  editorState.editingSubjectIndex = null;
  cleanSubjectModalButtons();
  DOMRenderer.rebuildScheduleView();
  DOMRenderer.updateScheduleInfo();
}

function createDeleteButton(){
  const btn = document.createElement("button");
  btn.id = "deleteSubjectBtn";
  btn.textContent = "Eliminar asignatura";
  btn.style.background = "#b00020";
  btn.style.marginTop = "6px";
  btn.onclick = deleteSubject;
  return btn;
}

function createDuplicateButton(subject){
  const btn = document.createElement("button");
  btn.id = "duplicateSubjectBtn";
  btn.textContent = "Duplicar asignatura";
  btn.style.background = "#0066cc";
  btn.style.marginTop = "6px";
  btn.onclick = () => {
      subjectModal.classList.remove("active");
      state.startDuplication({...subject});
      editorState.editingSubjectIndex = null;
      state.clearCurrentCell();
  };
  return btn;
}

function cleanSubjectModalButtons(){
  ["#deleteSubjectBtn", "#duplicateSubjectBtn"].forEach(id => {
    const btn = subjectModal.querySelector(id);
    if(btn) btn.remove();
  });
}

// ==========================================
// 6. SISTEMA DE EXPORTACIÓN E IMPORTACIÓN (JSON)
// ==========================================
document.getElementById("exportScheduleBtn").onclick = () => {
  if (currentScheduleIndex === null) return alert("Abre un horario primero.");
  const jsonString = safeJSONStringify([schedules[currentScheduleIndex]], '[]');
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${schedules[currentScheduleIndex].name.replace(/\s+/g, "_").toLowerCase()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

document.getElementById("importSchedulesBtn").onclick = () => document.getElementById("importFileInput").click();

document.getElementById("importFileInput").onchange = (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      let imported = safeJSONParse(event.target.result);
      if (!imported) return alert("Archivo JSON inválido");
      if(!Array.isArray(imported)) imported = [imported];
      
      let count = 0;
      imported.forEach(schedule => {
        if (!validateScheduleSchema(schedule)) {
          if (Array.isArray(schedule.subjects)) schedule.subjects = schedule.subjects.map(normalizeSubject);
          const exists = schedules.some(s => s.name === schedule.name && s.created === schedule.created);
          if (!exists) { schedules.push(schedule); count++; }
        }
      });
      
      saveData(); renderSchedules();
      if(currentScheduleIndex !== null) DOMRenderer.rebuildScheduleView();
      alert(`${count} horario(s) importado(s).`);
    } catch(err) { alert("Error de importación."); }
    document.getElementById("importFileInput").value = "";
  };
  reader.readAsText(file);
};

// ==========================================
// 7. SISTEMA DE AGUINALDO
// ==========================================

function populateMonths(){
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  monthSelect.innerHTML = "";
  months.forEach((m, i) => { const opt = document.createElement("option"); opt.value = i; opt.textContent = m; monthSelect.appendChild(opt); });
  const today = new Date(); monthSelect.value = today.getMonth(); yearInput.value = today.getFullYear();
}

document.getElementById("calculateMonthlyBtn").onclick = () => {
  if (currentScheduleIndex === null) return alert("Abre un horario primero.");
  monthlyModal.classList.add("active");
  resultadoAguinaldo.style.display = "none";
};

confirmMonthlyBtn.onclick = () => {
  const config = { minGapMinutes: Number(gapInput.value)||0, transportCost: Number(transportInput.value)||0, snackCost: Number(snackInput.value)||0, year: Number(yearInput.value), month: Number(monthSelect.value) };
  const subjects = normalizeSubjectsForCalculation(schedules[currentScheduleIndex].subjects);
  const result = calculateMonthlyCost(subjects, config, excludedDaysSet);
  
  resultadoAguinaldo.style.display = "block";
  resultadoAguinaldo.innerHTML = `
    <div class="aguinaldo-layout">
      <div class="aguinaldo-main">
        <p><strong>Total viajes:</strong> ${result.totalTrips}</p>
        <p><strong>Días con clase:</strong> ${result.totalSnackDays}</p>
        <p><strong>Total aguinaldo:</strong> $${result.totalCost.toLocaleString()}</p>
        <button type="button" id="openDetailBtn">Ver detalle por día →</button>
      </div>
    </div>
  `;
  dailyDetailData = result.dailyDetails;
  setTimeout(() => document.getElementById("openDetailBtn").onclick = openDailyDetailModal, 0);
};

function openDailyDetailModal() {
  document.getElementById("monthlyDetailContent").innerHTML = `<ul>${dailyDetailData.map(d => `<li><strong>${d.dayName}</strong> - Viajes: ${d.trips}</li>`).join("")}</ul>`;
  document.getElementById("dailyDetailModal").classList.add("active");
}
function closeDailyDetailModal() { document.getElementById("dailyDetailModal").classList.remove("active"); }

document.getElementById("backToResultBtn").onclick = closeDailyDetailModal;

// Localiza esto en la sección 7 de app.js y reemplázalo:
document.getElementById("openCalendarBtn").onclick = () => { 
  document.getElementById("monthlyModal").classList.remove("active"); 
  renderCalendarGrid(); 
  document.getElementById("excludeDaysModal").classList.add("active"); 
};

document.getElementById("backToAguinaldoBtn").onclick = () => { 
  document.getElementById("excludeDaysModal").classList.remove("active"); 
  document.getElementById("monthlyModal").classList.add("active"); 
};

function renderCalendarGrid() {
  const grid = document.getElementById("calendarGrid");
  const countSpan = document.getElementById("excludeDaysCount");
  const year = Number(yearInput.value);
  const month = Number(monthSelect.value); 
  
  grid.innerHTML = "";
  
  // Encabezados: Solo Lunes a Sábado
  const daysOfWeek = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  daysOfWeek.forEach(d => {
    const el = document.createElement("div");
    el.className = "calendar-day-header";
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Ajuste de inicio de semana (0=Lunes, 5=Sábado, 6=Domingo)
  let startingDay = firstDay.getDay() - 1;
  if (startingDay === -1) startingDay = 6; 

  // Espacios en blanco iniciales (evitando el domingo)
  for (let i = 0; i < startingDay; i++) {
    if (i < 6) { // Si el espacio cae en lunes-sábado
        const blank = document.createElement("div");
        blank.style.visibility = "hidden"; 
        grid.appendChild(blank);
    }
  }
  
  let excludedCount = 0;

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i);
    const dayOfWeek = date.getDay(); // 0=Domingo
    
    if (dayOfWeek === 0) continue; // SALTAR DOMINGOS

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayBtn = document.createElement("button");
    dayBtn.className = "calendar-day";
    dayBtn.type = "button"; // Evita recargas de página
    dayBtn.textContent = i;
    
    // Aplicar clases de estilos desde calculadora-aguinaldo.js
    if (isHoliday(date)) dayBtn.classList.add("calendar-day-holiday");
    else if (isHolyWeek(date)) dayBtn.classList.add("calendar-day-holyweek");
    
    if (excludedDaysSet.has(dateStr)) {
      dayBtn.classList.add("calendar-day-excluded");
      excludedCount++;
    }
    
    dayBtn.onclick = () => {
      if (excludedDaysSet.has(dateStr)) {
        excludedDaysSet.delete(dateStr);
        dayBtn.classList.remove("calendar-day-excluded");
        excludedCount--;
      } else {
        excludedDaysSet.add(dateStr);
        dayBtn.classList.add("calendar-day-excluded");
        excludedCount++;
      }
      countSpan.textContent = excludedCount === 0 ? "Ningún día excluido" : `${excludedCount} día(s) excluido(s)`;
    };
    grid.appendChild(dayBtn);
  }
  countSpan.textContent = excludedCount === 0 ? "Ningún día excluido" : `${excludedCount} día(s) excluido(s)`;
}

document.getElementById("backToAguinaldoBtn").onclick = () => document.getElementById("excludeDaysModal").classList.remove("active");

// ==========================================
// 8. SISTEMA DE CHANGELOG
// ==========================================
async function initChangelog() {
  const cacheBuster = Date.now();
  try {
    const res = await fetch(`changelog.json?v=${cacheBuster}`);
    const data = await res.json();
    if(data && data.length > 0) {
      const latest = data[0].version;
      if(SafeStorage.getItem(APP_CONFIG.LAST_VERSION_KEY) !== latest) changelogAlert.style.display = "inline-flex";
    }
  } catch (e) {}
}

changelogBtn.addEventListener("click", async () => {
  changelogPanel.classList.add("open");
  if(changelogOverlay) changelogOverlay.classList.add("active");
  const res = await fetch(`changelog.json?v=${Date.now()}`);
  const data = await res.json();
  document.getElementById("changelogContent").innerHTML = data.map(entry => `
    <div class="changelog-entry">
      <h3>Versión ${entry.version}</h3>
      <ul>${entry.changes.map(c => `<li>${c}</li>`).join("")}</ul>
      <div class="date">Fecha: ${entry.date}</div>
    </div>
  `).join("");
  SafeStorage.setItem(APP_CONFIG.LAST_VERSION_KEY, data[0].version);
  changelogAlert.style.display = "none";
});

document.getElementById("closeChangelogBtn").onclick = () => { changelogPanel.classList.remove("open"); if(changelogOverlay) changelogOverlay.classList.remove("active"); };
if(changelogOverlay) changelogOverlay.onclick = () => document.getElementById("closeChangelogBtn").click();


// CONTROL DEL FAB MENU (MÓVIL)
const fabContainer = document.getElementById("mobileFabContainer");
const fabBtn = document.getElementById("mainFabBtn");
const fabOverlay = document.getElementById("fabOverlay");

function toggleFabMenu() {
  const isActive = fabContainer.classList.toggle("active");
  fabOverlay.classList.toggle("active", isActive);
}

fabBtn.addEventListener("click", toggleFabMenu);
fabOverlay.addEventListener("click", toggleFabMenu);

// Cerrar menú al hacer clic en cualquier opción
document.querySelectorAll(".fab-menu button").forEach(btn => {
  btn.addEventListener("click", () => {
    toggleFabMenu();
  });
});


// ==========================================
// 9. EVENTOS GLOBALES (Cerrar Modales)
// ==========================================
document.querySelectorAll(".close-btn").forEach(btn => {
  btn.onclick = () => {
    btn.closest(".modal").classList.remove("active");
    if(btn.closest(".modal").id === "subjectModal") {
      state.cancelDuplication();
      cleanSubjectModalButtons();
    }
  };
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.isDuplicating()) { state.cancelDuplication(); return; }
    if (typeof SidebarPanel !== "undefined" && SidebarPanel.isOpen) return;
    
    const activeModal = document.querySelector(".modal.active");
    if (activeModal) {
      // Si es el calendario, usamos su botón de retroceso específico
      if (activeModal.id === "excludeDaysModal") {
        document.getElementById("backToAguinaldoBtn").click();
      } else {
        activeModal.querySelector(".close-btn")?.click();
      }
    }
  }
});