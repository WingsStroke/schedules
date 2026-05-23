export const SistemaCargaOfertas = {
  
  ofertas: [],
  indice: null,
  cargado: false,
  
  async inicializar() {

    
    try {
      await this.cargarIndice();
      await this.cargarOfertas();
      
      this.cargado = true;


      
      return true;
      
    } catch (error) {

      return false;
    }
  },
  
  async cargarIndice() {

    
    try {
      const response = await fetch('data/ofertas.json');
      
      if (!response.ok) {
        throw new Error('No se pudo cargar ofertas.json');
      }
      
      this.indice = await response.json();
      



      
      return this.indice;
      
    } catch (error) {

      throw error;
    }
  },
  
  async cargarOfertas() {

    
    const programasActivos = this.indice.programas.filter(p => p.activo !== false);
    

    
    for (let i = 0; i < programasActivos.length; i++) {
      const programa = programasActivos[i];
      

      
      try {
        const response = await fetch(programa.archivo);
        
        if (!response.ok) {

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
        

        
      } catch (error) {

      }
    }
    

  },
  
  buscarAsignatura(query) {
    if (!this.cargado) {

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
