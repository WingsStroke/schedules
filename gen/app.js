/* =========================================
   🧭 SISTEMA DE VISTAS
   ========================================= */
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  if (viewId === 'view-mallas') setTimeout(drawConnections, 100);
  if (viewId === 'view-calendarios') setTimeout(renderCalendariosGrid, 100);
}

/* =========================================
   🕸️ LÓGICA DE MALLAS ACADÉMICAS
   ========================================= */
let mallaData = {
  carrera: "Ingeniería de Sistemas",
  semestres: [
    { numero: 1, materias: [{ id: "SIS-101", nombre: "Cálculo I", creditos: 4, prerrequisitos: [], desbloquea: [] }] }
  ]
};

let isLinkMode = false;
let sourceNodeId = null;
let editingMateriaRef = null; // Guarda la referencia de la materia editándose

// Render principal del Grid
function renderMallasGrid() {
  const container = document.getElementById('semesters-container');
  container.innerHTML = '';

  // Renderizar Columnas existentes
  mallaData.semestres.forEach(sem => {
    const col = document.createElement('div');
    col.className = 'semester-col';
    col.innerHTML = `<h3>Semestre ${sem.numero}</h3>`;

    sem.materias.forEach(mat => {
      const card = document.createElement('div');
      card.className = `materia-card ${sourceNodeId === mat.id ? 'linking-source' : ''}`;
      card.id = `node-${mat.id}`;
      card.innerHTML = `
        <strong>${mat.id}</strong><br>
        <span class="materia-name">${mat.nombre}</span>
        <small style="opacity: 0.7;">${mat.creditos} CR</small>
      `;
      card.onclick = () => handleNodeClick(mat.id);
      col.appendChild(card);
    });

    // Botón "+" para añadir materia a esta columna
    const btnAdd = document.createElement('div');
    btnAdd.className = 'add-materia-btn';
    btnAdd.innerText = '+ Añadir Materia';
    btnAdd.onclick = () => createNewMateria(sem.numero);
    col.appendChild(btnAdd);

    container.appendChild(col);
  });

  // Renderizar Columna Fantasma para añadir nuevos Semestres
  const addCol = document.createElement('div');
  addCol.className = 'add-semester-col';
  addCol.innerHTML = '<h2>+ Añadir Semestre</h2>';
  addCol.onclick = createNewSemester;
  container.appendChild(addCol);

  setTimeout(drawConnections, 50);
}

// Lógica de Clics en Nodos (Modo Edición vs Modo Vincular)
function handleNodeClick(id) {
  if (!isLinkMode) {
    openModal(id);
  } else {
    if (!sourceNodeId) {
      sourceNodeId = id;
      renderMallasGrid();
    } else {
      if (sourceNodeId !== id) validateAndCreateLink(sourceNodeId, id);
      sourceNodeId = null;
      renderMallasGrid();
    }
  }
}

/* --- CREADORES Y MODAL --- */
function createNewSemester() {
  const newNum = mallaData.semestres.length + 1;
  mallaData.semestres.push({ numero: newNum, materias: [] });
  renderMallasGrid();
}

function createNewMateria(semNumero) {
  const newId = `NUEVO-${Math.floor(Math.random() * 1000)}`;
  const semestre = mallaData.semestres.find(s => s.numero === semNumero);
  semestre.materias.push({ id: newId, nombre: "Nueva Materia", creditos: 3, prerrequisitos: [], desbloquea: [] });
  renderMallasGrid();
  // Abrir modal automáticamente para la nueva materia
  openModal(newId);
}

function openModal(id) {
  // Buscar la materia en los datos
  mallaData.semestres.forEach(sem => {
    sem.materias.forEach(mat => {
      if (mat.id === id) editingMateriaRef = mat;
    });
  });

  if (editingMateriaRef) {
    document.getElementById('mod-id').value = editingMateriaRef.id;
    document.getElementById('mod-nombre').value = editingMateriaRef.nombre;
    document.getElementById('mod-creditos').value = editingMateriaRef.creditos;
    document.getElementById('materia-modal').classList.add('active');
  }
}

