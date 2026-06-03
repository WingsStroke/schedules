/**
 * JS Module: Visor de Mallas Académicas
 * Manages fetching local curricula JSONs, rendering the interactive grid,
 * and performing recursive highlighting of prerequisites and unlocks.
 */

import { ActionBar } from './action-bar.js';
import { Toast } from './toast-system.js';

export const VisorMallas = {
  elements: {
    modal: null,
    closeBtn: null,
    select: null,
    searchInput: null,
    clearSearchBtn: null,
    statsContainer: null,
    statSemestres: null,
    statMaterias: null,
    statCreditos: null,
    gridContainer: null
  },

  state: {
    programas: [],
    currentMalla: null,
    subjectMap: {}, // Fast lookup for subjects by ID
    pinnedSubjectId: null // Keep track of clicked/pinned subject
  },

  /**
   * Initializes the VisorMallas component
   */
  init() {
    this.elements.modal = document.getElementById('mallasModal');
    this.elements.closeBtn = document.getElementById('closeMallasModalBtn');
    this.elements.select = document.getElementById('mallaProgramSelect');
    this.elements.searchInput = document.getElementById('mallaSearchInput');
    this.elements.clearSearchBtn = document.getElementById('mallaClearSearchBtn');
    this.elements.statsContainer = document.getElementById('mallaStatsContainer');
    this.elements.statSemestres = document.getElementById('mallaStatSemestres');
    this.elements.statMaterias = document.getElementById('mallaStatMaterias');
    this.elements.statCreditos = document.getElementById('mallaStatCreditos');
    this.elements.gridContainer = document.getElementById('mallaGridContainer');

    if (!this.elements.modal) {
      console.warn('VisorMallas: Modal element not found in DOM.');
      return;
    }

    // Bind basic events
    this.elements.closeBtn.addEventListener('click', () => this.close());
    this.elements.modal.addEventListener('click', (e) => {
      if (e.target === this.elements.modal) this.close();
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.elements.modal.classList.contains('active')) {
        this.close();
      }
    });

    // Load available programs index
    this.loadIndex();

    // Select program change handler
    this.elements.select.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const prog = this.state.programas.find(p => p.id === selectedId);
      if (prog) {
        this.loadProgram(prog);
      }
    });

    // Search input handler
    this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    this.elements.clearSearchBtn.addEventListener('click', () => this.clearSearch());

    // Register action in the ActionBar
    ActionBar.onAction('mallas', () => this.open());
  },

  /**
   * Opens the modal
   */
  open() {
    if (this.elements.modal) {
      this.elements.modal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Lock body scroll
    }
  },

  /**
   * Closes the modal
   */
  close() {
    if (this.elements.modal) {
      this.elements.modal.classList.remove('active');
      document.body.style.overflow = ''; // Unlock body scroll
      this.clearHighlight();
      this.clearSearch();
    }
  },

  /**
   * Loads the programs index JSON
   */
  async loadIndex() {
    try {
      const response = await fetch('./data/mallas/index.json');
      if (!response.ok) throw new Error('No se pudo cargar el índice de programas.');
      
      const data = await response.json();
      this.state.programas = data.programas || [];
      
      // Populate select
      this.elements.select.innerHTML = '<option value="" disabled selected>Selecciona un programa...</option>';
      this.state.programas.forEach(prog => {
        const opt = document.createElement('option');
        opt.value = prog.id;
        opt.textContent = prog.nombre;
        this.elements.select.appendChild(opt);
      });
    } catch (err) {
      console.error('Error al cargar índice de mallas:', err);
      this.elements.select.innerHTML = '<option value="" disabled>Error al cargar programas</option>';
      if (typeof Toast !== 'undefined') {
        Toast.show('Error al conectar con los datos de mallas.', 'error');
      }
    }
  },

  /**
   * Loads a specific program curriculum
   * @param {Object} prog - Program object { id, nombre, archivo }
   */
  async loadProgram(prog) {
    this.elements.gridContainer.innerHTML = '<div class="mallas-empty-state"><p>Cargando plan de estudios...</p></div>';
    this.elements.statsContainer.style.display = 'none';
    this.elements.searchInput.disabled = true;
    this.elements.searchInput.value = '';
    this.elements.clearSearchBtn.style.display = 'none';
    this.state.pinnedSubjectId = null;

    try {
      const response = await fetch(`./data/mallas/${prog.archivo}`);
      if (!response.ok) throw new Error('No se pudo cargar el archivo del plan.');

      const data = await response.json();
      this.state.currentMalla = data;
      
      // Create quick map lookup and parse stats
      this.buildSubjectMap(data);
      this.renderGrid(data);
      this.renderStats(data);

      this.elements.searchInput.disabled = false;
    } catch (err) {
      console.error(`Error al cargar plan de ${prog.nombre}:`, err);
      this.elements.gridContainer.innerHTML = '<div class="mallas-empty-state"><p>Error al cargar el plan de estudios.</p></div>';
      if (typeof Toast !== 'undefined') {
        Toast.show(`No se pudo cargar la malla de ${prog.nombre}.`, 'error');
      }
    }
  },

  /**
   * Maps subjects for recursive lookup and calculations
   */
  buildSubjectMap(data) {
    this.state.subjectMap = {};
    if (!data.semestres) return;
    
    data.semestres.forEach(sem => {
      if (sem.materias) {
        sem.materias.forEach(mat => {
          this.state.subjectMap[mat.id] = mat;
        });
      }
    });
  },

  /**
   * Calculates and renders curriculum statistics
   */
  renderStats(data) {
    const semestresCount = data.semestres ? data.semestres.length : 0;
    let materiasCount = 0;
    let creditosCount = 0;

    if (data.semestres) {
      data.semestres.forEach(sem => {
        if (sem.materias) {
          materiasCount += sem.materias.length;
          sem.materias.forEach(mat => {
            creditosCount += parseInt(mat.creditos) || 0;
          });
        }
      });
    }

    this.elements.statSemestres.textContent = semestresCount;
    this.elements.statMaterias.textContent = materiasCount;
    this.elements.statCreditos.textContent = creditosCount;
    this.elements.statsContainer.style.display = 'flex';
  },

  /**
   * Renders the HTML grid of semestres and subject cards
   */
  renderGrid(data) {
    this.elements.gridContainer.innerHTML = '';

    if (!data.semestres || data.semestres.length === 0) {
      this.elements.gridContainer.innerHTML = '<div class="mallas-empty-state"><p>Este programa no cuenta con asignaturas registradas.</p></div>';
      return;
    }

    data.semestres.forEach(sem => {
      const semCol = document.createElement('div');
      semCol.className = 'malla-semestre-col';
      semCol.dataset.semestre = sem.numero;

      // Calculate semester total credits
      let semCredits = 0;
      if (sem.materias) {
        sem.materias.forEach(m => semCredits += parseInt(m.creditos) || 0);
      }

      // Column Header
      const header = document.createElement('div');
      header.className = 'malla-semestre-header';
      header.innerHTML = `
        <h4>Semestre ${sem.numero}</h4>
        <span class="malla-semestre-credits">${semCredits} créditos</span>
      `;
      semCol.appendChild(header);

      // Render Cards
      if (sem.materias && sem.materias.length > 0) {
        sem.materias.forEach(mat => {
          const card = document.createElement('div');
          card.className = 'malla-materia-card';
          card.id = `malla-card-${mat.id}`;
          card.dataset.id = mat.id;
          
          card.innerHTML = `
            <span class="malla-materia-id">${mat.id}</span>
            <div class="malla-materia-name">${mat.nombre}</div>
            <div class="malla-materia-footer">
              <span class="malla-materia-credits">${mat.creditos} CR</span>
            </div>
          `;

          // Interactive Events
          card.addEventListener('mouseenter', () => this.handleHoverEnter(mat.id));
          card.addEventListener('mouseleave', () => this.handleHoverLeave());
          card.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleCardClick(mat.id);
          });

          semCol.appendChild(card);
        });
      }

      this.elements.gridContainer.appendChild(semCol);
    });

    // Handle clicking empty spaces inside grid to clear selection
    this.elements.gridContainer.addEventListener('click', () => {
      this.state.pinnedSubjectId = null;
      this.clearHighlight();
    });
  },

  /**
   * Hover enter handler
   */
  handleHoverEnter(subjectId) {
    // If there is a pinned card, hover does nothing
    if (this.state.pinnedSubjectId) return;
    this.highlightChain(subjectId);
  },

  /**
   * Hover leave handler
   */
  handleHoverLeave() {
    if (this.state.pinnedSubjectId) return;
    this.clearHighlight();
  },

  /**
   * Click handler on a card (pin/unpin selection)
   */
  handleCardClick(subjectId) {
    const card = document.getElementById(`malla-card-${subjectId}`);
    if (card) {
      // Remove the animation class if it exists to reset
      card.classList.remove('card-pulse-anim');
      // Trigger reflow to restart animation
      void card.offsetWidth;
      // Add animation class
      card.classList.add('card-pulse-anim');
      // Remove it after the animation duration (400ms)
      setTimeout(() => {
        card.classList.remove('card-pulse-anim');
      }, 400);
    }

    if (this.state.pinnedSubjectId === subjectId) {
      // Toggle off if clicking the already selected card
      this.state.pinnedSubjectId = null;
      this.clearHighlight();
    } else {
      // Select new card
      this.state.pinnedSubjectId = subjectId;
      this.highlightChain(subjectId);
    }
  },

  /**
   * Recursively highlights prerequisites and unlocks
   */
  highlightChain(subjectId) {
    this.clearHighlight();

    // Get prerequisite chain (backward)
    const prereqs = new Set();
    this.getPrereqsRecursive(subjectId, prereqs);
    prereqs.delete(subjectId); // Do not color active subject as prereq

    // Get unlocks chain (forward)
    const unlocks = new Set();
    this.getUnlocksRecursive(subjectId, unlocks);
    unlocks.delete(subjectId); // Do not color active subject as unlock

    // Apply classes to DOM cards
    Object.keys(this.state.subjectMap).forEach(id => {
      const card = document.getElementById(`malla-card-${id}`);
      if (!card) return;

      if (id === subjectId) {
        card.classList.add('highlight-selected');
      } else if (prereqs.has(id)) {
        card.classList.add('highlight-prereq');
      } else if (unlocks.has(id)) {
        card.classList.add('highlight-unlocks');
      } else {
        card.classList.add('dimmed');
      }
    });
  },

  /**
   * Traverses backward in the graph to gather prerequisites recursively
   */
  getPrereqsRecursive(id, set) {
    if (set.has(id)) return;
    set.add(id);

    const mat = this.state.subjectMap[id];
    if (mat && mat.prerrequisitos) {
      mat.prerrequisitos.forEach(pId => {
        this.getPrereqsRecursive(pId, set);
      });
    }
  },

  /**
   * Traverses forward in the graph to gather unlocked subjects recursively
   */
  getUnlocksRecursive(id, set) {
    if (set.has(id)) return;
    set.add(id);

    const mat = this.state.subjectMap[id];
    if (mat && mat.desbloquea) {
      mat.desbloquea.forEach(uId => {
        this.getUnlocksRecursive(uId, set);
      });
    }
  },

  /**
   * Clears all highlighted and dimmed states from cards
   */
  clearHighlight() {
    Object.keys(this.state.subjectMap).forEach(id => {
      const card = document.getElementById(`malla-card-${id}`);
      if (card) {
        card.classList.remove('highlight-selected', 'highlight-prereq', 'highlight-unlocks', 'dimmed');
      }
    });
  },

  /**
   * Normalizes a string by converting it to lowercase and removing all accents/diacritics
   * @param {string} str 
   * @returns {string}
   */
  normalizeString(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  },

  /**
   * Searches subjects inside the current curriculum
   */
  handleSearch(query) {
    const cleanQuery = this.normalizeString(query);
    
    if (cleanQuery === '') {
      this.elements.clearSearchBtn.style.display = 'none';
      this.clearSearchMatches();
      return;
    }

    this.elements.clearSearchBtn.style.display = 'block';

    let firstMatch = null;

    Object.keys(this.state.subjectMap).forEach(id => {
      const mat = this.state.subjectMap[id];
      const card = document.getElementById(`malla-card-${id}`);
      if (!card) return;

      const normNombre = this.normalizeString(mat.nombre);
      const normId = this.normalizeString(mat.id);

      const matches = normNombre.includes(cleanQuery) || normId.includes(cleanQuery);
      if (matches) {
        card.classList.add('search-match');
        card.classList.remove('dimmed');
        if (!firstMatch) firstMatch = card;
      } else {
        card.classList.remove('search-match');
        // Only dim if the user isn't clicking/pinning a subject, or dim regardless if not matching search
        card.classList.add('dimmed');
      }
    });

    // Auto-scroll to the first matched subject card smoothly
    if (firstMatch) {
      firstMatch.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  },

  /**
   * Clears search highlights and states
   */
  clearSearch() {
    this.elements.searchInput.value = '';
    this.elements.clearSearchBtn.style.display = 'none';
    this.clearSearchMatches();
    if (this.state.pinnedSubjectId) {
      this.highlightChain(this.state.pinnedSubjectId);
    }
  },

  /**
   * Removes search classes and dimmed states
   */
  clearSearchMatches() {
    Object.keys(this.state.subjectMap).forEach(id => {
      const card = document.getElementById(`malla-card-${id}`);
      if (card) {
        card.classList.remove('search-match');
      }
    });
    if (!this.state.pinnedSubjectId) {
      this.clearHighlight();
    }
  }
};
