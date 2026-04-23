// SIDEBAR PANEL - CONTROLADOR DEL PANEL LATERAL

const SidebarPanel = {
  
  // Estado del sidebar
  isOpen: false,

  // Escapa caracteres especiales para uso seguro dentro de atributos HTML inline
  _escAttr(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },
  
  // Inicializar sidebar
  inicializar() {
    console.log('Inicializando Sidebar Panel...');
    
    // Configurar búsqueda integrada
    this.configurarBusqueda();
    
    // Configurar botón regenerar
    const btnRegenerar = document.getElementById('btnRegenerarCombinaciones');
    if (btnRegenerar) {
      btnRegenerar.addEventListener('click', () => {
        this.regenerarCombinaciones();
      });
    }
    
    // Configurar click en overlay del sidebar
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        // Verificar si hay modal de filtros abierto
        const asignaturas = MotorCombinaciones.asignaturasSeleccionadas || [];
        const hayExpandida = asignaturas.some(a => a._expandida);
        
        if (hayExpandida) {
          // Cerrar solo modal de filtros, no el sidebar
          asignaturas.forEach(a => a._expandida = false);
          this.toggleOverlay(false);
          this.actualizarAsignaturasSeleccionadas();
        } else {
          // Cerrar sidebar completo
          this.cerrar();
        }
      });
    }
    
    // Configurar tecla ESC (ÚNICO listener)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Verificar si hay alguna asignatura expandida (modal de filtros abierto)
        const asignaturas = MotorCombinaciones.asignaturasSeleccionadas || [];
        const hayExpandida = asignaturas.some(a => a._expandida);
        
        if (hayExpandida) {
          // PRIORIDAD 1: Cerrar modal de filtros
          e.preventDefault();
          e.stopPropagation();
          asignaturas.forEach(a => a._expandida = false);
          this.toggleOverlay(false);
          this.actualizarAsignaturasSeleccionadas();
        } else if (this.isOpen) {
          // PRIORIDAD 2: Cerrar sidebar principal (solo si no hay modal abierto)
          this.cerrar();
        }
      }
    });
    
    console.log('Sidebar Panel inicializado');
  },
  
  // Configurar búsqueda integrada
  configurarBusqueda() {
    const searchInput = document.getElementById('sidebarSearchInput');
    
    if (!searchInput) {
      console.error('Input de búsqueda no encontrado');
      return;
    }
    
    let timeoutId = null;
    
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      // Limpiar timeout anterior
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Esperar 300ms después de que el usuario deje de escribir
      timeoutId = setTimeout(() => {
        this.buscarAsignaturas(query);
      }, 300);
    });
    
    // Limpiar resultados al hacer focus
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length > 0) {
        this.buscarAsignaturas(searchInput.value.trim());
      }
    });
    
    // Configurar control de máximo de combinaciones
    this.configurarMaxCombinaciones();
  },
  
  // Configurar control de máximo de combinaciones
  configurarMaxCombinaciones() {
    const maxInput = document.getElementById('maxCombinacionesSidebar');
    
    if (!maxInput) {
      console.error('Input de max combinaciones no encontrado');
      return;
    }
    
    // Al cambiar el valor
    maxInput.addEventListener('change', (e) => {
      let valor = parseInt(e.target.value);
      
      // Validar rango
      if (isNaN(valor) || valor < 1) {
        valor = 1;
        e.target.value = 1;
      } else if (valor > 10) {
        valor = 10;
        e.target.value = 10;
      }
      
      // Actualizar motor de combinaciones
      if (typeof MotorCombinaciones !== 'undefined') {
        MotorCombinaciones.setMaxCombinaciones(valor);
        console.log('Máximo de combinaciones actualizado a:', valor);
        
        // Regenerar combinaciones si hay asignaturas seleccionadas
        if (MotorCombinaciones.asignaturasSeleccionadas?.length > 0) {
          if (typeof generarYMostrarCombinaciones === 'function') {
            generarYMostrarCombinaciones();
          }
        }
      }
    });
    
    // Validar al escribir (input)
    maxInput.addEventListener('input', (e) => {
      let valor = parseInt(e.target.value);
      
      // Limitar mientras escribe
      if (!isNaN(valor)) {
        if (valor > 10) {
          e.target.value = 10;
        } else if (valor < 0) {
          e.target.value = '';
        }
      }
    });
  },
  
  // Mostrar botón regenerar
  mostrarBotonRegenerar() {
    const btn = document.getElementById('btnRegenerarCombinaciones');
    if (btn) {
      btn.style.display = 'flex';
    }
  },
  
  // Ocultar botón regenerar
  ocultarBotonRegenerar() {
    const btn = document.getElementById('btnRegenerarCombinaciones');
    if (btn) {
      btn.style.display = 'none';
    }
  },
  
  // Regenerar combinaciones
  regenerarCombinaciones() {
    console.log('Regenerando combinaciones...');
    
    if (typeof MotorCombinaciones !== 'undefined') {
      const resultado = MotorCombinaciones.regenerarCombinaciones();
      
      if (resultado.exito) {
        // Actualizar vista
        this.actualizarMinihorarios();
        this.ocultarBotonRegenerar();
        
        console.log('Combinaciones regeneradas:', resultado.combinaciones.length);
      }
    }
  },
  
  // Buscar asignaturas
  buscarAsignaturas(query) {
    const resultsContainer = document.getElementById('sidebarSearchResults');
    
    if (!resultsContainer) return;
    
    // Si query vacía, limpiar resultados
    if (query.length === 0) {
      resultsContainer.innerHTML = '';
      return;
    }
    
    // Buscar usando la función existente
    let resultados = [];
    if (typeof buscarAsignatura === 'function') {
      resultados = buscarAsignatura(query);
    }
    
    // Renderizar resultados
    if (resultados.length === 0) {
      resultsContainer.innerHTML = `
        <div class="sidebar-search-empty">
          No se encontraron asignaturas para "${query}"
        </div>
      `;
      return;
    }
    
    resultsContainer.innerHTML = resultados.map(asig => `
      <div class="sidebar-search-result-item" onclick="SidebarPanel.seleccionarAsignaturaDesdeBusqueda('${asig.id}')">
        <div class="sidebar-search-result-name">${asig.nombre}</div>
        <div class="sidebar-search-result-info">
          ${asig.totalGrupos} grupo${asig.totalGrupos !== 1 ? 's' : ''} • 
          ${asig.programas.join(', ')}
        </div>
      </div>
    `).join('');
  },
  
  // Seleccionar asignatura desde búsqueda integrada
  seleccionarAsignaturaDesdeBusqueda(asignaturaId) {
    console.log('Seleccionando asignatura desde sidebar:', asignaturaId);
    
    // Usar la función existente de selección
    if (typeof seleccionarAsignatura === 'function') {
      // Limpiar búsqueda
      const searchInput = document.getElementById('sidebarSearchInput');
      const searchResults = document.getElementById('sidebarSearchResults');
      
      if (searchInput) searchInput.value = '';
      if (searchResults) searchResults.innerHTML = '';
      
      // Seleccionar asignatura (esto ya actualiza el sidebar automáticamente)
      seleccionarAsignatura(asignaturaId);
    }
  },
  
  // Abrir sidebar
  abrir() {
    const sidebar = document.getElementById('combinacionesSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!sidebar || !overlay) {
      console.error('Elementos del sidebar no encontrados');
      return;
    }
    
    // 1. Quitamos el scroll primero (Esto altera el tamaño de la ventana)
    document.body.style.overflow = 'hidden'; 
    
    // 2. FORZAR REFLOW: Le obligamos al navegador a procesar el cambio de tamaño YA, 
    // separándolo de la animación que viene a continuación.
    void sidebar.offsetWidth; 
    
    // 3. Ahora sí, disparamos la animación fluidamente
    sidebar.classList.add('active');
    overlay.classList.add('active');
    
    this.isOpen = true;
    console.log('Sidebar abierto');
  },
  
  // Cerrar sidebar
  cerrarModalFiltros() {
    // Limpiar estado expandido de todas las asignaturas
    const asignaturas = MotorCombinaciones.asignaturasSeleccionadas || [];
    asignaturas.forEach(a => a._expandida = false);

    // Ocultar y vaciar el contenedor del modal flotante
    const modalFiltros = document.getElementById('modalFiltrosFlotante');
    if (modalFiltros) {
      modalFiltros.style.display = 'none';
      modalFiltros.innerHTML = '';
    }

    this.toggleOverlay(false);
  },

  cerrar() {
    const sidebar = document.getElementById('combinacionesSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!sidebar || !overlay) {
      console.error('Elementos del sidebar no encontrados');
      return;
    }

    // Cerrar primero el modal de filtros si está abierto
    this.cerrarModalFiltros();

    // 1. Iniciamos la animación de salida
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    
    // 2. Devolvemos el scroll SOLO cuando la animación haya terminado (400ms)
    setTimeout(() => {
        if (!this.isOpen) document.body.style.overflow = '';
    }, 400);
    
    this.isOpen = false;
  },
  
  // Toggle sidebar
  toggle() {
    if (this.isOpen) {
      this.cerrar();
    } else {
      this.abrir();
    }
  },
  
  // Actualizar lista de asignaturas seleccionadas
  actualizarAsignaturasSeleccionadas() {
    const container = document.getElementById('asignaturasSeleccionadasSidebar');
    const counter = document.getElementById('asignaturasCountSidebar');
    
    if (!container) {
      console.error('Container de asignaturas seleccionadas no encontrado');
      return;
    }
    
    // Obtener asignaturas seleccionadas del motor
    const asignaturas = MotorCombinaciones.asignaturasSeleccionadas || [];
    
    // Actualizar contador
    if (counter) {
      counter.textContent = asignaturas.length;
    }
    
    if (asignaturas.length === 0) {
      container.innerHTML = `
        <div class="sidebar-empty-message">
          <p>No hay asignaturas seleccionadas</p>
          <span>Busca y selecciona asignaturas arriba</span>
        </div>
      `;
      return;
    }
    
    // RENDERIZAR SOLO LA LISTA NORMAL (sin modales expandidos)
    container.innerHTML = asignaturas.map((asig, index) => {
      const filtros = asig.filtros || {};
      const estaExpandida = asig._expandida || false;
      const tieneFiltros = (filtros.gruposPermitidos && filtros.gruposPermitidos.length > 0) ||
                          (filtros.programasPermitidos && filtros.programasPermitidos.length > 0) ||
                          (filtros.profesoresPermitidos && filtros.profesoresPermitidos.length > 0);
      
      return `
        <div class="asignatura-seleccionada-item-sidebar ${estaExpandida ? 'is-expanded' : ''}">
          <div class="asignatura-header">
            <span class="asignatura-seleccionada-nombre">
              ${asig.nombre}
              ${tieneFiltros ? '<span class="badge-filtrado">FILTRADO</span>' : ''}
            </span>
            <button 
              class="btn-filtros-asignatura" 
              onclick="event.stopPropagation(); SidebarPanel.toggleAsignatura(${index})"
              title="Configurar filtros"
            >
              <img src="assets/settings.svg" alt="Filtros" class="icon-filtros">
            </button>
            <button 
              class="btn-quitar-asignatura" 
              onclick="event.stopPropagation(); SidebarPanel.quitarAsignatura(${index})"
              title="Quitar asignatura"
            >
              ×
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    // RENDERIZAR MODAL FLOTANTE SEPARADO (si hay alguna expandida)
    const asignaturaExpandida = asignaturas.find(a => a._expandida);
    const indexExpandida = asignaturas.findIndex(a => a._expandida);
    
    this.renderizarModalFlotante(asignaturaExpandida, indexExpandida);
  },
  
  // Renderizar modal flotante separado
  renderizarModalFlotante(asignatura, index) {
    // Buscar o crear contenedor del modal
    let modalContainer = document.getElementById('modalFiltrosFlotante');
    
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modalFiltrosFlotante';
      document.body.appendChild(modalContainer);
    }
    
    // Si no hay asignatura expandida, limpiar modal
    if (!asignatura || index < 0) {
      modalContainer.innerHTML = '';
      modalContainer.style.display = 'none';
      return;
    }
    
    // Renderizar modal flotante
    modalContainer.style.display = 'block';
    modalContainer.innerHTML = `
      <div class="modal-filtros-flotante">
        <div class="modal-header-filtros">
          <button 
            class="btn-cerrar-modal-filtros" 
            onclick="SidebarPanel.toggleAsignatura(${index})"
            title="Cerrar filtros"
          >
            ×
          </button>
          <h3 class="modal-titulo-asignatura">${asignatura.nombre}</h3>
          ${this.tieneFiltros(asignatura) ? '<span class="badge-filtrado">FILTRADO</span>' : ''}
        </div>
        
        <div class="asignatura-filtros">
          ${this.renderizarFiltros(asignatura, index)}
        </div>
      </div>
    `;
  },
  
  // Helper para verificar si tiene filtros
  tieneFiltros(asignatura) {
    const filtros = asignatura.filtros || {};
    return (filtros.gruposPermitidos && filtros.gruposPermitidos.length > 0) ||
           (filtros.programasPermitidos && filtros.programasPermitidos.length > 0) ||
           (filtros.profesoresPermitidos && filtros.profesoresPermitidos.length > 0);
  },
  
  // Toggle expansión de asignatura
  toggleAsignatura(index) {
    const asignaturas = MotorCombinaciones.asignaturasSeleccionadas || [];
    if (index < 0 || index >= asignaturas.length) return;
    
    const wasExpanded = asignaturas[index]._expandida;
    
    // Cerrar todas las demás asignaturas
    asignaturas.forEach(a => a._expandida = false);
    
    // Toggle estado expandida
    asignaturas[index]._expandida = !wasExpanded;
    
    // Manejar overlay
    this.toggleOverlay(asignaturas[index]._expandida);
    
    // Re-renderizar
    this.actualizarAsignaturasSeleccionadas();
  },
  
  // Toggle overlay
  toggleOverlay(show) {
    // Buscar overlay del SIDEBAR (no crear uno nuevo)
    let overlay = document.getElementById('sidebarOverlay');
    
    // Si no existe el overlay del sidebar, no hacer nada
    // El modal de filtros usa el overlay del sidebar existente
    if (!overlay) {
      console.warn('Overlay del sidebar no encontrado');
      return;
    }
    
    if (show) {
      // Mostrar clase para modal abierto
      document.body.classList.add('modal-filtros-abierto');
      // NO crear overlay adicional - usar el del sidebar
      // NO modificar el overlay existente
    } else {
      // Ocultar clase
      document.body.classList.remove('modal-filtros-abierto');
      // NO modificar el overlay del sidebar
    }
  },
  
  // Renderizar filtros de una asignatura
  renderizarFiltros(asignatura, index) {
    const filtros = asignatura.filtros || {};
    const gruposPermitidos = filtros.gruposPermitidos || [];
    const programasPermitidos = filtros.programasPermitidos || [];
    const profesoresPermitidos = filtros.profesoresPermitidos || [];
    
    // Obtener todos los grupos únicos
    const todosLosGrupos = asignatura.grupos || [];
    
    // Obtener programas únicos
    const programasUnicos = [...new Set(todosLosGrupos.map(g => g.programa))].filter(Boolean);
    
    // Obtener profesores únicos
    const profesoresUnicos = [...new Set(todosLosGrupos.map(g => g.profesor))].filter(Boolean);
    
    return `
      <!-- Filtro: Grupos -->
      <div class="filtro-section">
        <h5 class="filtro-titulo">Grupos</h5>
        <div class="filtro-opciones">
          ${todosLosGrupos.length === 0 ? '<p class="filtro-sin-opciones">No hay grupos disponibles</p>' : ''}
          ${todosLosGrupos.map(grupo => {
            const isChecked = gruposPermitidos.includes(grupo.grupo);
            const grupoEsc = this._escAttr(grupo.grupo);
            return `
              <label class="filtro-checkbox">
                <input 
                  type="checkbox" 
                  ${isChecked ? 'checked' : ''}
                  onchange="SidebarPanel.toggleGrupo(${index}, '${grupoEsc}')"
                >
                <span class="filtro-option-label">
                  <strong>${grupo.grupo}</strong>
                  ${grupo.programa ? `<small>${grupo.programa}</small>` : ''}
                  ${grupo.profesor ? `<small>${grupo.profesor}</small>` : ''}
                </span>
              </label>
            `;
          }).join('')}
        </div>

      </div>
      
      <!-- Filtro: Programas -->
      ${programasUnicos.length > 1 ? `
        <div class="filtro-section">
          <h5 class="filtro-titulo">Programas</h5>
          <div class="filtro-opciones">
            ${programasUnicos.map(programa => {
              const isChecked = programasPermitidos.includes(programa);
              const gruposEnPrograma = todosLosGrupos.filter(g => g.programa === programa).length;
              const programaEsc = this._escAttr(programa);
              return `
                <label class="filtro-checkbox">
                  <input 
                    type="checkbox" 
                    ${isChecked ? 'checked' : ''}
                    onchange="SidebarPanel.togglePrograma(${index}, '${programaEsc}')"
                  >
                  <span class="filtro-option-label">
                    <strong>${programa}</strong>
                    <small>${gruposEnPrograma} grupo${gruposEnPrograma !== 1 ? 's' : ''}</small>
                  </span>
                </label>
              `;
            }).join('')}
          </div>

        </div>
      ` : ''}
      
      <!-- Filtro: Profesores -->
      ${profesoresUnicos.length > 1 ? `
        <div class="filtro-section">
          <h5 class="filtro-titulo">Profesores</h5>
          <div class="filtro-opciones">
            ${profesoresUnicos.map(profesor => {
              const isChecked = profesoresPermitidos.includes(profesor);
              const gruposConProfesor = todosLosGrupos.filter(g => g.profesor === profesor).length;
              const profesorEsc = this._escAttr(profesor);
              return `
                <label class="filtro-checkbox">
                  <input 
                    type="checkbox" 
                    ${isChecked ? 'checked' : ''}
                    onchange="SidebarPanel.toggleProfesor(${index}, '${profesorEsc}')"
                  >
                  <span class="filtro-option-label">
                    <strong>${profesor}</strong>
                    <small>${gruposConProfesor} grupo${gruposConProfesor !== 1 ? 's' : ''}</small>
                  </span>
                </label>
              `;
            }).join('')}
          </div>

        </div>
      ` : ''}
      
      <!-- Botones de acción -->
      <div class="filtro-acciones">
        <button class="btn-limpiar-filtros" onclick="SidebarPanel.limpiarFiltros(${index})">
          Limpiar filtros
        </button>
        <button class="btn-aplicar-filtros" onclick="SidebarPanel.aplicarFiltros(${index})">
          Aplicar filtros
        </button>
      </div>
    `;
  },
  
  // Toggle grupo específico
  toggleGrupo(index, grupoId) {
    const asignaturas = MotorCombinaciones.asignaturasSeleccionadas || [];
    if (index < 0 || index >= asignaturas.length) return;
    
    const asignatura = asignaturas[index];
    if (!asignatura.filtros) asignatura.filtros = {};
    if (!asignatura.filtros.gruposPermitidos) asignatura.filtros.gruposPermitidos = [];
    
    const gruposPermitidos = asignatura.filtros.gruposPermitidos;
    const indexGrupo = gruposPermitidos.indexOf(grupoId);
    
    if (indexGrupo === -1) {
      // Agregar grupo
      gruposPermitidos.push(grupoId);
    } else {
      // Quitar grupo
      gruposPermitidos.splice(indexGrupo, 1);
    }
    
    // NO re-renderizar aquí para evitar parpadeo
    // this.actualizarAsignaturasSeleccionadas();
  },
  
  // Toggle programa
  togglePrograma(index, programaNombre) {
    const asignaturas = MotorCombinaciones.asignaturasSeleccionadas || [];
    if (index < 0 || index >= asignaturas.length) return;
    
    const asignatura = asignaturas[index];
    if (!asignatura.filtros) asignatura.filtros = {};
    if (!asignatura.filtros.programasPermitidos) asignatura.filtros.programasPermitidos = [];
    
    const programasPermitidos = asignatura.filtros.programasPermitidos;
    const indexPrograma = programasPermitidos.indexOf(programaNombre);
    
    if (indexPrograma === -1) {
      programasPermitidos.push(programaNombre);
    } else {
      programasPermitidos.splice(indexPrograma, 1);
    }
    
    // NO re-renderizar aquí para evitar parpadeo
    // this.actualizarAsignaturasSeleccionadas();
  },
  
  // Toggle profesor
  toggleProfesor(index, profesorNombre) {
    const asignaturas = MotorCombinaciones.asignaturasSeleccionadas || [];
    if (index < 0 || index >= asignaturas.length) return;
    
    const asignatura = asignaturas[index];
    if (!asignatura.filtros) asignatura.filtros = {};
    if (!asignatura.filtros.profesoresPermitidos) asignatura.filtros.profesoresPermitidos = [];
    
    const profesoresPermitidos = asignatura.filtros.profesoresPermitidos;
    const indexProfesor = profesoresPermitidos.indexOf(profesorNombre);
    
    if (indexProfesor === -1) {
      profesoresPermitidos.push(profesorNombre);
    } else {
      profesoresPermitidos.splice(indexProfesor, 1);
    }
    
    // NO re-renderizar aquí para evitar parpadeo
    // this.actualizarAsignaturasSeleccionadas();
  },
  
  // Limpiar todos los filtros de una asignatura
  limpiarFiltros(index) {
    const asignaturas = MotorCombinaciones.asignaturasSeleccionadas || [];
    if (index < 0 || index >= asignaturas.length) return;
    
    const asignatura = asignaturas[index];
    asignatura.filtros = {
      gruposPermitidos: [],
      programasPermitidos: [],
      profesoresPermitidos: []
    };
    
    this.actualizarAsignaturasSeleccionadas();
  },
  
  // Aplicar filtros y regenerar combinaciones
  aplicarFiltros(index) {
    console.log('Aplicando filtros para asignatura:', index);
    
    // Regenerar combinaciones con los nuevos filtros
    if (typeof generarYMostrarCombinaciones === 'function') {
      generarYMostrarCombinaciones();
    }
    
    // Cerrar el acordeón después de aplicar
    const asignaturas = MotorCombinaciones.asignaturasSeleccionadas || [];
    if (asignaturas[index]) {
      asignaturas[index]._expandida = false;
      this.toggleOverlay(false);
      this.actualizarAsignaturasSeleccionadas();
    }
  },
  
  // Quitar asignatura
  quitarAsignatura(index) {
    console.log('Quitando asignatura en índice:', index);
    
    // Obtener asignaturas actuales
    const asignaturas = MotorCombinaciones.asignaturasSeleccionadas || [];
    
    if (index < 0 || index >= asignaturas.length) {
      console.error('Índice inválido:', index);
      return;
    }
    
    // Verificar si la asignatura que se va a eliminar está expandida
    const estabaExpandida = asignaturas[index]._expandida;
    
    // Eliminar asignatura
    asignaturas.splice(index, 1);
    
    // Si estaba expandida, cerrar overlay
    if (estabaExpandida) {
      this.toggleOverlay(false);
    }
    
    // Actualizar vista
    this.actualizarAsignaturasSeleccionadas();
    
    // Regenerar combinaciones (incluso con 1 asignatura)
    if (asignaturas.length >= 1) {
      generarYMostrarCombinaciones();
    } else {
      // Limpiar combinaciones solo si no hay asignaturas
      this.limpiarCombinaciones();
    }
  },
  
  // Limpiar combinaciones
  limpiarCombinaciones() {
    const container = document.getElementById('minihorariosContainerSidebar');
    const counter = document.getElementById('combinacionesCountSidebar');
    
    if (counter) {
      counter.textContent = '0';
    }
    
    if (container) {
      container.innerHTML = `
        <div class="sidebar-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h5>No hay combinaciones</h5>
          <p>Busca y selecciona asignaturas</p>
        </div>
      `;
    }
  },
  
  // Actualizar contador de combinaciones
  actualizarContadorCombinaciones() {
    const counter = document.getElementById('combinacionesCountSidebar');
    
    if (!counter) return;
    
    const total = MotorCombinaciones.combinaciones?.length || 0;
    counter.textContent = total;
  },
  
  // Actualizar minihorarios en sidebar
  actualizarMinihorarios() {
    const container = document.getElementById('minihorariosContainerSidebar');
    
    if (!container) {
      console.error('Container de minihorarios no encontrado');
      return;
    }
    
    // Obtener combinaciones del motor
    const combinaciones = MotorCombinaciones.combinaciones || [];
    
    if (combinaciones.length === 0) {
      container.innerHTML = `
        <div class="sidebar-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h5>No hay combinaciones</h5>
          <p>Busca y selecciona asignaturas</p>
        </div>
      `;
      return;
    }
    
    // Sincronizar combinacionesActuales para que usarCombinacion() funcione
    MinihorariosUI.combinacionesActuales = combinaciones;

    container.innerHTML = `
      <div class="minihorarios-container-sidebar">
        ${combinaciones.map((combinacion, index) =>
          MinihorariosUI.renderizarMinihorario(combinacion, index)
        ).join('')}
      </div>
    `;
    
    this.actualizarContadorCombinaciones();
  },
  
  // Abrir modal de búsqueda desde sidebar
  abrirBusqueda() {
    // Abrir modal de búsqueda (función existente en integracion-busqueda.js)
    if (typeof openSearchModal !== 'undefined') {
      openSearchModal();
    } else {
      // Alternativa: mostrar modal directamente
      const modal = document.getElementById('searchModal');
      if (modal) {
        modal.style.display = 'flex';
      }
    }
  },
  
  // Mostrar estado de carga
  mostrarCargando() {
    const container = document.getElementById('minihorariosContainerSidebar');
    
    if (!container) return;
    
    container.innerHTML = `
      <div class="sidebar-loading">
        <div class="spinner"></div>
        <p>Generando combinaciones...</p>
      </div>
    `;
  }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  SidebarPanel.inicializar();
});

// Función global para cerrar sidebar (usada en onclick)
function cerrarSidebar() {
  SidebarPanel.cerrar();
}

// Función global para abrir búsqueda desde sidebar
function abrirBusquedaDesdeSidebar() {
  SidebarPanel.abrirBusqueda();
}
