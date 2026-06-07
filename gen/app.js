/* =========================================
   SISTEMA DE VISTAS
   ========================================= */
function hasUnsavedChanges() {
  const inputCarrera = document.getElementById('input-carrera-nombre');
  if (inputCarrera && inputCarrera.value !== "Ingeniería de Sistemas") return true;

  const inputCalNombre = document.getElementById('input-calendario-nombre');
  if (inputCalNombre && inputCalNombre.value !== "2026-1") return true;

  const inputCalAnio = document.getElementById('input-calendario-anio');
  if (inputCalAnio && parseInt(inputCalAnio.value) !== 2026) return true;

  const initialMallaDataStr = JSON.stringify({
    carrera: "Ingeniería de Sistemas",
    semestres: [
      { numero: 1, materias: [{ id: "SIS-101", nombre: "Cálculo I", creditos: 4, prerrequisitos: [], desbloquea: [] }] }
    ]
  });
  if (JSON.stringify(mallaData) !== initialMallaDataStr) return true;

  const initialCalendarioDataStr = JSON.stringify({
    semestre_activo: "2026-1",
    eventos: []
  });
  if (JSON.stringify(calendarioData) !== initialCalendarioDataStr) return true;

  return false;
}

window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = '';
  }
});

function switchView(viewId) {
  if (viewId === 'view-home' && hasUnsavedChanges()) {
    if (!confirm("Tienes cambios sin guardar en tu flujo de trabajo. ¿Estás seguro de que deseas salir y volver al inicio?")) {
      return;
    }
  }
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  if (viewId === 'view-mallas') setTimeout(drawConnections, 100);
  if (viewId === 'view-calendarios') setTimeout(renderCalendariosGrid, 100);
}

