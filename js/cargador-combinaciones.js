// PARTE 5: CARGAR COMBINACIÓN EN HORARIO PRINCIPAL
// Agregar este código después de minihorarios-ui.js y antes de app.js

const CargadorCombinaciones = {
  
  cargarCombinacion(combinacion, indice) {
    console.log('Cargando combinación', indice + 1, 'en horario principal');
    console.log('Asignaturas:', combinacion.length);
    
    if (!combinacion || combinacion.length === 0) {
      alert('Combinación vacía');
      return false;
    }
    
    // Verificar que hay un horario activo
    if (typeof currentScheduleIndex === 'undefined' || currentScheduleIndex === null) {
      alert('No hay un horario activo. Crea un horario primero.');
      return false;
    }
    
    if (typeof schedules === 'undefined' || !schedules[currentScheduleIndex]) {
      alert('Error: No se pudo acceder al horario actual');
      return false;
    }
    
    // Convertir combinación a formato de asignaturas del sistema
    const asignaturasConvertidas = this.convertirCombinacion(combinacion);
    
    console.log('=== ASIGNATURAS CONVERTIDAS ===');
    console.log('Total:', asignaturasConvertidas.length);
    asignaturasConvertidas.forEach((a, i) => {
      console.log(`Bloque ${i + 1}:`, {
        name: a.name,
        group: a.group,
        col: a.col,
        row: a.row,
        blocks: a.blocks,
        jornada: a.jornada
      });
    });
    
    if (asignaturasConvertidas.length === 0) {
      alert('Error al convertir la combinación');
      return false;
    }
    
    // DETECTAR CONFLICTOS CON HORARIO EXISTENTE
    const bloquesExistentes = schedules[currentScheduleIndex].subjects || [];
    
    if (bloquesExistentes.length > 0) {
      const conflictos = this.detectarConflictos(asignaturasConvertidas, bloquesExistentes);
      
      if (conflictos.length > 0) {
        console.warn('=== CONFLICTOS DETECTADOS ===');
        conflictos.forEach(c => console.warn(`${c.nueva} vs ${c.existente} en ${c.dia}`));
        
        let mensaje = 'CONFLICTOS DE HORARIO DETECTADOS\n\n';
        mensaje += 'Las siguientes asignaturas de la combinación chocan con tu horario actual:\n\n';
        
        conflictos.forEach(c => {
          mensaje += `• ${c.nueva} (${c.grupoNueva})\n`;
          mensaje += `  choca con ${c.existente} (${c.grupoExistente})\n`;
          mensaje += `  Día: ${c.dia}\n\n`;
        });
        
        mensaje += 'No se puede agregar esta combinación.\n';
        mensaje += 'Elimina las asignaturas en conflicto del horario principal primero.';
        
        alert(mensaje);
        return false; // NO permitir agregar
      }
    }
    
    // Agregar cada asignatura al horario
    let agregadas = 0;
    let errores = 0;
    
    console.log('=== AGREGANDO BLOQUES AL HORARIO ===');
    console.log('Horario actual tiene:', schedules[currentScheduleIndex].subjects.length, 'bloques');
    
    for (const asignatura of asignaturasConvertidas) {
      try {
        // Agregar ID único si no existe
        if (!asignatura.id) {
          asignatura.id = crypto.randomUUID();
        }
        
        schedules[currentScheduleIndex].subjects.push(asignatura);
        agregadas++;
        console.log(`✓ Agregado bloque ${agregadas}:`, {
          name: asignatura.name,
          col: asignatura.col,
          row: asignatura.row,
          blocks: asignatura.blocks
        });
      } catch (error) {
        console.error('Error agregando asignatura:', asignatura.name, error);
        errores++;
      }
    }
    
    console.log('=== RESULTADO ===');
    console.log('Bloques agregados:', agregadas);
    console.log('Errores:', errores);
    console.log('Total bloques en horario:', schedules[currentScheduleIndex].subjects.length);
    
    // Contar asignaturas únicas (no bloques)
    const asignaturasUnicas = new Set();
    for (const bloque of asignaturasConvertidas) {
      asignaturasUnicas.add(bloque.name);
    }
    const totalAsignaturasUnicas = asignaturasUnicas.size;
    
    console.log('Asignaturas únicas agregadas:', totalAsignaturasUnicas);
    
    if (errores > 0) {
      console.warn('Hubo errores al agregar');
    }
    
    // Guardar y actualizar vista
    if (typeof saveData === 'function') {
      saveData();
    }

    if (typeof rebuildScheduleView === 'function') {
      rebuildScheduleView();
    }

    if (typeof updateScheduleInfo === 'function') {
      updateScheduleInfo();
    }
    
    // Limpiar selección de asignaturas
    MotorCombinaciones.limpiarAsignaturas();
    if (typeof SidebarPanel !== 'undefined') {
      SidebarPanel.actualizarAsignaturasSeleccionadas();
    }
    MinihorariosUI.limpiar();
    
    // Cerrar sidebar
    if (typeof SidebarPanel !== 'undefined') {
      SidebarPanel.cerrar();
    }
    
    const scheduleContainer = document.getElementById('scheduleContainer');
    if (scheduleContainer) {
      scheduleContainer.style.display = 'block';
    }
    
    // Scroll a la parte superior
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    alert(`Combinación cargada correctamente\n\n${totalAsignaturasUnicas} asignatura${totalAsignaturasUnicas !== 1 ? 's' : ''} agregada${totalAsignaturasUnicas !== 1 ? 's' : ''} al horario`);
    
    return true;
  },
  
  detectarConflictos(nuevosBloques, bloquesExistentes) {
    const conflictos = [];
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    for (const nuevo of nuevosBloques) {
      for (const existente of bloquesExistentes) {
        // Mismo día y jornada
        if (nuevo.col === existente.col && nuevo.jornada === existente.jornada) {
          // Calcular rangos de filas
          const nuevoInicio = nuevo.row;
          const nuevoFin = nuevo.row + nuevo.blocks - 1;
          
          const existenteInicio = existente.row;
          const existenteFin = existente.row + (existente.blocks || 1) - 1;
          
          // Verificar solapamiento
          // No hay conflicto si: nuevoFin < existenteInicio O nuevoInicio > existenteFin
          const hayConflicto = !(nuevoFin < existenteInicio || nuevoInicio > existenteFin);
          
          if (hayConflicto) {
            conflictos.push({
              nueva: nuevo.name,
              grupoNueva: nuevo.group,
              existente: existente.name,
              grupoExistente: existente.group,
              dia: diasSemana[nuevo.col] || 'Desconocido',
              rowInicio: Math.max(nuevoInicio, existenteInicio),
              rowFin: Math.min(nuevoFin, existenteFin)
            });
          }
        }
      }
    }
    
    return conflictos;
  },
  
  convertirCombinacion(combinacion) {
    const asignaturas = [];
    
    for (const item of combinacion) {
      const bloques = this.convertirAsignatura(item);
      
      if (bloques && bloques.length > 0) {
        asignaturas.push(...bloques); // Spread para aplanar array
      }
    }
    
    return asignaturas;
  },
  
  unificarHorarios(horarios) {
    // Agrupar por día
    const porDia = {};
    
    for (const h of horarios) {
      if (!porDia[h.dia]) {
        porDia[h.dia] = [];
      }
      porDia[h.dia].push(h);
    }
    
    // Unificar horarios consecutivos del mismo día
    const unificados = [];
    
    for (const dia in porDia) {
      const horariosDelDia = porDia[dia].sort((a, b) => 
        this.horaAMinutos(a.inicio) - this.horaAMinutos(b.inicio)
      );
      
      if (horariosDelDia.length === 0) continue;
      
      let actual = { ...horariosDelDia[0] };
      
      for (let i = 1; i < horariosDelDia.length; i++) {
        const siguiente = horariosDelDia[i];
        
        // Si es consecutivo (fin de actual = inicio de siguiente)
        if (actual.fin === siguiente.inicio) {
          actual.fin = siguiente.fin; // Extender el bloque
        } else {
          unificados.push(actual); // Guardar bloque actual
          actual = { ...siguiente }; // Iniciar nuevo bloque
        }
      }
      
      unificados.push(actual); // Agregar el último bloque
    }
    
    return unificados;
  },
  
  convertirAsignatura(item) {
    const { asignatura, grupo } = item;
    
    if (!grupo.horarios || grupo.horarios.length === 0) {
      console.warn('Grupo sin horarios:', grupo.grupo);
      return [];
    }
    
    console.log('=== Convirtiendo asignatura ===');
    console.log('Nombre:', asignatura.nombre);
    console.log('Grupo:', grupo.grupo);
    console.log('Horarios originales:', grupo.horarios.length);
    grupo.horarios.forEach(h => console.log(`  ${h.dia}: ${h.inicio}-${h.fin}`));
    
    const color = this.generarColor(asignatura.nombre);
    
    // PASO 1: Unificar horarios consecutivos del mismo día
    const horariosUnificados = this.unificarHorarios(grupo.horarios);
    
    console.log('Horarios unificados:', horariosUnificados.length);
    horariosUnificados.forEach(h => console.log(`  ${h.dia}: ${h.inicio}-${h.fin}`));
    
    const bloques = [];
    
    // PASO 2: Convertir cada horario unificado
    for (const horario of horariosUnificados) {
      const jornada = horario.jornada || 'diurna';
      
      // Validar
      const inicioMin = this.horaAMinutos(horario.inicio);
      const finMin = this.horaAMinutos(horario.fin);
      
      if (inicioMin < 360 || inicioMin > 1320) {
        console.error('⚠️ Hora fuera de rango:', horario);
        continue;
      }
      
      if (finMin <= inicioMin) {
        console.error('⚠️ Hora fin antes que inicio:', horario);
        continue;
      }
      
      const { row, column } = this.calcularPosicion(horario);
      
      // Calcular blocks
      const duracionMin = finMin - inicioMin;
      const bloqueMin = jornada === 'diurna' ? 50 : 45;
      const numBloques = Math.ceil(duracionMin / bloqueMin);
      
      console.log(`  Día ${horario.dia} → Column ${column}, Row ${row}, Blocks ${numBloques}`);
      
      // Determinar si mostrar créditos (solo si hay valor válido en JSON)
      const tieneCreditos = asignatura.creditos !== null && 
                           asignatura.creditos !== undefined && 
                           asignatura.creditos > 0;
      
      bloques.push({
        name: asignatura.nombre,
        credits: tieneCreditos ? asignatura.creditos : 0,
        group: grupo.grupo,
        program: grupo.programa || asignatura.programas[0] || '',
        professor: grupo.profesor || '',
        location: grupo.ubicacion || '',
        color: color,
        col: column,  // CAMBIO CRÍTICO: col en lugar de column
        row: row,
        blocks: numBloques,
        jornada: jornada,
        showCredits: tieneCreditos,  // Solo mostrar si hay créditos válidos
        showGroup: true,
        showProgram: true
      });
    }
    
    console.log('Total bloques generados:', bloques.length);
    
    return bloques;
  },
  
  determinarJornada(horarios) {
    let diurnos = 0;
    let nocturnos = 0;
    
    for (const h of horarios) {
      if (h.jornada === 'diurna') {
        diurnos++;
      } else if (h.jornada === 'nocturna') {
        nocturnos++;
      }
    }
    
    return diurnos >= nocturnos ? 'diurna' : 'nocturna';
  },
  
  generarColor(nombre) {
    return getSubjectColor(nombre);
  },
  
  calcularPosicion(horario) {
    // IMPORTANTE: app.js usa índices base-0 para columnas
    // diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    // índice 0 = Lunes, índice 1 = Martes, etc.
    const diaAColumna = {
      'L': 0,  // Lunes = índice 0
      'M': 1,  // Martes = índice 1
      'W': 2,  // Miércoles = índice 2
      'J': 3,  // Jueves = índice 3
      'V': 4,  // Viernes = índice 4
      'S': 5   // Sábado = índice 5
    };
    
    const column = diaAColumna[horario.dia];
    
    if (column === undefined) {
      console.error('Día no reconocido:', horario.dia);
      return { row: 0, column: 0 };
    }
    
    const horaInicio = horario.inicio.split(':');
    const horas = parseInt(horaInicio[0]);
    const minutos = parseInt(horaInicio[1]);
    
    const jornada = horario.jornada || 'diurna';
    
    let row;
    if (jornada === 'diurna') {
      const minutosDesdeInicio = (horas - 7) * 60 + minutos;
      row = Math.floor(minutosDesdeInicio / 50);
    } else {
      const minutosDesdeInicio = (horas * 60 + minutos) - (17 * 60 + 30);
      row = Math.floor(minutosDesdeInicio / 45);
    }
    
    return { row: Math.max(0, row), column };
  },
  
  calcularMinutos(horarios) {
    let minInicio = Infinity;
    let maxFin = -Infinity;
    
    for (const h of horarios) {
      const inicio = this.horaAMinutos(h.inicio);
      const fin = this.horaAMinutos(h.fin);
      
      if (inicio < minInicio) minInicio = inicio;
      if (fin > maxFin) maxFin = fin;
    }
    
    return {
      startMinutes: minInicio,
      endMinutes: maxFin
    };
  },
  
  horaAMinutos(hora) {
    if (!hora || typeof hora !== 'string') {
      console.error('Hora inválida:', hora);
      return 0;
    }
    
    const partes = hora.split(':');
    if (partes.length !== 2) {
      console.error('Formato de hora inválido:', hora);
      return 0;
    }
    
    const h = parseInt(partes[0], 10);
    const m = parseInt(partes[1], 10);
    
    if (isNaN(h) || isNaN(m)) {
      console.error('Hora contiene valores no numéricos:', hora);
      return 0;
    }
    
    if (h < 0 || h > 23 || m < 0 || m > 59) {
      console.error('Hora fuera de rango:', hora);
      return 0;
    }
    
    return h * 60 + m;
  }
};

window.CargadorCombinaciones = CargadorCombinaciones;
console.log('CargadorCombinaciones cargado');
