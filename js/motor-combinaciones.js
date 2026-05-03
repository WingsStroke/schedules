const MotorCombinaciones = {
  
  asignaturasSeleccionadas: [],
  maxCombinaciones: 5,
  combinaciones: [],
  todasLasCombinaciones: [],  // Todas las combinaciones generadas
  combinacionesDescartadas: [],  // Ãndices de combinaciones descartadas
  
  agregarAsignatura(asignatura) {
    const existe = this.asignaturasSeleccionadas.find(a => a.id === asignatura.id);
    
    if (existe) {

      return false;
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

    
    const combinacionesGeneradas = this.generarTodasLasCombinaciones(gruposPorAsignatura);

    
    const combinacionesValidas = combinacionesGeneradas.filter(comb => {
      return !this.tieneConflictos(comb);
    });
    

    
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
    
    // Reiniciar descartadas al generar nuevas combinaciones
    this.combinacionesDescartadas = [];
    
    // Mostrar solo las primeras segÃºn maxCombinaciones
    const combinacionesLimitadas = combinacionesOrdenadas.slice(0, this.maxCombinaciones);
    


    
    // Guardar combinaciones mostradas
    this.combinaciones = combinacionesLimitadas;
    
    return {
      exito: true,
      mensaje: 'Combinaciones generadas correctamente',
      combinaciones: combinacionesLimitadas,
      totalGeneradas: combinacionesGeneradas.length,
      totalValidas: combinacionesValidas.length,
      totalDisponibles: this.todasLasCombinaciones.length
    };
  },
  
  // Descartar una combinaciÃ³n especÃ­fica y obtener una nueva
  descartarCombinacion(index) {
    if (index < 0 || index >= this.combinaciones.length) {

      return false;
    }
    

    
    // Marcar como descartada
    const indexEnTodasLasCombinaciones = this.todasLasCombinaciones.findIndex(
      comb => JSON.stringify(comb) === JSON.stringify(this.combinaciones[index])
    );
    
    if (indexEnTodasLasCombinaciones !== -1) {
      this.combinacionesDescartadas.push(indexEnTodasLasCombinaciones);
    }
    
    // Eliminar de las mostradas
    this.combinaciones.splice(index, 1);
    
    // Buscar la siguiente combinaciÃ³n disponible
    const siguienteCombinacion = this.obtenerSiguienteCombinacion();
    
    if (siguienteCombinacion) {
      // Agregar la nueva combinaciÃ³n
      this.combinaciones.push(siguienteCombinacion);

    } else {

    }
    
    return true;
  },
  
  // Obtener la siguiente combinaciÃ³n no descartada
  obtenerSiguienteCombinacion() {
    for (let i = 0; i < this.todasLasCombinaciones.length; i++) {
      // Saltar si estÃ¡ descartada
      if (this.combinacionesDescartadas.includes(i)) {
        continue;
      }
      
      // Saltar si ya estÃ¡ en las mostradas
      const yaEstaMostrada = this.combinaciones.some(
        comb => JSON.stringify(comb) === JSON.stringify(this.todasLasCombinaciones[i])
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
  
  // Obtener estadÃ­sticas
  obtenerEstadisticasCombinaciones() {
    return {
      mostradas: this.combinaciones.length,
      descartadas: this.combinacionesDescartadas.length,
      disponibles: this.todasLasCombinaciones.length,
      restantes: this.todasLasCombinaciones.length - this.combinacionesDescartadas.length - this.combinaciones.length
    };
  },
  
  generarTodasLasCombinaciones(gruposPorAsignatura) {
    if (gruposPorAsignatura.length === 0) return [];
    if (gruposPorAsignatura.length === 1) {
      return gruposPorAsignatura[0].grupos.map(g => [{
        asignatura: gruposPorAsignatura[0].asignatura,
        grupo: g
      }]);
    }
    
    const combinaciones = [];
    const indices = new Array(gruposPorAsignatura.length).fill(0);
    const maxIndices = gruposPorAsignatura.map(g => g.grupos.length);
    
    let limite = 1;
    for (const max of maxIndices) {
      limite *= max;
    }
    
    if (limite > 1000) {
      limite = 1000;
    }
    
    for (let i = 0; i < limite; i++) {
      const combinacion = [];
      
      for (let j = 0; j < gruposPorAsignatura.length; j++) {
        const grupo = gruposPorAsignatura[j].grupos[indices[j]];
        combinacion.push({
          asignatura: gruposPorAsignatura[j].asignatura,
          grupo: grupo
        });
      }
      
      combinaciones.push(combinacion);
      
      for (let k = gruposPorAsignatura.length - 1; k >= 0; k--) {
        indices[k]++;
        if (indices[k] < maxIndices[k]) {
          break;
        }
        indices[k] = 0;
      }
    }
    
    return combinaciones;
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
          if (this.horasSeSolapan(h1.inicio, h1.fin, h2.inicio, h2.fin)) {
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
    const partes = hora.split(':');
    return parseInt(partes[0]) * 60 + parseInt(partes[1]);
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
  }
};

window.MotorCombinaciones = MotorCombinaciones;

