export const MotorCombinaciones = {
  
  asignaturasSeleccionadas: [],
  maxCombinaciones: 5,
  combinaciones: [],
  todasLasCombinaciones: [],  // Todas las combinaciones generadas
  combinacionesDescartadas: [],  // IDs de combinaciones descartadas
  siguienteCombinacionId: 1,
  MAX_COMBINACIONES_EXPLORADAS: 10000,
  MAX_COMBINACIONES_MUESTRA: 1000,
  estadisticasGeneracion: {
    totalTeoricas: 0,
    totalExploradas: 0,
    totalValidasExploradas: 0,
    esParcial: false,
    usaMuestreo: false
  },
  
  MAX_ASIGNATURAS: 8,

  agregarAsignatura(asignatura) {
    const existe = this.asignaturasSeleccionadas.find(a => a.id === asignatura.id);
    
    if (existe) {
      return false;
    }

    if (this.asignaturasSeleccionadas.length >= this.MAX_ASIGNATURAS) {
      return 'limite';
    }
    
    this.asignaturasSeleccionadas.push(asignatura);


    
    return true;
  },
  
  eliminarAsignatura(asignaturaId) {
    const index = this.asignaturasSeleccionadas.findIndex(a => a.id === asignaturaId);
    
    if (index === -1) {

      return false;
    }
    
    const eliminada = this.asignaturasSeleccionadas.splice(index, 1)[0];

    
    return true;
  },
  
  limpiarAsignaturas() {
    this.asignaturasSeleccionadas = [];

  },
  
  setMaxCombinaciones(max) {
    if (max < 1 || max > 10) {

      return false;
    }
    
    this.maxCombinaciones = max;

    return true;
  },
  
  generarCombinaciones() {
    if (this.asignaturasSeleccionadas.length === 0) {

      this.combinaciones = []; // Limpiar combinaciones
      return {
        exito: false,
        mensaje: 'Debes seleccionar al menos una asignatura',
        combinaciones: []
      };
    }
    



    
    // Aplicar filtros a cada asignatura
    const gruposPorAsignatura = this.asignaturasSeleccionadas.map(asig => {
      let gruposFiltrados = asig.grupos;
      
      // Aplicar filtros si existen
      if (asig.filtros) {
        // Filtro por grupos permitidos
        if (asig.filtros.gruposPermitidos && asig.filtros.gruposPermitidos.length > 0) {
          gruposFiltrados = gruposFiltrados.filter(g => 
            asig.filtros.gruposPermitidos.includes(g.grupo)
          );

        }
        
        // Filtro por programas permitidos
        if (asig.filtros.programasPermitidos && asig.filtros.programasPermitidos.length > 0) {
          gruposFiltrados = gruposFiltrados.filter(g => 
            asig.filtros.programasPermitidos.includes(g.programa)
          );

        }
        
        // Filtro por profesores permitidos
        if (asig.filtros.profesoresPermitidos && asig.filtros.profesoresPermitidos.length > 0) {
          gruposFiltrados = gruposFiltrados.filter(g => 
            asig.filtros.profesoresPermitidos.includes(g.profesor)
          );

        }
      }
      
      return {
        asignatura: asig,
        grupos: gruposFiltrados
      };
    });
    
    // Validar que todas las asignaturas tengan al menos un grupo
    const asignaturasSinGrupos = gruposPorAsignatura.filter(g => g.grupos.length === 0);
    if (asignaturasSinGrupos.length > 0) {
      const nombres = asignaturasSinGrupos.map(g => g.asignatura.nombre).join(', ');
      return {
        exito: false,
        mensaje: `Las siguientes asignaturas no tienen grupos disponibles con los filtros aplicados: ${nombres}`,
        combinaciones: []
      };
    }
    
    const totalGruposMin = Math.min(...gruposPorAsignatura.map(g => g.grupos.length));

    
    this.siguienteCombinacionId = 1;
    const resultadoGeneracion = this.generarTodasLasCombinaciones(gruposPorAsignatura);
    const combinacionesValidas = resultadoGeneracion.combinaciones;
    

    
    if (combinacionesValidas.length === 0) {
      this.combinaciones = []; // Limpiar combinaciones
      return {
        exito: false,
        mensaje: 'No hay combinaciones posibles sin conflictos de horario',
        combinaciones: []
      };
    }
    
    const combinacionesOrdenadas = this.ordenarCombinaciones(combinacionesValidas);
    
    // Guardar TODAS las combinaciones disponibles
    this.todasLasCombinaciones = combinacionesOrdenadas;
    this.estadisticasGeneracion = {
      totalTeoricas: resultadoGeneracion.totalTeoricas,
      totalExploradas: resultadoGeneracion.totalExploradas,
      totalValidasExploradas: resultadoGeneracion.totalValidas,
      esParcial: resultadoGeneracion.esParcial,
      usaMuestreo: resultadoGeneracion.usaMuestreo
    };
    
    // Reiniciar descartadas al generar nuevas combinaciones
    this.combinacionesDescartadas = [];
    
    // Mostrar solo las primeras según maxCombinaciones
    const combinacionesLimitadas = combinacionesOrdenadas.slice(0, this.maxCombinaciones);
    


    
    // Guardar combinaciones mostradas
    this.combinaciones = combinacionesLimitadas;
    
    return {
      exito: true,
      mensaje: 'Combinaciones generadas correctamente',
      combinaciones: combinacionesLimitadas,
      totalGeneradas: resultadoGeneracion.totalExploradas,
      totalValidas: resultadoGeneracion.totalValidas,
      totalDisponibles: this.todasLasCombinaciones.length,
      totalTeoricas: resultadoGeneracion.totalTeoricas,
      totalExploradas: resultadoGeneracion.totalExploradas,
      esParcial: resultadoGeneracion.esParcial,
      usaMuestreo: resultadoGeneracion.usaMuestreo
    };
  },
  
  // Descartar una combinación específica y obtener una nueva
  descartarCombinacion(index) {
    if (index < 0 || index >= this.combinaciones.length) {

      return false;
    }
    

    
    // Marcar como descartada
    const combinacion = this.combinaciones[index];
    if (combinacion && combinacion.combinacionId !== undefined) {
      this.combinacionesDescartadas.push(combinacion.combinacionId);
    }
    
    // Eliminar de las mostradas
    this.combinaciones.splice(index, 1);
    
    // Buscar la siguiente combinación disponible
    const siguienteCombinacion = this.obtenerSiguienteCombinacion();
    
    if (siguienteCombinacion) {
      // Agregar la nueva combinación
      this.combinaciones.push(siguienteCombinacion);

    } else {

    }
    
    return true;
  },
  
  // Obtener la siguiente combinación no descartada
  obtenerSiguienteCombinacion() {
    for (let i = 0; i < this.todasLasCombinaciones.length; i++) {
      // Saltar si está descartada
      const combinacion = this.todasLasCombinaciones[i];
      if (this.combinacionesDescartadas.includes(combinacion.combinacionId)) {
        continue;
      }
      
      // Saltar si ya está en las mostradas
      const yaEstaMostrada = this.combinaciones.some(
        comb => comb.combinacionId === combinacion.combinacionId
      );
      
      if (!yaEstaMostrada) {
        return this.todasLasCombinaciones[i];
      }
    }
    
    return null;
  },
  
  // Regenerar combinaciones (limpiar descartadas)
  regenerarCombinaciones() {

    
    // Limpiar descartadas
    this.combinacionesDescartadas = [];
    
    // Volver a mostrar las primeras N combinaciones
    this.combinaciones = this.todasLasCombinaciones.slice(0, this.maxCombinaciones);
    

    
    return {
      exito: true,
      combinaciones: this.combinaciones,
      totalDisponibles: this.todasLasCombinaciones.length
    };
  },
  
  // Obtener estadísticas
  obtenerEstadisticasCombinaciones() {
    return {
      mostradas: this.combinaciones.length,
      descartadas: this.combinacionesDescartadas.length,
      disponibles: this.todasLasCombinaciones.length,
      restantes: this.todasLasCombinaciones.length - this.combinacionesDescartadas.length - this.combinaciones.length,
      ...this.estadisticasGeneracion
    };
  },
  
  generarTodasLasCombinaciones(gruposPorAsignatura) {
    if (gruposPorAsignatura.length === 0) {
      return { combinaciones: [], totalTeoricas: 0, totalExploradas: 0, totalValidas: 0, esParcial: false, usaMuestreo: false };
    }

    const indices = new Array(gruposPorAsignatura.length).fill(0);
    const maxIndices = gruposPorAsignatura.map(g => g.grupos.length);

    const totalTeoricas = maxIndices.reduce((total, max) => total * max, 1);
    const limiteExploracion = Math.min(totalTeoricas, this.MAX_COMBINACIONES_EXPLORADAS);
    const muestra = [];
    let totalValidas = 0;
    let randomState = this.obtenerSemilla(gruposPorAsignatura);

    const siguienteAleatorio = () => {
      randomState = (randomState * 1664525 + 1013904223) >>> 0;
      return randomState / 4294967296;
    };

    for (let i = 0; i < limiteExploracion; i++) {
      const combinacion = [];

      for (let j = 0; j < gruposPorAsignatura.length; j++) {
        const grupo = gruposPorAsignatura[j].grupos[indices[j]];
        combinacion.push({
          asignatura: gruposPorAsignatura[j].asignatura,
          grupo: grupo
        });
      }

      if (!this.tieneConflictos(combinacion)) {
        const combinacionConId = this.crearCombinacion(combinacion);
        totalValidas++;

        if (muestra.length < this.MAX_COMBINACIONES_MUESTRA) {
          muestra.push(combinacionConId);
        } else {
          const indiceMuestra = Math.floor(siguienteAleatorio() * totalValidas);
          if (indiceMuestra < this.MAX_COMBINACIONES_MUESTRA) muestra[indiceMuestra] = combinacionConId;
        }
      }

      for (let k = gruposPorAsignatura.length - 1; k >= 0; k--) {
        indices[k]++;
        if (indices[k] < maxIndices[k]) {
          break;
        }
        indices[k] = 0;
      }
    }

    return {
      combinaciones: muestra,
      totalTeoricas,
      totalExploradas: limiteExploracion,
      totalValidas,
      esParcial: totalTeoricas > limiteExploracion,
      usaMuestreo: totalValidas > this.MAX_COMBINACIONES_MUESTRA
    };
  },

  obtenerSemilla(gruposPorAsignatura) {
    const source = gruposPorAsignatura
      .flatMap(entry => entry.grupos.map(group => `${entry.asignatura.id}:${group.id || group.grupo}`))
      .join('|');
    let hash = 2166136261;
    for (let index = 0; index < source.length; index++) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  },

  crearCombinacion(items) {
    const combinacion = [...items];
    combinacion.combinacionId = this.siguienteCombinacionId++;
    return combinacion;
  },
  
  tieneConflictos(combinacion) {
    for (let i = 0; i < combinacion.length; i++) {
      for (let j = i + 1; j < combinacion.length; j++) {
        if (this.hayConflictoEntreGrupos(combinacion[i].grupo, combinacion[j].grupo)) {
          return true;
        }
      }
    }
    return false;
  },
  
  hayConflictoEntreGrupos(grupo1, grupo2) {
    if (!grupo1.horarios || !grupo2.horarios) {
      return false;
    }
    
    for (const h1 of grupo1.horarios) {
      for (const h2 of grupo2.horarios) {
        if (h1.dia === h2.dia) {
          const i1 = this.normalizeHora(h1.inicio, h1.jornada || 'diurna');
          const f1 = this.normalizeHora(h1.fin,    h1.jornada || 'diurna');
          const i2 = this.normalizeHora(h2.inicio, h2.jornada || 'diurna');
          const f2 = this.normalizeHora(h2.fin,    h2.jornada || 'diurna');
          if (this.horasSeSolapan(i1, f1, i2, f2)) {
            return true;
          }
        }
      }
    }
    
    return false;
  },
  
  horasSeSolapan(inicio1, fin1, inicio2, fin2) {
    const min1 = this.horaAMinutos(inicio1);
    const max1 = this.horaAMinutos(fin1);
    const min2 = this.horaAMinutos(inicio2);
    const max2 = this.horaAMinutos(fin2);
    
    return (min1 < max2 && max1 > min2);
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
  
  ordenarCombinaciones(combinaciones) {
    return combinaciones.sort((a, b) => {
      const scoreA = this.calcularScoreCombinacion(a);
      const scoreB = this.calcularScoreCombinacion(b);
      return scoreB - scoreA;
    });
  },
  
  calcularScoreCombinacion(combinacion) {
    let score = 0;
    
    let totalDiurnas = 0;
    let totalNocturnas = 0;
    let diasUsados = new Set();
    
    for (const item of combinacion) {
      for (const horario of item.grupo.horarios) {
        if (horario.jornada === 'diurna') {
          totalDiurnas++;
        } else {
          totalNocturnas++;
        }
        diasUsados.add(horario.dia);
      }
    }
    
    score += totalDiurnas * 10;
    
    score += (7 - diasUsados.size) * 5;
    
    return score;
  },
  
  obtenerEstadisticas() {
    const total = this.asignaturasSeleccionadas.length;
    let totalGrupos = 0;
    
    for (const asig of this.asignaturasSeleccionadas) {
      totalGrupos += asig.grupos.length;
    }
    
    return {
      totalAsignaturas: total,
      totalGrupos: totalGrupos,
      maxCombinaciones: this.maxCombinaciones,
      asignaturas: this.asignaturasSeleccionadas.map(a => ({
        nombre: a.nombre,
        grupos: a.grupos.length
      }))
    };
  },

  // ==========================================
  // SOPORTE PARA WEB WORKERS (ASÍNCRONO)
  // ==========================================
  worker: null,
  
  initWorker() {
    if (!this.worker && typeof window !== 'undefined' && window.Worker) {
      this.worker = new Worker(new URL('./motor.worker.js', import.meta.url), { type: 'module' });
    }
  },

  generarCombinacionesAsync() {
    return new Promise((resolve) => {
      this.initWorker();
      if (!this.worker) {
        // Fallback síncrono si el navegador no soporta workers
        const res = this.generarCombinaciones();
        resolve(res);
        return;
      }

      this.worker.onmessage = (e) => {
        if (e.data.type === 'GENERATE_RESULT') {
          this.combinaciones = e.data.payload.combinaciones;
          this.todasLasCombinaciones = e.data.payload.todasLasCombinaciones || [];
          this.combinacionesDescartadas = e.data.payload.combinacionesDescartadas || [];
          this.estadisticasGeneracion = {
            totalTeoricas: e.data.payload.totalTeoricas || 0,
            totalExploradas: e.data.payload.totalExploradas || e.data.payload.totalGeneradas || 0,
            totalValidasExploradas: e.data.payload.totalValidas || 0,
            esParcial: e.data.payload.esParcial === true,
            usaMuestreo: e.data.payload.usaMuestreo === true
          };
          resolve(e.data.payload);
        } else if (e.data.type === 'ERROR') {
          resolve({ exito: false, mensaje: e.data.payload, combinaciones: [] });
        }
      };

      this.worker.postMessage({
        type: 'GENERATE',
        payload: {
          asignaturas: this.asignaturasSeleccionadas,
          maxCombinaciones: this.maxCombinaciones
        }
      });
    });
  },
  
  descartarCombinacionAsync(index) {
     return new Promise((resolve) => {
       if (!this.worker) {
         resolve(this.descartarCombinacion(index));
         return;
       }
       
       this.worker.onmessage = (e) => {
         if (e.data.type === 'DISCARD_RESULT') {
           this.combinaciones = e.data.payload.combinaciones;
           this.todasLasCombinaciones = e.data.payload.todasLasCombinaciones || [];
           this.combinacionesDescartadas = e.data.payload.combinacionesDescartadas || [];
           resolve(e.data.payload.success);
         }
       };
       
       this.worker.postMessage({
         type: 'DISCARD',
         payload: { index }
       });
     });
  },

  regenerarCombinacionesAsync() {
     return new Promise((resolve) => {
       if (!this.worker) {
         resolve(this.regenerarCombinaciones());
         return;
       }
       
       this.worker.onmessage = (e) => {
         if (e.data.type === 'REGENERATE_RESULT') {
           this.combinaciones = e.data.payload.combinaciones;
           this.todasLasCombinaciones = e.data.payload.todasLasCombinaciones || [];
           this.combinacionesDescartadas = e.data.payload.combinacionesDescartadas || [];
           resolve(e.data.payload);
         }
       };
       
       this.worker.postMessage({ type: 'REGENERATE' });
     });
  }
};
