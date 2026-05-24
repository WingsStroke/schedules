import { getSubjectColor } from './core.js';
import { Toast } from './toast-system.js';
import { schedules, currentScheduleIndex, saveData } from './state-manager.js';
import { CargadorCombinaciones } from './cargador-combinaciones.js';
import { DOMRenderer } from './dom-renderer.js';
import { SidebarPanel } from './sidebar-panel.js';
import { MotorCombinaciones } from './motor-combinaciones.js';

export const MinihorariosUI = {
  combinacionesActuales: [],
  
  renderizarMinihorario(combinacion, index) {
    return `
      <div class="minihorario-card">
        <div class="minihorario-header">
          <h4>Combinación ${index + 1}</h4>
          <div class="minihorario-actions">
            <button 
              class="btn-descartar-combinacion" 
              onclick="MinihorariosUI.descartarCombinacion(${index})"
              title="Descartar y ver otra combinación"
            >
              ×
            </button>
            <button 
              class="btn-usar-combinacion" 
              onclick="MinihorariosUI.usarCombinacion(${index})"
            >
              Usar este horario
            </button>
          </div>
        </div>
        
        <div class="minihorario-asignaturas">
          ${combinacion.map(item => `
            <div class="mini-asignatura-tag">
              ${item.asignatura.nombre} (${item.grupo.grupo})
            </div>
          `).join('')}
        </div>
        
        <table class="mini-tabla">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Lun</th>
              <th>Mar</th>
              <th>Mie</th>
              <th>Jue</th>
              <th>Vie</th>
              <th>Sab</th>
            </tr>
          </thead>
          <tbody>
            ${this.renderizarFilasHorario(combinacion)}
          </tbody>
        </table>
        
        <div class="minihorario-info">
          ${this.generarInfoCombinacion(combinacion)}
        </div>
      </div>
    `;
  },
  
  construirDatosHorario(combinacion) {
    const bloques = [];
    
    for (const item of combinacion) {
      const color = this.generarColor(item.asignatura.nombre);
      
      for (const horario of item.grupo.horarios) {
        bloques.push({
          asignatura: item.asignatura.nombre,
          grupo: item.grupo.grupo,
          dia: horario.dia,
          inicio: horario.inicio,
          fin: horario.fin,
          jornada: horario.jornada,
          color: color
        });
      }
    }
    
    bloques.sort((a, b) => {
      const minutosA = this.horaAMinutos(a.inicio);
      const minutosB = this.horaAMinutos(b.inicio);
      return minutosA - minutosB;
    });
    
    return bloques;
  },
  
  renderizarFilasHorario(combinacion) {
    if (!combinacion || combinacion.length === 0) {
      return '<tr><td colspan="7" class="empty-schedule">Sin horarios</td></tr>';
    }
    
    // Obtener TODOS los bloques horarios
    const todosLosBloques = [];
    
    for (const item of combinacion) {
      const color = this.generarColor(item.asignatura.nombre);
      
      for (const horario of item.grupo.horarios) {
        // Calcular bloques que ocupa este horario
        const bloques = this.calcularBloquesHorario(horario);
        
        for (const bloque of bloques) {
          todosLosBloques.push({
            ...bloque,
            asignatura: item.asignatura.nombre,
            grupo: item.grupo.grupo,
            color: color
          });
        }
      }
    }
    
    // Agrupar por hora de inicio
    const porHora = {};
    for (const bloque of todosLosBloques) {
      if (!porHora[bloque.horaInicio]) {
        porHora[bloque.horaInicio] = {};
      }
      porHora[bloque.horaInicio][bloque.dia] = bloque;
    }
    
    // Ordenar horas
    const horas = Object.keys(porHora).sort((a, b) => 
      this.horaAMinutos(a) - this.horaAMinutos(b)
    );
    
    // Renderizar tabla
    let html = '';
    for (const hora of horas) {
      html += '<tr>';
      
      // Encontrar hora de fin del primer bloque en esta fila
      let horaFin = null;
      for (const dia of ['L', 'M', 'W', 'J', 'V', 'S']) {
        const bloque = porHora[hora][dia];
        if (bloque && bloque.horaFin) {
          horaFin = bloque.horaFin;
          break;
        }
      }
      
      // Mostrar rango completo de hora
      html += `<td class="hora-col">${hora} - ${horaFin || hora}</td>`;
      
      const dias = ['L', 'M', 'W', 'J', 'V', 'S'];
      for (const dia of dias) {
        const bloque = porHora[hora][dia];
        
        if (bloque) {
          // Buscar información completa del grupo
          const infoCompleta = this.obtenerInfoCompleta(combinacion, bloque.asignatura, bloque.grupo);
          
          html += `
            <td class="mini-celda ocupada" 
                style="background: ${bloque.color}20; border-left: 3px solid ${bloque.color}"
                data-asignatura="${bloque.asignatura}"
                data-grupo="${bloque.grupo}"
                data-profesor="${infoCompleta.profesor || 'Sin profesor'}"
                data-programa="${infoCompleta.programa || 'Sin programa'}">
              <div class="mini-celda-content">
                <span class="mini-asig-nombre">${this.abreviarNombre(bloque.asignatura)}</span>
                <span class="mini-grupo">${bloque.grupo}</span>
              </div>
              <div class="mini-tooltip">
                <div class="tooltip-title">${bloque.asignatura}</div>
                <div class="tooltip-info">
                  <div class="tooltip-item">
                    <span class="tooltip-label">Grupo:</span>
                    <span class="tooltip-value">${bloque.grupo}</span>
                  </div>
                  <div class="tooltip-item">
                    <span class="tooltip-label">Profesor:</span>
                    <span class="tooltip-value">${infoCompleta.profesor || 'Sin profesor'}</span>
                  </div>
                  <div class="tooltip-item">
                    <span class="tooltip-label">Carrera:</span>
                    <span class="tooltip-value">${infoCompleta.programa || 'Sin programa'}</span>
                  </div>
                </div>
              </div>
            </td>
          `;
        } else {
          html += '<td class="mini-celda vacia"></td>';
        }
      }
      
      html += '</tr>';
    }
    
    return html;
  },
  
  calcularBloquesHorario(horario) {
    const bloques = [];
    const jornada = horario.jornada || 'diurna';
    
    const inicioNorm = this.normalizeHora(horario.inicio, jornada);
    const finNorm    = this.normalizeHora(horario.fin,    jornada);
    const inicioMin = this.horaAMinutos(inicioNorm);
    const finMin    = this.horaAMinutos(finNorm);
    if (inicioMin <= 0 || finMin <= inicioMin) return bloques;
    
    const bloqueMinutos = jornada === 'diurna' ? 50 : 45;
    const inicioJornada = jornada === 'diurna' ? 7 * 60 : 17 * 60 + 30;
    
    // Calcular cuántos bloques completos caben
    const duracionTotal = finMin - inicioMin;
    const numBloques = Math.ceil(duracionTotal / bloqueMinutos);
    
    for (let i = 0; i < numBloques; i++) {
      const bloqueInicio = inicioMin + (i * bloqueMinutos);
      const bloqueFin = Math.min(bloqueInicio + bloqueMinutos, finMin);
      
      bloques.push({
        dia: horario.dia,
        horaInicio: this.minutosAHora(bloqueInicio),
        horaFin:    this.minutosAHora(bloqueFin),
        jornada: jornada
      });
    }
    
    return bloques;
  },
  
  minutosAHora(minutos) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  },
  
  abreviarNombre(nombre) {
    if (nombre.length <= 20) return nombre;
    
    const palabras = nombre.split(' ');
    if (palabras.length === 1) {
      return nombre.substring(0, 17) + '...';
    }
    
    return palabras.map(p => p[0].toUpperCase()).join('.');
  },
  
  generarInfoCombinacion(combinacion) {
    let totalHoras = 0;
    const diasUsados = new Set();
    let jornadas = { diurna: 0, nocturna: 0 };
    
    for (const item of combinacion) {
      for (const horario of item.grupo.horarios) {
        const jornada = horario.jornada || 'diurna';
        diasUsados.add(horario.dia);
        jornadas[jornada]++;
        const inicioNorm = this.normalizeHora(horario.inicio, jornada);
        const finNorm    = this.normalizeHora(horario.fin,    jornada);
        const minutos = this.horaAMinutos(finNorm) - this.horaAMinutos(inicioNorm);
        if (minutos > 0) totalHoras += minutos;
      }
    }
    
    const horasFormato = Math.floor(totalHoras / 60);
    const minutosFormato = totalHoras % 60;
    
    return `
      <div class="info-item">${diasUsados.size} días de clase</div>
      <div class="info-item">${horasFormato}h ${minutosFormato}m semanales</div>
      <div class="info-item">${jornadas.diurna > jornadas.nocturna ? 'Jornada diurna' : 'Jornada nocturna'}</div>
    `;
  },
  
  usarCombinacion(index) {
    if (index < 0 || index >= this.combinacionesActuales.length) {
      return Toast.show('Error: Combinación no encontrada', 'error');
    }
    
    const combinacion = this.combinacionesActuales[index];
    
    const aplicarHorarioDirecto = () => {
        try {
            // 1. Vaciamos las materias actuales silenciosamente.
            // Al vaciarlo, el módulo antiguo "CargadorCombinaciones" asume que 
            // es un horario nuevo y NO dispara su molesto alert() nativo.
            if (schedules[currentScheduleIndex] && schedules[currentScheduleIndex].subjects) {
                schedules[currentScheduleIndex].subjects = [];
            }

            // 2. Cargamos la nueva combinación
            if (typeof CargadorCombinaciones !== 'undefined') {
                CargadorCombinaciones.cargarCombinacion(combinacion, index);
            }

            // 3. Forzamos la actualización inmediata del DOM y la UI
            if (typeof saveData === 'function') saveData();
            if (typeof DOMRenderer !== 'undefined') {
                DOMRenderer.rebuildScheduleView();
                DOMRenderer.updateScheduleInfo();
            }
            
            // 4. Cerramos el panel lateral con estilo
            if (typeof SidebarPanel !== 'undefined') SidebarPanel.cerrar();
            
            Toast.show('Horario generado con éxito', 'success');

        } catch (error) {

            Toast.show('Hubo un error al aplicar el horario', 'error');
        }
    };

    // Verificar si el horario actual ya tiene asignaturas
    const currentSchedule = schedules[currentScheduleIndex];
    if (currentSchedule && currentSchedule.subjects && currentSchedule.subjects.length > 0) {
        // Disparar nuestro nuevo Toast interactivo
        Toast.confirm("Este horario ya tiene asignaturas. ¿Deseas sobreescribirlo?", aplicarHorarioDirecto);
    } else {
        // Si está vacío, aplicar inmediatamente sin preguntar
        aplicarHorarioDirecto();
    }
  },
  
  async descartarCombinacion(index) {
    if (typeof MotorCombinaciones !== 'undefined' && typeof SidebarPanel !== 'undefined') {
      // Mostrar loading en el minihorario específico
      const containerId = `minihorario-${index}`;
      const element = document.getElementById(containerId);
      if (element) {
        element.style.opacity = '0.5';
        element.style.pointerEvents = 'none';
      }

      const descartada = await MotorCombinaciones.descartarCombinacionAsync(index);
      
      if (descartada) {
        SidebarPanel.actualizarMinihorarios();
        SidebarPanel.mostrarBotonRegenerar();
      }
    }
  },
  
  generarColor(nombre) {
    return getSubjectColor(nombre);
  },
  
  obtenerInfoCompleta(combinacion, nombreAsignatura, grupo) {
    // Buscar en la combinación la asignatura y grupo específicos
    for (const item of combinacion) {
      if (item.asignatura.nombre === nombreAsignatura && item.grupo.grupo === grupo) {
        return {
          profesor: item.grupo.profesor || 'Sin profesor',
          programa: item.grupo.programa || 'Sin programa'
        };
      }
    }
    return {
      profesor: 'Sin profesor',
      programa: 'Sin programa'
    };
  },
  
  horaAMinutos(hora) {
    if (!hora || typeof hora !== 'string') return 0;
    const partes = hora.split(':');
    if (partes.length !== 2) return 0;
    const h = parseInt(partes[0], 10);
    const m = parseInt(partes[1], 10);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  },

  normalizeHora(hora, jornada) {
    if (!hora || typeof hora !== 'string') return hora;
    const partes = hora.split(':');
    if (partes.length !== 2) return hora;
    let h = parseInt(partes[0], 10);
    const m = partes[1];
    if (isNaN(h)) return hora;
    if (jornada === 'diurna'   && h >= 1 && h < 7)  h += 12;
    else if (jornada === 'nocturna' && h >= 1 && h < 5)  h += 12;
    return `${String(h).padStart(2, '0')}:${m}`;
  },
  
  limpiar() {
    this.combinacionesActuales = [];
  }
};
window.MinihorariosUI = MinihorariosUI;