function closeModal() {
  document.getElementById('materia-modal').classList.remove('active');
  editingMateriaRef = null;
}

// Guardar materia
window.saveMateria = function() {
  const oldId = editingMateriaRef.id;
  const newId = document.getElementById('mod-id').value.trim().replace(/\s+/g, '-').toUpperCase();

  // Validar si el nuevo ID ya existe en otra materia
  if (oldId !== newId) {
    let idExists = false;
    mallaData.semestres.forEach(sem => sem.materias.forEach(mat => { if (mat.id === newId) idExists = true; }));
    if (idExists) {
      showToast(`El ID ${newId} ya existe. Usa uno único.`);
      return;
    }

    // Actualizar dependencias globalmente si el ID cambió
    mallaData.semestres.forEach(sem => {
      sem.materias.forEach(mat => {
        // Reemplazar en prerrequisitos
        const preIdx = mat.prerrequisitos.indexOf(oldId);
        if (preIdx > -1) mat.prerrequisitos[preIdx] = newId;
        // Reemplazar en desbloquea
        const desIdx = mat.desbloquea.indexOf(oldId);
        if (desIdx > -1) mat.desbloquea[desIdx] = newId;
      });
    });
  }

  // Guardar nuevos datos
  editingMateriaRef.id = newId;
  editingMateriaRef.nombre = document.getElementById('mod-nombre').value;
  editingMateriaRef.creditos = parseInt(document.getElementById('mod-creditos').value) || 0;

  closeModal();
  renderMallasGrid();
};

// Eliminar materia
window.deleteCurrentMateria = function() {
  if (!confirm("¿Seguro que deseas eliminar esta materia? Se borrarán sus conexiones.")) return;

  const idToDelete = editingMateriaRef.id;

  // Borrar de todas las listas de prerrequisitos y desbloquea
  mallaData.semestres.forEach(sem => {
    sem.materias.forEach(mat => {
      mat.prerrequisitos = mat.prerrequisitos.filter(id => id !== idToDelete);
      mat.desbloquea = mat.desbloquea.filter(id => id !== idToDelete);
    });
    // Borrar la materia en sí
    sem.materias = sem.materias.filter(mat => mat.id !== idToDelete);
  });

  closeModal();
  renderMallasGrid();
};

window.closeModal = closeModal;

/* --- LÓGICA DE DIBUJO Y DEPENDENCIAS --- */
function validateAndCreateLink(sourceId, targetId) {
  if (hasCircularDependency(sourceId, targetId)) {
    showToast(`⚠️ Acción bloqueada: Vincular "${sourceId}" con "${targetId}" crea un bucle infinito.`);
    return;
  }
  let sourceMateria, targetMateria;
  mallaData.semestres.forEach(sem => sem.materias.forEach(mat => {
    if (mat.id === sourceId) sourceMateria = mat;
    if (mat.id === targetId) targetMateria = mat;
  }));
  if (sourceMateria && targetMateria) {
    if (!sourceMateria.desbloquea.includes(targetId)) sourceMateria.desbloquea.push(targetId);
    if (!targetMateria.prerrequisitos.includes(sourceId)) targetMateria.prerrequisitos.push(sourceId);
  }
}

function hasCircularDependency(sourceId, targetId) {
  if (sourceId === targetId) return true;
  const visited = new Set();
  let hasCycle = false;

  function traverseUnlocks(currentId) {
    if (hasCycle) return;
    if (currentId === sourceId) { hasCycle = true; return; }
    visited.add(currentId);
    let currentMateria;
    mallaData.semestres.forEach(sem => sem.materias.forEach(m => { if (m.id === currentId) currentMateria = m; }));
    if (currentMateria && currentMateria.desbloquea) {
      currentMateria.desbloquea.forEach(nextId => { if (!visited.has(nextId)) traverseUnlocks(nextId); });
    }
  }
  traverseUnlocks(targetId);
  return hasCycle;
}

