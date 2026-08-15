import { bloquesDiurnos, bloquesNocturnos, diasSemana, minutesToTime } from './core.js';
import { renderCache, currentScheduleIndex, state, editorState, schedules } from './state-manager.js';
import { openSubjectModal, openEditSubjectModal } from './main.js';

export const DOMRenderer = {
  getCellHeight() {
    const cell = document.querySelector(".cell");
    if (!cell) return 60;
    if (cell.offsetHeight > 0) return cell.offsetHeight;
    const comp = parseFloat(getComputedStyle(cell).height);
    return comp > 0 ? comp : 60;
  },

  rebuildScheduleView() {
    if (currentScheduleIndex === null) return;
    
    const scheduleBody = document.querySelector("#schedule tbody");
    
    // 🚀 OPTIMIZACIÓN: Solo construir la cuadrícula pesada una vez
    if (!editorState.cellMatrix || editorState.cellMatrix.length === 0 || !scheduleBody || scheduleBody.children.length === 0) {
      this.construirHorario();
    } else {
      // En vez de destruir el DOM, solo limpiamos los bloqueos visuales
      this.clearBlockedCells();
    }
    
    this.syncSubjectsWithGrid();
    this.renderSubjects();
    
    this.initScrollIndicator();
  },

  clearBlockedCells() {
    if (!editorState.cellMatrix) return;
    for (let r = 0; r < editorState.cellMatrix.length; r++) {
      for (let c = 0; c < editorState.cellMatrix[r].length; c++) {
        const cellData = editorState.cellMatrix[r][c];
        if (cellData && cellData.element) {
          cellData.element.classList.remove("blocked");
          cellData.element.style.borderTop = "";
        }
      }
    }
  },

  construirHorario() {
    state.cancelDuplication();
    const scheduleBody = document.querySelector("#schedule tbody");
    scheduleBody.innerHTML = "";
    editorState.cellMatrix = [];
    editorState.globalRowIndex = 0;
    this.construirSeccion("JORNADA DIURNA", bloquesDiurnos, "diurna");
    this.construirSeccion("JORNADA NOCTURNA", bloquesNocturnos, "nocturna");
  },

  // FUNCIÓN CORREGIDA - Asignación de dataset individual
  construirSeccion(titulo, bloques, jornada) {
    const scheduleBody = document.querySelector("#schedule tbody");
    const header = document.createElement("tr");
    header.dataset.jornada = jornada;
    const headerCell = document.createElement("td");
    headerCell.colSpan = diasSemana.length + 1;
    headerCell.className = `jornada-header ${jornada === 'nocturna' ? 'nocturna-divider' : ''}`;
    headerCell.textContent = titulo;
    header.appendChild(headerCell);
    scheduleBody.appendChild(header);

    bloques.forEach((bloque) => {
      const rowIndex = editorState.globalRowIndex++;
      const row = document.createElement("tr");
      row.dataset.jornada = jornada;
      const timeCell = document.createElement("td");
      timeCell.className = "time";
      timeCell.textContent = `${minutesToTime(bloque.startMinutes)} - ${minutesToTime(bloque.endMinutes)}`;
      row.appendChild(timeCell);
      const matrixRow = [];

      diasSemana.forEach((dia, colIndex) => {
        const cell = document.createElement("td");
        cell.className = "cell";
        cell.dataset.day = dia;
        cell.dataset.dayIndex = colIndex;
        cell.dataset.startMinutes = bloque.startMinutes;
        cell.dataset.endMinutes = bloque.endMinutes;
        cell.dataset.jornada = jornada;
        
        cell.onclick = (e) => {
          e.stopPropagation();
          if (state.isDuplicating()) return;
          openSubjectModal(rowIndex, colIndex);
        };
        
        cell.onmouseenter = () => { if (state.isDuplicating() && !cell.classList.contains("blocked")) createGhostSubject(editorState.duplicatingSubject, cell); };
        cell.onmouseleave = () => removeGhostSubject();

        matrixRow.push({ element: cell, day: dia, startMinutes: bloque.startMinutes, endMinutes: bloque.endMinutes, jornada, subject: null });
        row.appendChild(cell);
      });
      editorState.cellMatrix.push(matrixRow);
      scheduleBody.appendChild(row);
    });
  },

  syncSubjectsWithGrid() {
    const schedule = schedules[currentScheduleIndex];
    if (!schedule) return;
    schedule.subjects.forEach(sub => {
      if (typeof sub.row === "number" && typeof sub.col === "number") return;
      for (let r = 0; r < editorState.cellMatrix.length; r++) {
        const cell = editorState.cellMatrix[r][sub.day];
        if (cell && cell.startMinutes === sub.startMinutes && cell.jornada === sub.jornada) {
          sub.row = r; sub.col = sub.day; break;
        }
      }
    });
  },

  renderSubjects() {
    if (currentScheduleIndex === null) return;
    const currentSchedule = schedules[currentScheduleIndex];
    const currentMap = new Map(currentSchedule.subjects.map(s => [s.id, s]));
    
    // Limpiar materias que ya no existen
    renderCache.renderedSubjects.forEach((_, id) => {
      if (!currentMap.has(id)) {
        document.querySelector(`[data-subject-id="${id}"]`)?.remove();
        renderCache.renderedSubjects.delete(id);
      }
    });

    currentSchedule.subjects.forEach(sub => {
      const baseCell = editorState.cellMatrix[sub.row]?.[sub.col];
      if (!baseCell || baseCell.jornada !== sub.jornada) return;

      // Generar una firma única del estado de la materia
      const hash = `${sub.id}-${sub.row}-${sub.col}-${sub.blocks}-${sub.color}-${sub.name}-${sub.program}-${sub.aula}-${sub.group}-${sub.credits}-${sub.showProgram}-${sub.showAula}-${sub.showGroup}-${sub.showCredits}`;
      const cached = renderCache.renderedSubjects.get(sub.id);
      
      let div = document.querySelector(`[data-subject-id="${sub.id}"]`);

      // 🚀 OPTIMIZACIÓN: Si la materia no ha cambiado absolutamente nada, reutilizamos el DOM
      if (div && cached && cached._hash === hash) {
        this.applySubjectBlocks(sub);
        return;
      }

      // Si cambió o no existía, lo recreamos
      if (div) div.remove();

      div = document.createElement("div");
      div.className = "subject";
      div.setAttribute("data-subject-id", sub.id);
      div.style.cssText = `position: absolute; top: 3px; left: 3px; width: calc(100% - 6px); height: calc(${sub.blocks * this.getCellHeight()}px - 6px); box-sizing: border-box; background: ${sub.color}; box-shadow: 0 2px 6px rgba(0,0,0,0.08); border-radius: 6px;`;

      const content = document.createElement("div");
      content.className = "subject-content";
      content.style.background = sub.color;

      const name = document.createElement("div");
      name.title = sub.name ?? "";
      name.textContent = this.truncarNombre(sub.name ?? "");
      content.appendChild(name);

      if (sub.showProgram && sub.program) {
        const program = document.createElement("div");
        program.className = "subject-program";
        program.textContent = sub.program;
        content.appendChild(program);
      }

      if (sub.showAula && sub.aula) {
        const aula = document.createElement("div");
        aula.className = "subject-aula";
        aula.textContent = sub.aula;
        content.appendChild(aula);
      }

      if (sub.showGroup && sub.group) {
        const group = document.createElement("span");
        group.className = "subject-info subject-group";
        group.textContent = sub.group;
        content.appendChild(group);
      }

      if (sub.showCredits && sub.credits) {
        const credits = document.createElement("span");
        credits.className = "subject-info subject-credits";
        credits.textContent = `${sub.credits} cr`;
        content.appendChild(credits);
      }

      div.appendChild(content);
      
      // Asignar eventos de nuevo
      div.onclick = (e) => { 
        e.stopPropagation(); 
        if(state.isDuplicating()){ 
          state.cancelDuplication(); 
        } else { 
          openEditSubjectModal(sub); 
        } 
      };
      
      this.applySubjectBlocks(sub);
      
      baseCell.element.appendChild(div);
      
      // Guardar en caché con el nuevo hash
      renderCache.renderedSubjects.set(sub.id, {...sub, _hash: hash});
    });
  },

  applySubjectBlocks(sub) {
    for (let i = 1; i < sub.blocks; i++) {
      const covered = editorState.cellMatrix[sub.row + i]?.[sub.col];
      if (covered) { 
        covered.element.classList.add("blocked"); 
        covered.element.style.borderTop = "none"; 
      }
    }
  },

  truncarNombre(nombre, max = 40) {
    if (!nombre) return nombre;
    const limit = window.innerWidth <= 480 ? 18 : window.innerWidth <= 768 ? 22 : max;
    return nombre.length <= limit ? nombre : nombre.substring(0, limit).trimEnd() + "…";
  },

  updateScheduleInfo() {
    if (currentScheduleIndex === null) return;
    const uniqueSubjects = new Map();
    schedules[currentScheduleIndex].subjects.forEach(s => {
      if (!uniqueSubjects.has(s.name.toLowerCase())) uniqueSubjects.set(s.name.toLowerCase(), { credits: s.credits || 0 });
    });
    const totalCredits = Array.from(uniqueSubjects.values()).reduce((sum, s) => sum + s.credits, 0);
    document.getElementById("subjectCountInfo").textContent = `${uniqueSubjects.size} asignatura(s)`;
    document.getElementById("totalCreditsInfo").textContent = `${totalCredits} crédito(s)`;
  },

  // LÓGICA DE RESPONSIVIDAD: INDICADOR DE SCROLL
  initScrollIndicator() {
    const container = document.getElementById("scheduleContainer");
    if (!container) return;
    
    container.removeEventListener("scroll", DOMRenderer.updateScrollIndicator);
    window.removeEventListener("resize", DOMRenderer.updateScrollIndicator);
    
    container.addEventListener("scroll", DOMRenderer.updateScrollIndicator);
    window.addEventListener("resize", DOMRenderer.updateScrollIndicator);
    
    setTimeout(DOMRenderer.updateScrollIndicator, 150);
  },

  updateScrollIndicator() {
    const container = document.getElementById("scheduleContainer");
    const indicator = document.getElementById("scrollIndicator");
    if (!container || !indicator) return;

    if (window.innerWidth > 768) {
      indicator.style.display = "none";
      return;
    }

    const isScrollable = container.scrollWidth > container.clientWidth;
    if (!isScrollable) {
      indicator.style.display = "none";
      return;
    }

    indicator.style.display = "block";

    const isAtEnd = (container.scrollLeft + container.clientWidth) >= (container.scrollWidth - 5);
    
    if (isAtEnd) {
      indicator.classList.add("scroll-end");
    } else {
      indicator.classList.remove("scroll-end");
    }
  }
};

// ==========================================
// Funciones visuales globales (Ghost / Duplication)
// ==========================================
export function createGhostSubject(subject, cell) {
  removeGhostSubject();
  const div = document.createElement("div");
  div.className = "ghost-subject";
  div.style.cssText = `background: ${subject.color}; opacity: 0.35; pointer-events: none;`;
  cell.appendChild(div);
  editorState.ghostSubject = div;
}

export function removeGhostSubject() { 
  if (editorState.ghostSubject) { 
    editorState.ghostSubject.remove(); 
    editorState.ghostSubject = null; 
  } 
}

export function clearDuplicateVisualState() { 
  removeGhostSubject(); 
  document.querySelectorAll(".cell.active-root").forEach(c => { 
    c.classList.remove("active-root"); 
    c.style.removeProperty("--active-height"); 
  }); 
}

export function setDuplicateCursor(active) { 
  document.body.style.cursor = active ? "copy" : "default"; 
  document.getElementById("duplicateBar").style.display = active ? "flex" : "none"; 
}