/* =========================================
   LÓGICA DE MALLAS ACADÉMICAS
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

  // Calcular el número máximo de materias para adaptar el grid de forma responsiva
  let maxMaterias = 1;
  if (mallaData.semestres) {
    mallaData.semestres.forEach(sem => {
      if (sem.materias && sem.materias.length > maxMaterias) {
        maxMaterias = sem.materias.length;
      }
    });
  }
  container.style.setProperty('--max-materias', maxMaterias);

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
      card.addEventListener('mouseenter', () => highlightMateriaConnections(mat.id));
      card.addEventListener('mouseleave', () => resetMateriaConnections());
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
window.saveMateria = function () {
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
window.deleteCurrentMateria = function () {
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
    showToast(`Acción bloqueada: Vincular "${sourceId}" con "${targetId}" crea un bucle infinito.`);
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
        if (sourceEl && targetEl) drawLine(sourceEl, targetEl, svg, mat.id, targetId);
      });
    });
  });
}

function drawLine(el1, el2, svg, sourceId, targetId) {
  const rect1 = el1.getBoundingClientRect();
  const rect2 = el2.getBoundingClientRect();
  const canvasRect = svg.getBoundingClientRect();
  const x1 = rect1.right - canvasRect.left;
  const y1 = rect1.top + (rect1.height / 2) - canvasRect.top;
  const x2 = rect2.left - canvasRect.left;
  const y2 = rect2.top + (rect2.height / 2) - canvasRect.top;

  // Determine relative column indices
  const col1 = el1.closest('.semester-col');
  const col2 = el2.closest('.semester-col');
  const cols = Array.from(document.querySelectorAll('.semester-col'));
  const idx1 = cols.indexOf(col1);
  const idx2 = cols.indexOf(col2);
  const diff = idx2 - idx1;

  // Stable hash based color
  const str = sourceId + "->" + targetId;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const isDark = document.body.classList.contains('dark-mode') || true;
  const lightness = isDark ? 62 : 46;
  const color = `hsl(${hue}, 85%, ${lightness}%)`;

  let pathData;
  if (diff > 1) {
    // Route above or below
    const container = document.getElementById('semesters-container');
    const containerRect = container.getBoundingClientRect();
    const topLimit = containerRect.top - canvasRect.top;
    const bottomLimit = containerRect.bottom - canvasRect.top;

    const offsetVal = (Math.abs(hash) % 6) * 6; // Offset to prevent overlap (0, 6, 12, 18, 24, 30)
    const midY = (topLimit + bottomLimit) / 2;
    const goAbove = (y1 + y2) / 2 < midY;
    
    let yRef;
    if (goAbove) {
      yRef = topLimit - 12 - offsetVal;
      if (yRef < 12) yRef = 12;
    } else {
      yRef = bottomLimit + 12 + offsetVal;
    }

    // Trayectoria ortogonal ("carretera") que sube/baja por canal exterior
    pathData = `M ${x1} ${y1} ` +
               `L ${x1 + 15} ${y1} ` +
               `L ${x1 + 15} ${yRef} ` +
               `L ${x2 - 15} ${yRef} ` +
               `L ${x2 - 15} ${y2} ` +
               `L ${x2} ${y2}`;
  } else {
    // Direct link between adjacent columns (escalón de 90 grados)
    const xMid = (x1 + x2) / 2;
    pathData = `M ${x1} ${y1} ` +
               `L ${xMid} ${y1} ` +
               `L ${xMid} ${y2} ` +
               `L ${x2} ${y2}`;
  }

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", "3");
  path.setAttribute("fill", "none");
  path.classList.add("connection-line");
  path.setAttribute("data-source", sourceId);
  path.setAttribute("data-target", targetId);
  path.style.setProperty('--line-shadow-color', color);
  svg.appendChild(path);
}

function highlightMateriaConnections(hoveredId) {
  // Encontrar la materia hovered para obtener sus prerrequisitos y desbloqueados directos
  let hoveredMat = null;
  mallaData.semestres.forEach(sem => {
    sem.materias.forEach(mat => {
      if (mat.id === hoveredId) hoveredMat = mat;
    });
  });
  if (!hoveredMat) return;

  const prereqs = hoveredMat.prerrequisitos || [];
  const unlocks = hoveredMat.desbloquea || [];

  // Recorrer todas las materias para aplicar clases de atenuación o iluminación
  mallaData.semestres.forEach(sem => {
    sem.materias.forEach(mat => {
      const card = document.getElementById(`node-${mat.id}`);
      if (!card) return;

      if (mat.id === hoveredId) {
        card.classList.add('hover-active');
      } else if (prereqs.includes(mat.id)) {
        card.classList.add('hover-prereq');
      } else if (unlocks.includes(mat.id)) {
        card.classList.add('hover-unlock');
      } else {
        card.classList.add('hover-dimmed');
      }
    });
  });

  // Resaltar líneas correspondientes en SVG
  document.querySelectorAll('.connection-line').forEach(path => {
    const src = path.getAttribute('data-source');
    const tgt = path.getAttribute('data-target');
    if (src === hoveredId || tgt === hoveredId) {
      path.classList.add('line-active');
    } else {
      path.classList.add('line-dimmed');
    }
  });
}

function resetMateriaConnections() {
  document.querySelectorAll('.materia-card').forEach(card => {
    card.classList.remove('hover-active', 'hover-prereq', 'hover-unlock', 'hover-dimmed');
  });
  document.querySelectorAll('.connection-line').forEach(path => {
    path.classList.remove('line-active', 'line-dimmed');
  });
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
  e.target.innerText = isLinkMode ? "Modo Vincular: ON" : "Modo Vincular: OFF";
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

// Importar Malla JSON
document.getElementById('input-file-malla').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (!data.carrera || !Array.isArray(data.semestres)) {
        showToast('Estructura de JSON de malla académica inválida. Debe contener "carrera" y un arreglo "semestres".');
        return;
      }
      
      for (const sem of data.semestres) {
        if (typeof sem.numero !== 'number' || !Array.isArray(sem.materias)) {
          showToast('Cada semestre debe incluir un "numero" y un arreglo de "materias".');
          return;
        }
        for (const mat of sem.materias) {
          if (!mat.id || !mat.nombre || typeof mat.creditos !== 'number' || !Array.isArray(mat.prerrequisitos) || !Array.isArray(mat.desbloquea)) {
            showToast('Estructura de materia inválida. Debe incluir id, nombre, creditos (número), prerrequisitos y desbloquea (arreglos).');
            return;
          }
        }
      }

      mallaData = data;
      document.getElementById('input-carrera-nombre').value = mallaData.carrera;
      renderMallasGrid();
      showToast('Malla académica cargada correctamente.');
    } catch (err) {
      showToast('Error al parsear el archivo JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('grid-canvas').addEventListener('scroll', drawConnections);
window.addEventListener('resize', drawConnections);

/* =========================================
   LÓGICA DE CALENDARIOS ACADÉMICOS
   ========================================= */
let calendarioData = {
  semestre_activo: "2026-1",
  eventos: []
};