function drawConnections() {
  const svg = document.getElementById('svg-layer');
  if (!svg) return;
  svg.innerHTML = '';
  const container = document.getElementById('grid-canvas');
  svg.style.width = `${container.scrollWidth}px`;
  svg.style.height = `${container.scrollHeight}px`;

  mallaData.semestres.forEach(sem => {
    sem.materias.forEach(mat => {
      mat.desbloquea.forEach(targetId => {
        const sourceEl = document.getElementById(`node-${mat.id}`);
        const targetEl = document.getElementById(`node-${targetId}`);
        if (sourceEl && targetEl) drawLine(sourceEl, targetEl, svg);
      });
    });
  });
}

function drawLine(el1, el2, svg) {
  const rect1 = el1.getBoundingClientRect();
  const rect2 = el2.getBoundingClientRect();
  const canvasRect = svg.getBoundingClientRect();
  const x1 = rect1.right - canvasRect.left;
  const y1 = rect1.top + (rect1.height / 2) - canvasRect.top;
  const x2 = rect2.left - canvasRect.left;
  const y2 = rect2.top + (rect2.height / 2) - canvasRect.top;
  const offset = 40; /* Reducido de 60 para acomodar columnas más estrechas */
  const pathData = `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("stroke", "var(--link-color)");
  path.setAttribute("stroke-width", "3");
  path.setAttribute("fill", "none");
  svg.appendChild(path);
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Toggle Botón Vincular
document.getElementById('btn-link-mode').onclick = (e) => {
  isLinkMode = !isLinkMode; sourceNodeId = null;
  e.target.innerText = isLinkMode ? "🔗 Modo Vincular: ON" : "🔗 Modo Vincular: OFF";
  e.target.style.backgroundColor = isLinkMode ? "var(--link-color)" : "";
  document.getElementById('grid-canvas').classList.toggle('link-mode-active', isLinkMode);
};

// Botón Exportar
document.getElementById('btn-export-malla').onclick = () => {
  mallaData.carrera = document.getElementById('input-carrera-nombre').value;
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mallaData, null, 2));
  const anchor = document.createElement('a');
  anchor.setAttribute("href", dataStr);
  anchor.setAttribute("download", "malla_" + mallaData.carrera.toLowerCase().replace(/\s+/g, '_') + ".json");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

document.getElementById('grid-canvas').addEventListener('scroll', drawConnections);
window.addEventListener('resize', drawConnections);

// Arrancar la app en el Home por defecto
switchView('view-home');
renderMallasGrid();

/* =========================================
   📅 LÓGICA DE CALENDARIOS ACADÉMICOS
   ========================================= */
let calendarioData = {
  semestre_activo: "2026-1",
  eventos: []
};

let activeMonths = new Set([1, 2, 3, 4, 5]); // default: Feb, Mar, Abr, May, Jun
let selectedAnio = 2026;
let editingEventId = null; // null significa creación
let selectedClickDateStr = null;

// Inicialización de escuchadores de Meses del Calendario
document.querySelectorAll('.month-badge').forEach(badge => {
  const m = parseInt(badge.dataset.month);
  if (activeMonths.has(m)) {
    badge.classList.add('active');
  }
  badge.onclick = (e) => {
    e.stopPropagation();
    if (activeMonths.has(m)) {
      if (activeMonths.size > 1) { // Mantener al menos un mes activo
        activeMonths.delete(m);
        badge.classList.remove('active');
      }
    } else {
      activeMonths.add(m);
      badge.classList.add('active');
    }
    renderCalendariosGrid();
  };
});

// Escuchador de Año
document.getElementById('input-calendario-anio').addEventListener('input', (e) => {
  selectedAnio = parseInt(e.target.value) || new Date().getFullYear();
  renderCalendariosGrid();
});

// Escuchador de Checkbox de Alerta en Modal
document.getElementById('event-alerta').addEventListener('change', (e) => {
  document.getElementById('event-dias-alerta-group').style.display = e.target.checked ? 'block' : 'none';
});

// Renderizado de Grids de Calendario
function renderCalendariosGrid() {
  const container = document.getElementById('calendarios-cards-container');
  if (!container) return;
  container.innerHTML = '';

  // Ordenar meses activos cromológicamente
  const sortedMonths = Array.from(activeMonths).sort((a, b) => a - b);

  sortedMonths.forEach(month => {
    const card = createBuilderMonthCard(selectedAnio, month, calendarioData.eventos);
    container.appendChild(card);
  });
}

// Crear Tarjeta Mensual para Creador de Calendarios
function createBuilderMonthCard(year, month, events) {
  const monthCard = document.createElement('div');
  monthCard.className = 'builder-month-card';

  const monthNames = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  // Título del Mes
  const title = document.createElement('div');
  title.className = 'builder-month-title';
  title.textContent = `${monthNames[month]} ${year}`;
  monthCard.appendChild(title);

  // Rejilla de Días
  const grid = document.createElement('div');
  grid.className = 'builder-days-grid';

  // Cabeceras de Día (Lunes a Domingo)
  const dayHeaders = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  dayHeaders.forEach(dh => {
    const el = document.createElement('div');
    el.className = 'builder-day-header';
    el.textContent = dh;
    grid.appendChild(el);
  });

  // Calcular offset del primer día de mes (Lunes=0, Domingo=6)
  const firstDay = new Date(year, month, 1);
  let dayOfWeek = firstDay.getDay(); 
  let offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Renderizar celdas vacías iniciales
  for (let i = 0; i < offset; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'builder-day-cell empty';
    grid.appendChild(emptyCell);
  }

  // Número total de días en el mes
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Renderizar cada día del mes
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'builder-day-cell';
    cell.textContent = day;

    // Buscar si el día está comprendido en el rango de algún evento
    const dayEvents = events.filter(ev => dateStr >= ev.inicio && dateStr <= ev.fin);

    if (dayEvents.length > 0) {
      cell.classList.add('has-event');
      cell.style.background = dayEvents[0].color_css;
      cell.style.color = '#ffffff';

      // Si tiene más de un evento superpuesto, agregar un borde indicador
      if (dayEvents.length > 1) {
        cell.style.border = '2px solid #ffffff';
      }

      // Al hacer clic, abre modal para editar el primer evento del día
      cell.onclick = (e) => {
        e.stopPropagation();
        openEventModal(dayEvents[0].id);
      };
    } else {
      // Al hacer clic, abre modal de creación preestableciendo la fecha
      cell.onclick = (e) => {
        e.stopPropagation();
        openEventModal(null, dateStr);
      };
    }

    grid.appendChild(cell);
  }

  monthCard.appendChild(grid);
  return monthCard;
}

// Abrir Modal de Eventos
function openEventModal(eventId = null, defaultDateStr = null) {
  editingEventId = eventId;
  selectedClickDateStr = defaultDateStr;

  const titleEl = document.getElementById('event-modal-title');
  const idInput = document.getElementById('event-id');
  const titleInput = document.getElementById('event-titulo');
  const inicioInput = document.getElementById('event-inicio');
  const finInput = document.getElementById('event-fin');
  const colorSelect = document.getElementById('event-color');
  const descInput = document.getElementById('event-desc');
  const alertaCheckbox = document.getElementById('event-alerta');
  const diasAlertaInput = document.getElementById('event-dias-alerta');
  const diasAlertaGroup = document.getElementById('event-dias-alerta-group');
  const deleteBtn = document.getElementById('btn-delete-event');

  if (eventId) {
    // Modo Edición
    titleEl.textContent = 'Editar Evento';
    deleteBtn.style.display = 'block';

    const ev = calendarioData.eventos.find(e => e.id === eventId);
    if (ev) {
      idInput.value = ev.id;
      idInput.disabled = true;
      titleInput.value = ev.titulo;
      inicioInput.value = ev.inicio;
      finInput.value = ev.fin;
      colorSelect.value = ev.color_css;
      descInput.value = ev.descripcion || '';
      alertaCheckbox.checked = !!ev.alerta;
      diasAlertaInput.value = ev.diasAlerta !== undefined ? ev.diasAlerta : 5;
      diasAlertaGroup.style.display = ev.alerta ? 'block' : 'none';
    }
  } else {
    // Modo Creación
    titleEl.textContent = 'Añadir Evento';
    deleteBtn.style.display = 'none';

    idInput.value = `evento-${Math.floor(Math.random() * 10000)}`;
    idInput.disabled = false;
    titleInput.value = '';
    inicioInput.value = defaultDateStr;
    finInput.value = defaultDateStr;
    colorSelect.value = 'var(--cal-academico)';
    descInput.value = '';
    alertaCheckbox.checked = false;
    diasAlertaInput.value = 5;
    diasAlertaGroup.style.display = 'none';
  }

  document.getElementById('event-modal').classList.add('active');
}

// Cerrar Modal de Eventos
function closeEventModal() {
  document.getElementById('event-modal').classList.remove('active');
  editingEventId = null;
  selectedClickDateStr = null;
}
window.closeEventModal = closeEventModal;

// Guardar Evento
window.saveEvent = function() {
  const idInput = document.getElementById('event-id');
  const titleInput = document.getElementById('event-titulo');
  const inicioInput = document.getElementById('event-inicio');
  const finInput = document.getElementById('event-fin');
  const colorSelect = document.getElementById('event-color');
  const descInput = document.getElementById('event-desc');
  const alertaCheckbox = document.getElementById('event-alerta');
  const diasAlertaInput = document.getElementById('event-dias-alerta');

  const id = idInput.value.trim().replace(/\s+/g, '-').toLowerCase();
  const titulo = titleInput.value.trim();
  const inicio = inicioInput.value;
  const fin = finInput.value;
  const color_css = colorSelect.value;
  const descripcion = descInput.value.trim();
  const alerta = alertaCheckbox.checked;
  const diasAlerta = parseInt(diasAlertaInput.value) || 0;

  if (!id) {
    showToast('El ID del evento es requerido.');
    return;
  }
  if (!titulo) {
    showToast('El título del evento es requerido.');
    return;
  }
  if (!inicio || !fin) {
    showToast('Las fechas de inicio y fin son requeridas.');
    return;
  }
  if (inicio > fin) {
    showToast('La fecha de inicio no puede ser posterior a la fecha de fin.');
    return;
  }

  const newEvent = {
    id,
    titulo,
    inicio,
    fin,
    color_css,
    descripcion,
    alerta,
    diasAlerta
  };

  if (editingEventId) {
    // Actualizar evento existente
    const idx = calendarioData.eventos.findIndex(e => e.id === editingEventId);
    if (idx > -1) {
      calendarioData.eventos[idx] = newEvent;
    }
  } else {
    // Añadir nuevo evento y validar ID único
    const idExists = calendarioData.eventos.some(e => e.id === id);
    if (idExists) {
      showToast(`El ID "${id}" ya está en uso.`);
      return;
    }
    calendarioData.eventos.push(newEvent);
  }

  closeEventModal();
  renderCalendariosGrid();
};

// Eliminar Evento
window.deleteCurrentEvent = function() {
  if (!editingEventId) return;
  if (!confirm('¿Seguro que deseas eliminar este evento?')) return;

  calendarioData.eventos = calendarioData.eventos.filter(e => e.id !== editingEventId);
  closeEventModal();
  renderCalendariosGrid();
};

// Botón Exportar Calendario
document.getElementById('btn-export-calendario').onclick = () => {
  calendarioData.semestre_activo = document.getElementById('input-calendario-nombre').value.trim();
  if (!calendarioData.semestre_activo) {
    showToast('El nombre del semestre activo es requerido.');
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(calendarioData, null, 2));
  const anchor = document.createElement('a');
  anchor.setAttribute("href", dataStr);
  anchor.setAttribute("download", calendarioData.semestre_activo + ".json");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};
