import { getSubjectColor } from './core.js';
import { Toast } from './toast-system.js';
import { currentScheduleIndex, schedules } from './state-manager.js';
import { DOMRenderer } from './dom-renderer.js';
import { MotorCombinaciones } from './motor-combinaciones.js';

export const CargadorCombinaciones = {

  cargarCombinacion(combinacion, indice) {

    // Verificar que la combinación no esté vacía
    if (!combinacion || combinacion.length === 0) {
      Toast.show('Combinación vacía', 'error');
      return false;
    }

    // Verificar que hay un horario activo
    if (typeof currentScheduleIndex === 'undefined' || currentScheduleIndex === null) {
      Toast.show('No hay un horario activo. Crea un horario primero.', 'error');
      return false;
    }

    if (typeof schedules === 'undefined' || !schedules[currentScheduleIndex]) {
      Toast.show('Error: No se pudo acceder al horario actual', 'error');
      return false;
    }

    // Convertir combinación a formato de asignaturas del sistema
    const asignaturasConvertidas = this.convertirCombinacion(combinacion);

    if (asignaturasConvertidas.length === 0) {
      Toast.show('Error al convertir la combinación', 'error');
      return false;
    }

    // DETECTAR CONFLICTOS CON HORARIO EXISTENTE
    const bloquesExistentes = schedules[currentScheduleIndex].subjects || [];

    if (bloquesExistentes.length > 0) {
      const conflictos = this.detectarConflictos(asignaturasConvertidas, bloquesExistentes);

      if (conflictos.length > 0) {
        const nombresConflicto = conflictos.map(c => `${c.nueva} vs ${c.existente} (${c.dia})`).join(', ');
        Toast.show(`Conflicto de horario: ${nombresConflicto}. Elimina las asignaturas en conflicto primero.`, 'error', 6000);
        return false;
      }
    }

    // Agregar cada asignatura al horario
    let agregadas = 0;
    let errores = 0;

    for (const asignatura of asignaturasConvertidas) {
      try {
        // Agregar ID único si no existe
        if (!asignatura.id) {
          asignatura.id = crypto.randomUUID();
        }

        schedules[currentScheduleIndex].subjects.push(asignatura);
        agregadas++;
      } catch (error) {
        errores++;
      }
    }

    // Contar asignaturas únicas (no bloques)
    const asignaturasUnicas = new Set();
    for (const bloque of asignaturasConvertidas) {
      asignaturasUnicas.add(bloque.name);
    }
    const totalAsignaturasUnicas = asignaturasUnicas.size;

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
    if (typeof MotorCombinaciones !== 'undefined') {
      MotorCombinaciones.limpiarAsignaturas();
    }
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

    Toast.show(`${totalAsignaturasUnicas} asignatura${totalAsignaturasUnicas !== 1 ? 's' : ''} agregada${totalAsignaturasUnicas !== 1 ? 's' : ''} al horario`, 'success');

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

      return [];
    }

    const color = this.generarColor(asignatura.nombre);

    // PASO 1: Normalizar formato de horas (12h → 24h si aplica) y unificar consecutivos
    const horariosNormalizados = grupo.horarios.map(h => ({
      ...h,
      inicio: this.normalizeHora(h.inicio, h.jornada || 'diurna'),
      fin: this.normalizeHora(h.fin, h.jornada || 'diurna')
    }));
    const horariosUnificados = this.unificarHorarios(horariosNormalizados);

    const bloques = [];

    // PASO 2: Convertir cada horario unificado
    for (const horario of horariosUnificados) {
      const jornada = horario.jornada || 'diurna';

      // Validar (las horas ya vienen normalizadas a 24h desde PASO 1)
      const inicioMin = this.horaAMinutos(horario.inicio);
      const finMin = this.horaAMinutos(horario.fin);

      if (inicioMin < 360 || inicioMin > 1320) {
        continue;
      }

      if (finMin <= inicioMin) {
        continue;
      }

      const { row, column } = this.calcularPosicion(horario);

      // Calcular blocks
      const duracionMin = finMin - inicioMin;
      const bloqueMin = jornada === 'diurna' ? 50 : 45;
      const numBloques = Math.ceil(duracionMin / bloqueMin);

      // Determinar si mostrar créditos (solo si hay valor válido en JSON, leído desde grupo)
      const creditosGrupo = grupo.creditos;
      const tieneCreditos = creditosGrupo !== null &&
        creditosGrupo !== undefined &&
        creditosGrupo > 0;

      const codigoAsignatura = (grupo.codigo && grupo.codigo !== 'NULL')
        ? grupo.codigo : '';

      bloques.push({
        name: asignatura.nombre,
        code: codigoAsignatura,
        credits: tieneCreditos ? creditosGrupo : 0,
        group: grupo.grupo,
        program: grupo.programa || (asignatura.programas && asignatura.programas[0]) || '',
        professor: grupo.profesor || '',
        location: grupo.ubicacion || '',
        color: color,
        col: column,
        row: row,
        blocks: numBloques,
        jornada: jornada,
        showCredits: tieneCreditos,
        showGroup: true,
        showProgram: true
      });
    }



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
      return 0;
    }
    const partes = hora.split(':');
    if (partes.length !== 2) {
      return 0;
    }
    const h = parseInt(partes[0], 10);
    const m = parseInt(partes[1], 10);
    if (isNaN(h) || isNaN(m)) {
      return 0;
    }
    if (h < 0 || h > 23 || m < 0 || m > 59) {
      return 0;
    }
    return h * 60 + m;
  },

  normalizeHora(hora, jornada) {
    if (!hora || typeof hora !== 'string') return hora;
    const partes = hora.split(':');
    if (partes.length !== 2) return hora;
    let h = parseInt(partes[0], 10);
    const m = partes[1];
    if (isNaN(h)) return hora;
    if (jornada === 'diurna' && h >= 1 && h < 7) h += 12;
    else if (jornada === 'nocturna' && h >= 1 && h < 5) h += 12;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
};

window.CargadorCombinaciones = CargadorCombinaciones;

window.CargadorCombinaciones = CargadorCombinaciones;