let activeMonths = new Set([1, 2, 3, 4, 5]); // default: Feb, Mar, Abr, May, Jun
let selectedAnio = 2026;
let editingEventId = null; // null significa creación
let selectedClickDateStr = null;
let loadedEventIds = [];
let currentModalDate = null;

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

    const dayNumber = document.createElement('span');
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    // Buscar si el día es fecha de inicio o fin de algún evento
    const dayEvents = events.filter(ev => dateStr === ev.inicio || dateStr === ev.fin);

    if (dayEvents.length > 0) {
      cell.classList.add('has-event');
      // En lugar de pintar el fondo, ponemos los puntos indicadores
      cell.style.background = 'rgba(255,255,255,0.03)';
      cell.style.color = '#ffffff';

      const dotsContainer = document.createElement('div');
      dotsContainer.style.display = 'flex';
      dotsContainer.style.gap = '3px';
      dotsContainer.style.justifyContent = 'center';
      dotsContainer.style.marginTop = '4px';
      dotsContainer.style.flexWrap = 'wrap';
      dotsContainer.style.maxWidth = '100%';

      dayEvents.forEach(ev => {
        const dot = document.createElement('div');
        dot.style.width = '6px';
        dot.style.height = '6px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = ev.color_css;
        dotsContainer.appendChild(dot);
      });

      cell.appendChild(dotsContainer);
      cell.style.display = 'flex';
      cell.style.flexDirection = 'column';
      cell.style.alignItems = 'center';
      cell.style.justifyContent = 'center';

      cell.onclick = (e) => {
        e.stopPropagation();
        openEventModal(dateStr);
      };
    } else {
      cell.onclick = (e) => {
        e.stopPropagation();
        openEventModal(dateStr);
      };
    }

    grid.appendChild(cell);
  }

  monthCard.appendChild(grid);
  return monthCard;
}

