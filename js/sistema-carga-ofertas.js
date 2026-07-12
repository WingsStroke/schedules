import { APP_CONFIG } from './core.js';

export const SistemaCargaOfertas = {

  ofertas: [],
  indice: null,       // índice global: { semestres: [...] }
  semestreActual: null, // string, ej. "2026-1"
  cargado: false,

  // ──────────────────────────────────────────
  // INICIALIZACIÓN PRINCIPAL
  // Carga el índice global y el semestre más reciente por defecto.
  // ──────────────────────────────────────────
  async inicializar() {
    try {
      await this.cargarIndiceGlobal();

      // Seleccionar automáticamente el semestre más reciente
      if (this.indice && this.indice.semestres && this.indice.semestres.length > 0) {
        const semestres = this.indice.semestres;
        // El índice viene ordenado del más reciente al más antiguo
        this.semestreActual = semestres[0].periodo;
      } else {
        throw new Error('El índice global no contiene semestres.');
      }

      await this.cargarOfertasDeSemestre(this.semestreActual);
      this.cargado = true;
      window.dispatchEvent(new CustomEvent('ofertas:listo', {
        detail: { semestreActual: this.semestreActual }
      }));
      return true;

    } catch (error) {
      console.error('[SistemaCargaOfertas] Error en inicializar:', error);
      return false;
    }
  },

  // ──────────────────────────────────────────
  // CARGA DEL ÍNDICE GLOBAL
  // Lee index.json desde la raíz del bucket R2.
  // Formato esperado:
  // {
  //   "semestres": [
  //     {
  //       "periodo": "2026-1",
  //       "label": "2026 - Semestre 1",
  //       "programas": [
  //         { "id": "sistemas", "nombre": "Ingeniería de Sistemas", "archivo": "sistemas.xlsx.json" },
  //         ...
  //       ]
  //     },
  //     ...
  //   ]
  // }
  // ──────────────────────────────────────────
  async cargarIndiceGlobal() {
    const baseUrl = APP_CONFIG.R2_BUCKET_URL.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/index.json`, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`No se pudo cargar el índice global (index.json): HTTP ${response.status}`);
    }

    this.indice = await response.json();
    return this.indice;
  },

  // ──────────────────────────────────────────
  // CARGA DE OFERTAS DE UN SEMESTRE ESPECÍFICO
  // Limpia las ofertas actuales y carga las del periodo indicado.
  // ──────────────────────────────────────────
  async cargarOfertasDeSemestre(periodo) {
    this.ofertas = [];
    this.cargado = false;

    const semestreInfo = this.indice.semestres.find(s => s.periodo === periodo);
    if (!semestreInfo) {
      throw new Error(`Semestre '${periodo}' no encontrado en el índice.`);
    }

    const baseUrl = APP_CONFIG.R2_BUCKET_URL.replace(/\/$/, '');
    const programasActivos = semestreInfo.programas.filter(p => p.activo !== false);

    const promesas = programasActivos.map(async (programa) => {
      try {
        const url = `${baseUrl}/${periodo}/${programa.archivo}`;
        const response = await fetch(url, { cache: 'no-store' });

        if (!response.ok) {
          console.warn(`[SistemaCargaOfertas] No se pudo cargar: ${url}`);
          return;
        }

        const data = await response.json();

        this.ofertas.push({
          programaId: programa.id,
          programaNombre: programa.nombre,
          facultad: programa.facultad || '',
          metadata: data.metadata,
          semestres: data.semestres
        });

      } catch (error) {
        console.warn(`[SistemaCargaOfertas] Error cargando ${programa.archivo}:`, error);
      }
    });

    await Promise.all(promesas);

    this.semestreActual = periodo;
    this.cargado = true;
  },

  // ──────────────────────────────────────────
  // CAMBIO DE SEMESTRE (llamado desde la UI)
  // ──────────────────────────────────────────
  async cambiarSemestre(periodo) {
    if (periodo === this.semestreActual) return true;
    try {
      await this.cargarOfertasDeSemestre(periodo);
      return true;
    } catch (error) {
      console.error('[SistemaCargaOfertas] Error cambiando semestre:', error);
      return false;
    }
  },

  // ──────────────────────────────────────────
  // GETTERS PARA LA UI
  // ──────────────────────────────────────────
  getSemestresDisponibles() {
    if (!this.indice) return [];
    return this.indice.semestres.map(s => ({
      periodo: s.periodo,
      label: s.label || s.periodo
    }));
  },

  // ──────────────────────────────────────────
  // MOTOR DE BÚSQUEDA
  // ──────────────────────────────────────────
  buscarAsignatura(query) {
    if (!this.cargado) return [];

    const queryLower = query.toLowerCase().trim();
    if (queryLower.length < 2) return [];

    const queryNormalizada = queryLower
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const resultadosMap = new Map();

    for (const oferta of this.ofertas) {
      for (const semestre of oferta.semestres) {
        for (const asignatura of semestre.asignaturas) {

          const nombreNormalizado = asignatura.nombre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          if (!nombreNormalizado.includes(queryNormalizada)) continue;

          const asigId = asignatura.id;

          if (!resultadosMap.has(asigId)) {
            resultadosMap.set(asigId, {
              id: asigId,
              nombre: asignatura.nombre,
              totalGrupos: 0,
              totalProgramas: 0,
              programas: [],
              grupos: []
            });
          }

          const resultado = resultadosMap.get(asigId);

          if (resultado.programas.indexOf(oferta.programaNombre) === -1) {
            resultado.programas.push(oferta.programaNombre);
            resultado.totalProgramas++;
          }

          for (const grupo of asignatura.grupos) {
            const grupoNombreStr = String(grupo.grupo || '');
            resultado.grupos.push({
              id: asigId + '_' + grupoNombreStr.toLowerCase() + '_' + oferta.programaId,
              grupo: grupo.grupo,
              programa: oferta.programaNombre,
              programaId: oferta.programaId,
              semestre: asignatura.semestre,
              profesor: grupo.profesor,
              ubicacion: grupo.ubicacion,
              cupos: grupo.cupos,
              horarios: grupo.horarios,
              creditos: asignatura.creditos ?? null,
              codigo: asignatura.codigo ?? null
            });
            resultado.totalGrupos++;
          }
        }
      }
    }

    return Array.from(resultadosMap.values());
  },

  obtenerAsignaturaPorId(asignaturaId) {
    for (const oferta of this.ofertas) {
      for (const semestre of oferta.semestres) {
        for (const asignatura of semestre.asignaturas) {
          if (asignatura.id === asignaturaId) {
            return {
              ...asignatura,
              programa: oferta.programaNombre,
              programaId: oferta.programaId
            };
          }
        }
      }
    }
    return null;
  },

  obtenerProgramas() {
    return this.ofertas.map(o => ({
      id: o.programaId,
      nombre: o.programaNombre,
      facultad: o.facultad,
      totalAsignaturas: o.metadata?.totalAsignaturas ?? 0,
      totalGrupos: o.metadata?.totalGrupos ?? 0
    }));
  },

  obtenerEstadisticas() {
    let totalAsignaturas = 0;
    let totalGrupos = 0;

    for (const oferta of this.ofertas) {
      totalAsignaturas += oferta.metadata?.totalAsignaturas ?? 0;
      totalGrupos += oferta.metadata?.totalGrupos ?? 0;
    }

    return {
      periodo: this.semestreActual,
      totalProgramas: this.ofertas.length,
      totalAsignaturas,
      totalGrupos,
      programas: this.obtenerProgramas()
    };
  }
};
