const MinihorariosUI = {

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
    
    const inicioMin = this.horaAMinutos(horario.inicio);
    const finMin = this.horaAMinutos(horario.fin);
    
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
        horaFin: this.minutosAHora(bloqueFin),
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
        diasUsados.add(horario.dia);
        jornadas[horario.jornada]++;
        
        const minutos = this.horaAMinutos(horario.fin) - this.horaAMinutos(horario.inicio);
        totalHoras += minutos;
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
      console.error('Índice de combinación inválido:', index);
      return;
    }
    
    const combinacion = this.combinacionesActuales[index];
    console.log('Usando combinación', index + 1);
    console.log('Asignaturas:', combinacion.length);
    
    // Cargar combinación en el horario principal
    if (typeof CargadorCombinaciones !== 'undefined') {
      CargadorCombinaciones.cargarCombinacion(combinacion, index);
    } else {
      console.error('CargadorCombinaciones no está disponible');
      alert('Error: Sistema de carga no disponible');
    }
  },
  
  descartarCombinacion(index) {
    console.log('Descartando combinación:', index);
    
    // Descartar en el motor
    if (typeof MotorCombinaciones !== 'undefined') {
      const descartada = MotorCombinaciones.descartarCombinacion(index);
      
      if (descartada) {
        // Actualizar vista en sidebar
        if (typeof SidebarPanel !== 'undefined') {
          SidebarPanel.actualizarMinihorarios();
          SidebarPanel.mostrarBotonRegenerar();
        }
        

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
    const partes = hora.split(':');
    return parseInt(partes[0]) * 60 + parseInt(partes[1]);
  },
  
  limpiar() {
    this.combinacionesActuales = [];
  }
};

window.MinihorariosUI = MinihorariosUI;
console.log('MinihorariosUI cargado');