// Helper function to render a single event block HTML
function getEventBlockHTML(ev, defaultDateStr) {
  const isEdit = !!ev;
  const id = isEdit ? ev.id : '';
  const titulo = isEdit ? ev.titulo : '';
  const inicio = isEdit ? ev.inicio : defaultDateStr;
  const fin = isEdit ? ev.fin : defaultDateStr;
  const color = isEdit ? ev.color_css : 'var(--cal-academico)';
  const desc = isEdit ? (ev.descripcion || '') : '';
  const alerta = isEdit ? !!ev.alerta : false;
  const diasAlerta = isEdit ? (ev.diasAlerta !== undefined ? ev.diasAlerta : 5) : 5;

  const blockId = 'block-' + Math.random().toString(36).substr(2, 9);

  return `
  <div class="event-block" data-id="${id}" style="border: 1px solid var(--glass-border); padding: 1.5rem; border-radius: 8px; background: rgba(0,0,0,0.2); position: relative;">
    <button type="button" class="btn btn-danger" onclick="this.closest('.event-block').remove()" style="position: absolute; top: 1rem; right: 1rem; padding: 0.4rem 0.8rem; font-size: 0.8rem;">Eliminar</button>
    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
      <div style="flex: 1.2; min-width: 280px; display: flex; flex-direction: column; gap: 1rem;">
        <input type="hidden" class="block-id" value="${id}">
        <div class="form-group" style="margin-bottom: 0;">
          <label>Título del Evento</label>
          <input type="text" class="block-titulo glass-input" style="margin-top: 0.3rem;" placeholder="Ej: Inicio de Clases" value="${titulo}">
        </div>
        <div style="display: flex; gap: 1rem;">
          <div class="form-group" style="flex: 1; margin-bottom: 0;">
            <label>Fecha de Inicio</label>
            <input type="date" class="block-inicio glass-input" style="margin-top: 0.3rem;" value="${inicio}">
          </div>
          <div class="form-group" style="flex: 1; margin-bottom: 0;">
            <label>Fecha de Fin</label>
            <input type="date" class="block-fin glass-input" style="margin-top: 0.3rem;" value="${fin}">
          </div>
        </div>
      </div>
      <div style="flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 1rem;">
        <div class="form-group" style="margin-bottom: 0;">
          <label>Categoría / Color</label>
          <select class="block-color glass-input" style="margin-top: 0.3rem; background-color: #1e1e1e;">
            <option value="var(--cal-academico)" ${color === 'var(--cal-academico)' ? 'selected' : ''}>Académico (Azul)</option>
            <option value="var(--cal-evaluacion)" ${color === 'var(--cal-evaluacion)' ? 'selected' : ''}>Evaluación (Rojo)</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0; flex: 1; display: flex; flex-direction: column;">
          <label>Descripción</label>
          <textarea class="block-desc glass-input" rows="3" style="margin-top: 0.3rem; flex: 1; min-height: 70px; resize: vertical; font-family: inherit;" placeholder="Descripción opcional...">${desc}</textarea>
        </div>
        <div style="border: 1px solid var(--glass-border); padding: 0.8rem; border-radius: 8px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 0.6rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <input type="checkbox" id="alerta-${blockId}" class="block-alerta" style="width: 16px; height: 16px; cursor: pointer;" ${alerta ? 'checked' : ''} onchange="document.getElementById('dias-${blockId}').style.display = this.checked ? 'block' : 'none'">
            <label for="alerta-${blockId}" style="margin-bottom: 0; cursor: pointer; user-select: none; font-size: 0.9rem;">Activar Alerta de Notificación</label>
          </div>
          <div id="dias-${blockId}" style="display: ${alerta ? 'block' : 'none'};">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 0.2rem;">
              <span style="font-size: 0.8rem; color: rgba(255,255,255,0.7);">Días de anticipación:</span>
              <input type="number" class="block-dias glass-input" min="0" max="30" value="${diasAlerta}" style="width: 70px; margin-top: 0; padding: 0.2rem 0.4rem; font-size: 0.85rem; text-align: center;">
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}

// Abrir Modal de Eventos (Ahora maneja un día y sus múltiples eventos)
function openEventModal(dateStr) {
  currentModalDate = dateStr;
  const container = document.getElementById('events-blocks-container');
  container.innerHTML = '';

  const dayEvents = calendarioData.eventos.filter(ev => dateStr === ev.inicio || dateStr === ev.fin);
  loadedEventIds = dayEvents.map(e => e.id);

  const titleEl = document.getElementById('event-modal-title');
  const dateObj = new Date(dateStr + 'T00:00:00');
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  titleEl.innerHTML = `Eventos para el <b>${dateObj.toLocaleDateString('es-ES', options)}</b>`;

  if (dayEvents.length > 0) {
    dayEvents.forEach(ev => {
      container.insertAdjacentHTML('beforeend', getEventBlockHTML(ev, dateStr));
    });
  } else {
    // Si no hay eventos, muestra un bloque vacío para crear
    container.insertAdjacentHTML('beforeend', getEventBlockHTML(null, dateStr));
  }

  document.getElementById('event-modal').classList.add('active');
}

window.addNewEventBlock = function () {
  const container = document.getElementById('events-blocks-container');
  container.insertAdjacentHTML('beforeend', getEventBlockHTML(null, currentModalDate));
};

// Cerrar Modal de Eventos
function closeEventModal() {
  document.getElementById('event-modal').classList.remove('active');
  loadedEventIds = [];
  currentModalDate = null;
}
window.closeEventModal = closeEventModal;

// Guardar Eventos del Modal
window.saveEvent = function () {
  const blocks = document.querySelectorAll('.event-block');

  // 1. Recopilar IDs que todavía están en el modal
  const idsInForm = Array.from(blocks).map(b => b.dataset.id).filter(id => id !== '');

  // 2. Identificar IDs borrados (estaban cargados pero ya no están en el DOM)
  const deletedIds = loadedEventIds.filter(id => !idsInForm.includes(id));

  // 3. Borrar del estado global
  calendarioData.eventos = calendarioData.eventos.filter(e => !deletedIds.includes(e.id));

  let hasErrors = false;

  // 4. Actualizar o crear eventos desde los bloques
  blocks.forEach(block => {
    const idInput = block.querySelector('.block-id').value;
    const titulo = block.querySelector('.block-titulo').value.trim();
    const inicio = block.querySelector('.block-inicio').value;
    const fin = block.querySelector('.block-fin').value;
    const color_css = block.querySelector('.block-color').value;
    const descripcion = block.querySelector('.block-desc').value.trim();
    const alerta = block.querySelector('.block-alerta').checked;
    const diasAlerta = parseInt(block.querySelector('.block-dias').value) || 0;

    if (!titulo || !inicio || !fin) {
      showToast('Título y fechas son requeridas en todos los eventos.');
      hasErrors = true;
      return;
    }
    if (inicio > fin) {
      showToast('La fecha de inicio no puede ser posterior a la de fin.');
      hasErrors = true;
      return;
    }

    let id = idInput;
    if (!id) {
      // Auto-generar ID
      const tituloNormalizado = titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const partesFecha = inicio.split("-");
      const mes = partesFecha[1] || "01";
      const dia = partesFecha[2] || "01";
      const rnd = Math.floor(100 + Math.random() * 900);
      id = `${tituloNormalizado}-${mes}-${dia}-${rnd}`;
    }

    const newEvent = { id, titulo, inicio, fin, color_css, descripcion, alerta, diasAlerta };

    if (idInput) {
      // Actualizar
      const idx = calendarioData.eventos.findIndex(e => e.id === id);
      if (idx > -1) calendarioData.eventos[idx] = newEvent;
      else calendarioData.eventos.push(newEvent); // fallback
    } else {
      // Añadir nuevo
      calendarioData.eventos.push(newEvent);
    }
  });

  if (hasErrors) return;

  closeEventModal();
  renderCalendariosGrid();
};

// Eliminar Evento antiguo por compatibilidad (ya no se usa el botón suelto, pero por si acaso)
window.deleteCurrentEvent = function () {
  closeEventModal();
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

// Importar Calendario JSON
document.getElementById('input-file-calendario').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (!data.semestre_activo || !Array.isArray(data.eventos)) {
        showToast('Estructura de JSON de calendario académica inválida. Debe contener "semestre_activo" y un arreglo "eventos".');
        return;
      }

      for (const ev of data.eventos) {
        if (!ev.id || !ev.titulo || !ev.inicio || !ev.fin || !ev.color_css) {
          showToast('Cada evento debe incluir id, titulo, inicio, fin y color_css.');
          return;
        }
      }

      calendarioData = data;
      document.getElementById('input-calendario-nombre').value = calendarioData.semestre_activo;
      
      if (calendarioData.eventos.length > 0) {
        const firstEventDate = new Date(calendarioData.eventos[0].inicio + 'T00:00:00');
        if (!isNaN(firstEventDate.getTime())) {
          selectedAnio = firstEventDate.getFullYear();
          document.getElementById('input-calendario-anio').value = selectedAnio;
        }

        const monthsInEvents = new Set();
        calendarioData.eventos.forEach(ev => {
          const dInit = new Date(ev.inicio + 'T00:00:00');
          const dEnd = new Date(ev.fin + 'T00:00:00');
          if (!isNaN(dInit.getTime())) monthsInEvents.add(dInit.getMonth());
          if (!isNaN(dEnd.getTime())) monthsInEvents.add(dEnd.getMonth());
        });

        if (monthsInEvents.size > 0) {
          activeMonths = monthsInEvents;
          document.querySelectorAll('.month-badge').forEach(badge => {
            const m = parseInt(badge.dataset.month);
            if (activeMonths.has(m)) {
              badge.classList.add('active');
            } else {
              badge.classList.remove('active');
            }
          });
        }
      }

      renderCalendariosGrid();
      showToast('Calendario académico cargado correctamente.');
    } catch (err) {
      showToast('Error al parsear el archivo JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* =========================================
   ESCUCHADORES DE TECLADO Y ATAJOS
   ========================================= */

// Escuchador global de teclado para ESC y ENTER
document.addEventListener('keydown', (e) => {
  // ESC: Cerrar modales activos
  if (e.key === 'Escape') {
    const materiaModal = document.getElementById('materia-modal');
    const eventModal = document.getElementById('event-modal');

    if (materiaModal && materiaModal.classList.contains('active')) {
      closeModal();
    }
    if (eventModal && eventModal.classList.contains('active')) {
      closeEventModal();
    }
  }

  // ENTER: Guardar cambios en el modal activo
  if (e.key === 'Enter') {
    const activeEl = document.activeElement;
    if (!activeEl) return;

    // Modal de Materias
    const materiaModal = document.getElementById('materia-modal');
    if (materiaModal && materiaModal.classList.contains('active')) {
      if (activeEl.closest('#materia-modal')) {
        e.preventDefault();
        saveMateria();
      }
    }

    // Modal de Eventos
    const eventModal = document.getElementById('event-modal');
    if (eventModal && eventModal.classList.contains('active')) {
      if (activeEl.closest('#event-modal')) {
        // Permitir saltos de línea normales en el textarea de descripción
        if (activeEl.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        saveEvent();
      }
    }
  }
});

// Arrancar la app en el Home por defecto
switchView('view-home');
renderMallasGrid();
