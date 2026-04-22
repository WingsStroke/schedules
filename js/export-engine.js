"use strict";

// ==========================================
// EXPORT ENGINE (PDF & IMAGEN)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  
  // --- EXPORTACIÓN A PDF (FORMATO UdeC) ---
  function buildSubjectsScheduleData() {
    if (currentScheduleIndex === null) return [];
    const map = {};
    schedules[currentScheduleIndex].subjects.forEach(sub => {
      const timeText = `${diasSemana[sub.day]} ${minutesToTime(sub.startMinutes)} - ${minutesToTime(sub.endMinutes)}`;
      const key = `${sub.name}||${sub.group}||${sub.program}||${sub.color}`;
      if (!map[key]) map[key] = { name: sub.name, group: sub.group || "", program: sub.program || "", times: [] };
      map[key].times.push(timeText);
    });
    return Object.values(map).map(item => ({ name: item.name, schedule: item.times.join(" / "), group: item.group, program: item.program }));
  }

  document.getElementById("exportPdfBtn").addEventListener("click", () => {
    if (currentScheduleIndex === null) return;
    const data = buildSubjectsScheduleData();
    const tbody = document.getElementById("exportPdfPreviewBody");
    tbody.innerHTML = "";
    if (data.length === 0) tbody.innerHTML = `<tr><td colspan="4" class="export-pdf-empty">No hay asignaturas</td></tr>`;
    else data.forEach(item => { tbody.innerHTML += `<tr><td>${item.name}</td><td>${item.schedule}</td><td style="text-align:center">${item.group || "—"}</td><td>${item.program || "—"}</td></tr>`; });
    document.getElementById("exportPdfModal").classList.add("active");
  });

  document.getElementById("confirmExportPdfBtn").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const body = buildSubjectsScheduleData().map(i => [i.name, i.schedule, i.group || "", i.program || ""]);
    doc.autoTable({ head: [["Asignatura", "Horario", "Grupo", "Programa"]], body: body, theme: "grid" });
    doc.save("Formato_UdeC.pdf");
    document.getElementById("exportPdfModal").classList.remove("active");
  });

  // --- EXPORTACIÓN A IMAGEN (CANVAS) ---
  window._previewCache = window._previewCache || {}; 

  async function actualizarPreviewImagen() {
    const includeDiurna = document.getElementById("exportDiurna").checked;
    const includeNocturna = document.getElementById("exportNocturna").checked;
    const enhancedExport = document.getElementById("exportEnhanced").checked;
    const hideEmptyCols = document.getElementById("exportHideEmpty").checked;
    
    const previewImg = document.getElementById("exportImagePreviewImg");
    const previewLoading = document.getElementById("exportImagePreviewLoading");
    const confirmBtn = document.getElementById("confirmExportImageBtn");

    if (!includeDiurna && !includeNocturna) {
      previewImg.style.display = "none"; 
      previewLoading.textContent = "Selecciona al menos una jornada."; 
      confirmBtn.disabled = true; 
      return;
    }

    const cacheKey = `${currentScheduleIndex}:${includeDiurna}:${includeNocturna}:${enhancedExport}:${hideEmptyCols}`;
    
    if (window._previewCache[cacheKey]) {
      previewImg.src = window._previewCache[cacheKey]; 
      previewImg.style.display = "block"; 
      previewLoading.style.display = "none"; 
      confirmBtn.disabled = false; 
      confirmBtn.dataset.previewUrl = window._previewCache[cacheKey]; 
      return;
    }

    previewImg.style.display = "none"; 
    previewLoading.style.display = "block"; 
    previewLoading.textContent = "Generando vista previa...";
    confirmBtn.disabled = true;
    
    await new Promise(r => setTimeout(r, 50));

    try {
      const dataUrl = await generarCanvasExport(includeDiurna, includeNocturna, enhancedExport, hideEmptyCols);
      window._previewCache[cacheKey] = dataUrl; 
      previewImg.src = dataUrl; 
      previewImg.style.display = "block"; 
      previewLoading.style.display = "none"; 
      confirmBtn.disabled = false; 
      confirmBtn.dataset.previewUrl = dataUrl;
    } catch (err) { 
      console.error("[Exportación Error]:", err); 
      previewLoading.textContent = "Error al generar la vista previa."; 
    }
  }

  document.getElementById("exportBtn").onclick = () => {
    if (currentScheduleIndex === null) return;
    document.getElementById("exportImageModal").classList.add("active");
    actualizarPreviewImagen();
  };

  ["exportDiurna", "exportNocturna", "exportHideEmpty", "exportEnhanced"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      if (document.getElementById("exportImageModal").classList.contains("active")) actualizarPreviewImagen();
    });
  });

  document.getElementById("confirmExportImageBtn").onclick = () => {
    const dataUrl = document.getElementById("confirmExportImageBtn").dataset.previewUrl;
    if (!dataUrl) return;
    const link = document.createElement("a"); link.href = dataUrl; link.download = "horario.png"; link.click();
    document.getElementById("exportImageModal").classList.remove("active");
  };

  async function generarCanvasExport(includeDiurna, includeNocturna, enhancedExport, hideEmptyCols) {
    const originalTable = document.getElementById("schedule");
    const activeDays = new Set(schedules[currentScheduleIndex].subjects.map(s => s.day));
    const numCols = hideEmptyCols ? (1 + activeDays.size) : 7;
    const cellHeight = enhancedExport ? 100 : 70; 

    const ghostContainer = document.createElement("div");
    ghostContainer.style.cssText = `position: absolute; top: 0; left: -9999px; width: 1200px; z-index: -1; visibility: visible;`;
    
    const cloneTable = document.createElement("table");
    cloneTable.id = "scheduleExportClone"; 
    cloneTable.className = originalTable.className;
    cloneTable.style.cssText = "width: 1200px !important; min-width: 1200px !important; table-layout: fixed; border-collapse: collapse; background: white;";

    const cloneThead = document.createElement("thead");
    const newHeadRow = document.createElement("tr");
    ["Hora", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].forEach((text, i) => {
      const dayIndex = i - 1;
      if (i === 0 || !hideEmptyCols || activeDays.has(dayIndex)) {
        const th = document.createElement("th");
        th.textContent = text;
        th.style.cssText = "background: #000; color: #fff; padding: 10px; border: 1px solid #ddd; text-align: center;";
        newHeadRow.appendChild(th);
      }
    });
    cloneThead.appendChild(newHeadRow);
    cloneTable.appendChild(cloneThead);

    const cloneTbody = document.createElement("tbody");
    const originalRows = Array.from(originalTable.querySelectorAll("tbody tr"));

    originalRows.forEach((originalRow) => {
      const jornada = originalRow.dataset.jornada;
      if (originalRow.querySelector(".jornada-header")) {
          const isNocturna = originalRow.querySelector(".nocturna-divider");
          if ((!isNocturna && includeDiurna) || (isNocturna && includeNocturna)) {
              const clonedHeaderRow = originalRow.cloneNode(true);
              const headerTd = clonedHeaderRow.querySelector(".jornada-header");
              if (headerTd) {
                  headerTd.colSpan = numCols;
                  headerTd.style.position = "static";
              }
              cloneTbody.appendChild(clonedHeaderRow);
          }
          return;
      }
      if ((jornada === "diurna" && !includeDiurna) || (jornada === "nocturna" && !includeNocturna)) return;

      const cloneRow = document.createElement("tr");
      const originalTimeCell = originalRow.querySelector(".time");
      if (originalTimeCell) {
        const timeCell = originalTimeCell.cloneNode(true);
        timeCell.style.cssText = `position: static; background: #f5f5f5; border: 1px solid #ddd; text-align: center; height: ${cellHeight}px;`;
        cloneRow.appendChild(timeCell);
      }

      for (let i = 0; i < 6; i++) {
        if (!hideEmptyCols || activeDays.has(i)) {
          const newCell = document.createElement("td");
          newCell.className = "cell";
          newCell.style.cssText = `position: relative; border: 1px solid #ddd; height: ${cellHeight}px; padding: 0; box-sizing: border-box;`;
          
          const originalCell = originalRow.querySelectorAll(".cell")[i];
          if (originalCell && originalCell.innerHTML !== "") {
            newCell.innerHTML = originalCell.innerHTML;
            const clonedSubject = newCell.querySelector('.subject');
            if (clonedSubject) {
              const subjectId = clonedSubject.getAttribute('data-subject-id');
              const subjectData = schedules[currentScheduleIndex].subjects.find(s => s.id === subjectId);
              if (subjectData) {
                clonedSubject.style.height = `calc(${subjectData.blocks * cellHeight + (subjectData.blocks - 1)}px - 6px)`;
                const contentDiv = clonedSubject.querySelector('.subject-content');
                if (contentDiv) {
                  let safeName = subjectData.name;
                  if (safeName.length >= 35) safeName = safeName.substring(0, 32).trimEnd() + "...";
                  
                  const groupBadge = subjectData.showGroup && subjectData.group ? `<span class="subject-info subject-group">${subjectData.group}</span>` : "";
                  const creditsBadge = subjectData.showCredits && subjectData.credits ? `<span class="subject-info subject-credits">${subjectData.credits} cr</span>` : "";
                  
                  const progLine = subjectData.showProgram && subjectData.program ? `<div class="export-badge-wrapper"><span class="subject-program">${subjectData.program}</span></div>` : "";
                  const aulaLine = subjectData.showAula && subjectData.aula ? `<div class="export-badge-wrapper"><span class="subject-aula">${subjectData.aula}</span></div>` : "";
                  
                  contentDiv.innerHTML = `${groupBadge}${creditsBadge}<div class="subject-text-container"><div class="subject-name-wrapper">${safeName}</div>${progLine}${aulaLine}</div>`;
                }
              }
            }
          }
          cloneRow.appendChild(newCell);
        }
      }
      cloneTbody.appendChild(cloneRow);
    });

    cloneTable.appendChild(cloneTbody);
    if (enhancedExport) cloneTable.classList.add("export-enhanced");
    ghostContainer.appendChild(cloneTable);
    document.body.appendChild(ghostContainer);

    ghostContainer.offsetHeight; 
    await new Promise(resolve => setTimeout(resolve, 150)); 

    try {
      const dataUrl = await htmlToImage.toPng(cloneTable, {
        backgroundColor: document.body.classList.contains("dark-mode") ? "#121212" : "#ffffff",
        pixelRatio: 2,
        width: 1200,
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      return dataUrl;
    } finally {
      document.body.removeChild(ghostContainer);
    }
  }
});