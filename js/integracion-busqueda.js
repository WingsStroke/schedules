"use strict";

// INTEGRACIÓN DEL SISTEMA DE CARGA DE OFERTAS

// 1. VARIABLES GLOBALES Y CACHÉ
let ultimosResultadosBusqueda = [];

// CACHÉ DE RENDIMIENTO
const _textCache = new Map();

// FUNCIÓN AUXILIAR PARA NORMALIZAR TEXTO (Optimizada con Memoización)
function normalizarTexto(texto) {
  if (!texto) return '';
  if (_textCache.has(texto)) return _textCache.get(texto);
  
  const normalizado = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  _textCache.set(texto, normalizado);
  return normalizado;
}

// 2. INICIALIZACIÓN
window.addEventListener('DOMContentLoaded', async () => {
  console.log('Iniciando carga de ofertas académicas...');
  
  const exito = await SistemaCargaOfertas.inicializar();
  const searchBtn = document.getElementById('searchSubjectBtn');
  
  if (exito) {
    console.log('Ofertas cargadas correctamente');
    if (searchBtn) searchBtn.disabled = false;
  } else {
    console.error('No se pudieron cargar las ofertas académicas');
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.title = 'Error cargando ofertas académicas';
    }
  }
});

// 3. MOTOR DE BÚSQUEDA
function buscarAsignatura(query) {
  if (!SistemaCargaOfertas.cargado) return [];
  
  // Obtenemos los resultados base del sistema
  const resultados = SistemaCargaOfertas.buscarAsignatura(query);
  ultimosResultadosBusqueda = resultados;
  
  if (query && query.trim().length > 0) {
    const queryNormalizada = normalizarTexto(query.trim());
    
    // Filtrado de alto rendimiento
    return resultados.filter(asig => {
      const nombreNormalizado = normalizarTexto(asig.nombre);
      return nombreNormalizado.includes(queryNormalizada);
    });
  }
  
  return resultados;
}

// 4. SISTEMA DE DEBOUNCE PROFESIONAL
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// 5. EVENTOS DE UI (MODAL ANTIGUO Y SIDEBAR)
const searchSubjectBtn = document.getElementById('searchSubjectBtn');
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const closeSearchBtn = searchModal ? searchModal.querySelector('.close-btn') : null;

if (searchSubjectBtn) {
  searchSubjectBtn.addEventListener('click', () => {

  if (typeof SidebarPanel !== 'undefined') {
    SidebarPanel.abrir();

    setTimeout(() => {
      const sidebarSearchInput = document.getElementById('sidebarSearchInput');
      if (sidebarSearchInput) sidebarSearchInput.focus();
    }, 450);
  } else {

      if (typeof openSearchModal !== 'undefined') {
        openSearchModal();
      }
    }
 });
}

if (closeSearchBtn && searchModal) {
  closeSearchBtn.addEventListener('click', () => searchModal.classList.remove('active'));
}

if (searchModal) {
  searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal) searchModal.classList.remove('active');
  });
}

// 6. EJECUCIÓN DE BÚSQUEDA CON FEEDBACK VISUAL
if (searchInput && searchResults) {
  
  // Creamos la función debounced que se ejecutará 300ms después
  const realizarBusqueda = debounce((query) => {
    const resultados = buscarAsignatura(query);
    renderizarResultadosBusqueda(resultados);
  }, 300);

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      searchResults.innerHTML = '<p class="search-empty">Escribe al menos 2 caracteres...</p>';
      return;
    }
    
    // Feedback visual inmediato (antes de que pasen los 300ms)
    searchResults.innerHTML = `
      <div class="search-loading" style="text-align: center; padding: 20px; color: #666;">
        <span style="display: inline-block; animation: pulse 1.5s infinite;">Buscando...</span>
      </div>`;
      
    // Llamamos a la función debounced
    realizarBusqueda(query);
  });
}

// 7. RENDERIZADO
function renderizarResultadosBusqueda(resultados) {
  if (!searchResults) return;
  
  if (resultados.length === 0) {
    searchResults.innerHTML = '<p class="search-empty">No se encontraron resultados</p>';
    return;
  }
  
  let html = '';
  for (const asignatura of resultados) {
    const color = getSubjectColor(asignatura.nombre); // Reutilizamos tu función centralizada
    const programasTexto = asignatura.programas.join(', ');
    
    html += `
      <div class="search-result-card">
        <div class="search-result-card-color" style="background: ${color}"></div>
        <div class="search-result-card-content">
          <div class="search-result-card-header">
            <h4>${asignatura.nombre}</h4>
            <button class="btn-select-subject" onclick="seleccionarAsignatura('${asignatura.id}')">
              Seleccionar
            </button>
          </div>
          <p class="search-result-card-info">
            ${asignatura.totalGrupos} grupo${asignatura.totalGrupos !== 1 ? 's' : ''} 
            en ${asignatura.totalProgramas} programa${asignatura.totalProgramas !== 1 ? 's' : ''}
          </p>
          <p class="search-result-card-programs">${programasTexto}</p>
        </div>
      </div>
    `;
  }
  
  searchResults.innerHTML = html;
}

// 8. ACCIONES DE ASIGNATURAS
function seleccionarAsignatura(asignaturaId) {
  let asignatura = ultimosResultadosBusqueda.find(a => a.id === asignaturaId);
  
  if (!asignatura) {
    for (const oferta of SistemaCargaOfertas.ofertas) {
      for (const semestre of oferta.semestres) {
        for (const asig of semestre.asignaturas) {
          if (asig.id === asignaturaId) {
            asignatura = {
              id: asig.id, nombre: asig.nombre, totalGrupos: asig.grupos.length,
              totalProgramas: 1, programas: [oferta.programaNombre],
              grupos: asig.grupos.map(g => ({ ...g, programa: oferta.programaNombre, programaId: oferta.programaId, semestre: asig.semestre }))
            };
            break;
          }
        }
        if (asignatura) break;
      }
      if (asignatura) break;
    }
  }
  
  if (!asignatura) return alert('Error: No se encontró la asignatura.');
  
  const agregada = MotorCombinaciones.agregarAsignatura(asignatura);
  if (!agregada) return alert('Esta asignatura ya está seleccionada');
  
  if (searchModal) searchModal.classList.remove('active');
  
  if (typeof SidebarPanel !== 'undefined') {
    if (!SidebarPanel.isOpen) SidebarPanel.abrir();
    SidebarPanel.actualizarAsignaturasSeleccionadas();
  }
  
  generarYMostrarCombinaciones();
}

function eliminarAsignatura(asignaturaId) {
  MotorCombinaciones.eliminarAsignatura(asignaturaId);
  generarYMostrarCombinaciones();
}

function generarYMostrarCombinaciones() {
  const resultado = MotorCombinaciones.generarCombinaciones();
  if (typeof SidebarPanel !== 'undefined') {
    if (resultado.exito) {
      SidebarPanel.actualizarMinihorarios();
      SidebarPanel.ocultarBotonRegenerar();
    } else {
      const container = document.getElementById('minihorariosContainerSidebar');
      if (container) {
        container.innerHTML = `<div class="sidebar-empty-state"><h5>No se pudieron generar combinaciones</h5><p>${resultado.mensaje || 'Error desconocido'}</p></div>`;
      }
    }
  }
}