"use strict";

const DOMRenderer = {
  getCellHeight() {
    const cell = document.querySelector(".cell");
    if (!cell) return 60;
    if (cell.offsetHeight > 0) return cell.offsetHeight;
    const comp = parseFloat(getComputedStyle(cell).height);
    return comp > 0 ? comp : 60;
  },

  rebuildScheduleView() {
    renderCache.renderedSubjects.clear();
    if (currentScheduleIndex === null) return;
    this.construirHorario();
    this.syncSubjectsWithGrid();
    this.renderSubjects();
    
    // Inicializar el escuchador de scroll para el diseño responsivo
    this.initScrollIndicator();
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
    header.innerHTML = `<td colspan="${diasSemana.length + 1}" class="jornada-header ${jornada === 'nocturna' ? 'nocturna-divider' : ''}">${titulo}</td>`;
    scheduleBody.appendChild(header);

    bloques.forEach((bloque) => {
      const rowIndex = editorState.globalRowIndex++;
      const row = document.createElement("tr");
      row.dataset.jornada = jornada;
      row.innerHTML = `<td class="time">${minutesToTime(bloque.startMinutes)} - ${minutesToTime(bloque.endMinutes)}</td>`;
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
          if (state.isDuplicating()) { 
            if (typeof placeDuplicatedSubject === 'function') placeDuplicatedSubject(rowIndex, colIndex); 
            return; 
          }
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
    
    renderCache.renderedSubjects.forEach((_, id) => {
      if (!currentMap.has(id)) {
        document.querySelector(`[data-subject-id="${id}"]`)?.remove();
        renderCache.renderedSubjects.delete(id);
      }
    });

    currentSchedule.subjects.forEach(sub => {
      document.querySelector(`[data-subject-id="${sub.id}"]`)?.remove();
      const baseCell = editorState.cellMatrix[sub.row]?.[sub.col];
      if (!baseCell || baseCell.jornada !== sub.jornada) return;

      const div = document.createElement("div");
      div.className = "subject";
      div.setAttribute("data-subject-id", sub.id);
      div.style.cssText = `position: absolute; top: 3px; left: 3px; width: calc(100% - 6px); height: calc(${sub.blocks * this.getCellHeight()}px - 6px); box-sizing: border-box; background: ${sub.color}; box-shadow: 0 2px 6px rgba(0,0,0,0.08); border-radius: 6px;`;
      
      div.innerHTML = `
        <div class="subject-content" style="background: ${sub.color}">
          <div title="${sub.name}">${this.truncarNombre(sub.name)}</div>
          ${sub.showProgram && sub.program ? `<div class="subject-program">${sub.program}</div>` : ""}
          ${sub.showAula && sub.aula ? `<div class="subject-aula">${sub.aula}</div>` : ""}
          ${sub.showGroup && sub.group ? `<span class="subject-info subject-group">${sub.group}</span>` : ""}
          ${sub.showCredits && sub.credits ? `<span class="subject-info subject-credits">${sub.credits} cr</span>` : ""}
        </div>
      `;
      div.onclick = (e) => { e.stopPropagation(); if(state.isDuplicating()){ state.cancelDuplication(); } else { openEditSubjectModal(sub); } };
      
      for (let i = 1; i < sub.blocks; i++) {
        const covered = editorState.cellMatrix[sub.row + i]?.[sub.col];
        if (covered) { covered.element.classList.add("blocked"); covered.element.style.borderTop = "none"; }
      }
      
      baseCell.element.appendChild(div);
      renderCache.renderedSubjects.set(sub.id, {...sub});
    });
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
function createGhostSubject(subject, cell) {
  removeGhostSubject();
  const div = document.createElement("div");
  div.className = "ghost-subject";
  div.style.cssText = `background: ${subject.color}; opacity: 0.35; pointer-events: none;`;
  cell.appendChild(div);
  editorState.ghostSubject = div;
}

function removeGhostSubject() { 
  if (editorState.ghostSubject) { 
    editorState.ghostSubject.remove(); 
    editorState.ghostSubject = null; 
  } 
}

function clearDuplicateVisualState() { 
  removeGhostSubject(); 
  document.querySelectorAll(".cell.active-root").forEach(c => { 
    c.classList.remove("active-root"); 
    c.style.removeProperty("--active-height"); 
  }); 
}

function setDuplicateCursor(active) { 
  document.body.style.cursor = active ? "copy" : "default"; 
  document.getElementById("duplicateBar").style.display = active ? "flex" : "none"; 
}