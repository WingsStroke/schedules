const SistemaCargaOfertas = {
  
  ofertas: [],
  indice: null,
  cargado: false,
  
  async inicializar() {
    console.log('Inicializando sistema de carga de ofertas...');
    
    try {
      await this.cargarIndice();
      await this.cargarOfertas();
      
      this.cargado = true;
      console.log('Sistema de ofertas cargado correctamente');
      console.log('Total programas:', this.ofertas.length);
      
      return true;
      
    } catch (error) {
      console.error('Error inicializando sistema de ofertas:', error);
      return false;
    }
  },
  
  async cargarIndice() {
    console.log('Cargando índice de ofertas...');
    
    try {
      const response = await fetch('data/ofertas.json');
      
      if (!response.ok) {
        throw new Error('No se pudo cargar ofertas.json');
      }
      
      this.indice = await response.json();
      
      console.log('Índice cargado:');
      console.log('  Periodo:', this.indice.periodo);
      console.log('  Programas disponibles:', this.indice.programas.length);
      
      return this.indice;
      
    } catch (error) {
      console.error('Error cargando índice:', error);
      throw error;
    }
  },
  
  async cargarOfertas() {
    console.log('Cargando ofertas académicas...');
    
    const programasActivos = this.indice.programas.filter(p => p.activo !== false);
    
    console.log('Programas a cargar:', programasActivos.length);
    
    for (let i = 0; i < programasActivos.length; i++) {
      const programa = programasActivos[i];
      
      console.log('Cargando', (i + 1) + '/' + programasActivos.length + ':', programa.nombre);
      
      try {
        const response = await fetch(programa.archivo);
        
        if (!response.ok) {
          console.warn('No se pudo cargar:', programa.archivo);
          continue;
        }
        
        const data = await response.json();
        
        this.ofertas.push({
          programaId: programa.id,
          programaNombre: programa.nombre,
          facultad: programa.facultad,
          metadata: data.metadata,
          semestres: data.semestres
        });
        
        console.log('  OK:', data.metadata.totalAsignaturas, 'asignaturas,', data.metadata.totalGrupos, 'grupos');
        
      } catch (error) {
        console.error('  Error cargando', programa.nombre + ':', error.message);
      }
    }
    
    console.log('Ofertas cargadas:', this.ofertas.length, 'programas');
  },
  
  buscarAsignatura(query) {
    if (!this.cargado) {
      console.warn('Sistema no cargado aún');
      return [];
    }
    
    const queryLower = query.toLowerCase().trim();
    
    if (queryLower.length < 2) {
      return [];
    }
    
    // Normalizar query (quitar tildes)
    const queryNormalizada = queryLower
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    const resultadosMap = new Map();
    
    for (const oferta of this.ofertas) {
      for (const semestre of oferta.semestres) {
        for (const asignatura of semestre.asignaturas) {
          
          // Normalizar nombre de asignatura (quitar tildes)
          const nombreNormalizado = asignatura.nombre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          
          if (!nombreNormalizado.includes(queryNormalizada)) {
            continue;
          }
          
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
            resultado.grupos.push({
              id: asigId + '_' + grupo.grupo.toLowerCase() + '_' + oferta.programaId,
              grupo: grupo.grupo,
              programa: oferta.programaNombre,
              programaId: oferta.programaId,
              semestre: asignatura.semestre,
              profesor: grupo.profesor,
              ubicacion: grupo.ubicacion,
              cupos: grupo.cupos,
              horarios: grupo.horarios
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
      totalAsignaturas: o.metadata.totalAsignaturas,
      totalGrupos: o.metadata.totalGrupos
    }));
  },
  
  obtenerEstadisticas() {
    let totalAsignaturas = 0;
    let totalGrupos = 0;
    
    for (const oferta of this.ofertas) {
      totalAsignaturas += oferta.metadata.totalAsignaturas;
      totalGrupos += oferta.metadata.totalGrupos;
    }
    
    return {
      periodo: this.indice.periodo,
      totalProgramas: this.ofertas.length,
      totalAsignaturas: totalAsignaturas,
      totalGrupos: totalGrupos,
      programas: this.obtenerProgramas()
    };
  }
};

window.SistemaCargaOfertas = SistemaCargaOfertas;
console.log('SistemaCargaOfertas cargado');
