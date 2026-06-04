/**
 * JS Module: Calendario Académico
 * Handles loading event data from Cloudflare R2 (with local fallback),
 * rendering monthly grids, displaying rich tooltips, and managing PWA notifications.
 */

import { APP_CONFIG } from './core.js';
import { ActionBar } from './action-bar.js';
import { Toast } from './toast-system.js';
import { SistemaCargaOfertas } from './sistema-carga-ofertas.js';

export const CalendarioAcademico = {
  elements: {
    modal: null,
    closeBtn: null,
    select: null,
    gridContainer: null,
    tooltip: null
  },

  state: {
    semestres: [],
    currentSemester: null,
    currentEvents: [],
    alertCheckDone: false
  },

  /**
   * Initializes the CalendarioAcademico component
   */
  init() {
    this.elements.modal = document.getElementById('calendarioModal');
    this.elements.closeBtn = document.getElementById('closeCalendarioModalBtn');
    this.elements.select = document.getElementById('calendarioSemesterSelect');
    this.elements.gridContainer = document.getElementById('calendariosGridContainer');
    this.elements.tooltip = document.getElementById('calendarTooltip');

    if (!this.elements.modal) {
      console.warn('CalendarioAcademico: Modal element not found in DOM.');
      return;
    }

    // Bind basic events
    this.elements.closeBtn.addEventListener('click', () => this.close());
    this.elements.modal.addEventListener('click', (e) => {
      if (e.target === this.elements.modal) this.close();
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.elements.modal.classList.contains('active')) {
        this.close();
      }
    });

    // Load available semesters from SistemaCargaOfertas
    this.loadSemestersList();

    // Select change handler
    this.elements.select.addEventListener('change', (e) => {
      this.loadCalendar(e.target.value);
    });

    // Register ActionBar event
    ActionBar.onAction('calendario', () => this.open());

    // Run pro-active alerts check once on app launch (after a tiny delay to let other systems load)
    setTimeout(() => this.checkProactiveAlerts(), 1000);
  },

  /**
   * Opens the modal
   */
  open() {
    if (this.elements.modal) {
      this.elements.modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      // Load current semester if not loaded yet
      if (!this.state.currentSemester && this.elements.select.value) {
        this.loadCalendar(this.elements.select.value);
      }
    }
  },

  /**
   * Closes the modal
   */
  close() {
    if (this.elements.modal) {
      this.elements.modal.classList.remove('active');
      document.body.style.overflow = '';
      this.hideTooltip();
    }
  },

  /**
   * Populates the semester selector dropdown using active state
   */
  loadSemestersList() {
    // Attempt to load from global offers system
    if (SistemaCargaOfertas && SistemaCargaOfertas.indice && SistemaCargaOfertas.indice.semestres) {
      this.state.semestres = SistemaCargaOfertas.indice.semestres.map(s => ({
        periodo: s.periodo,
        label: s.label
      }));
    } else {
      // Default fallback
      this.state.semestres = [{ periodo: '2026-1', label: '2026 - Semestre 1' }];
    }

    this.elements.select.innerHTML = '';
    this.state.semestres.forEach(sem => {
      const opt = document.createElement('option');
      opt.value = sem.periodo;
      opt.textContent = sem.label;
      this.elements.select.appendChild(opt);
    });

    // Set initial selected option matching global active semester
    if (SistemaCargaOfertas && SistemaCargaOfertas.semestreActual) {
      this.elements.select.value = SistemaCargaOfertas.semestreActual;
    }
  },

  /**
   * Fetches the calendar data from R2 or local fallback
   * @param {string} semester - e.g. "2026-1"
   */
  async loadCalendar(semester) {
    this.elements.gridContainer.innerHTML = '<div class="calendario-empty-state"><p>Cargando fechas académicas...</p></div>';
    this.hideTooltip();

    let fetchedData = null;

    // 1. Try to fetch from Cloudflare R2
    try {
      const r2Url = `${APP_CONFIG.R2_BUCKET_URL}/calendario/${semester}.json`;
      const response = await fetch(r2Url);
      if (response.ok) {
        fetchedData = await response.json();
      }
    } catch (err) {
      console.warn(`R2 fetch failed for calendar ${semester}. Falling back to local data.`, err);
    }

    // 2. Fallback to local files if R2 failed or returned 404
    if (!fetchedData) {
      try {
        const localUrl = `./data/calendario/${semester}.json`;
        const response = await fetch(localUrl);
        if (response.ok) {
          fetchedData = await response.json();
        } else {
          throw new Error('Local file not found');
        }
      } catch (err) {
        console.error(`Local fallback failed for calendar ${semester}:`, err);
      }
    }

    // Render calendar if data loaded successfully
    if (fetchedData) {
      this.state.currentSemester = semester;
      this.state.currentEvents = fetchedData.eventos || [];
      this.renderMiniCalendars(this.state.currentEvents);
    } else {
      this.elements.gridContainer.innerHTML = '<div class="calendario-empty-state"><p>No se encontraron datos para este calendario académico.</p></div>';
    }
  },

  /**
   * Determines month ranges and renders the month grids
   */
  renderMiniCalendars(events) {
    this.elements.gridContainer.innerHTML = '';

    if (events.length === 0) {
      this.elements.gridContainer.innerHTML = '<div class="calendario-empty-state"><p>No hay eventos registrados en este periodo.</p></div>';
      return;
    }

    // 1. Automatically calculate the month range from event dates
    const months = this.calculateMonthsRange(events);

    // 2. Render each month
    months.forEach(({ year, month }) => {
      const monthCard = this.createMonthCard(year, month, events);
      this.elements.gridContainer.appendChild(monthCard);
    });
  },

  /**
   * Automatically calculates all months spanning from the first event to the last event
   */
  calculateMonthsRange(events) {
    let minDate = null;
    let maxDate = null;

    events.forEach(ev => {
      const start = new Date(ev.inicio + 'T00:00:00');
      const end = new Date(ev.fin + 'T00:00:00');

      if (!minDate || start < minDate) minDate = start;
      if (!maxDate || end > maxDate) maxDate = end;
    });

    if (!minDate || !maxDate) return [];

    const months = [];
    let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endLimit = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

    while (current <= endLimit) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth()
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  },

  /**
   * Generates a monthly card with days aligned to Monday-Sunday
   */
  createMonthCard(year, month, events) {
    const monthCard = document.createElement('div');
    monthCard.className = 'mini-month-card';

    const monthNames = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    // Header
    const title = document.createElement('h3');
    title.className = 'mini-month-title';
    title.textContent = `${monthNames[month]} ${year}`;
    monthCard.appendChild(title);

    // Days Grid
    const grid = document.createElement('div');
    grid.className = 'mini-days-grid';

    // Day Headers (L, M, M, J, V, S, D)
    const dayHeaders = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    dayHeaders.forEach(dh => {
      const el = document.createElement('div');
      el.className = 'mini-day-header';
      el.textContent = dh;
      grid.appendChild(el);
    });

    // Calendar math: find offset of 1st day of month (Monday=0, Sunday=6)
    const firstDay = new Date(year, month, 1);
    let dayOfWeek = firstDay.getDay(); // Sunday=0, Monday=1...
    let offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Align to Monday=0

    // Render empty prepending cells
    for (let i = 0; i < offset; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'mini-day-cell empty';
      grid.appendChild(emptyCell);
    }

    // Number of days in month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Normalizing "Today" normalized to local midnight
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Render each day cell
    for (let day = 1; day <= totalDays; day++) {
      const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cell = document.createElement('div');
      cell.className = 'mini-day-cell';
      cell.textContent = day;

      if (cellDateStr === todayStr) {
        cell.classList.add('today');
      }

      // Check if day is the start or end date of any event
      const dayEvents = events.filter(ev => cellDateStr === ev.inicio || cellDateStr === ev.fin);

      if (dayEvents.length > 0) {
        cell.classList.add('has-event');
        
        // Instead of painting the background, we put indicator dots
        cell.textContent = '';
        const dayNumberSpan = document.createElement('span');
        dayNumberSpan.textContent = day;
        cell.appendChild(dayNumberSpan);

        const dotsContainer = document.createElement('div');
        dotsContainer.style.display = 'flex';
        dotsContainer.style.gap = '3px';
        dotsContainer.style.justifyContent = 'center';
        dotsContainer.style.marginTop = '2px';
        dotsContainer.style.flexWrap = 'wrap';
        dotsContainer.style.maxWidth = '100%';

        dayEvents.forEach(ev => {
          const dot = document.createElement('div');
          dot.style.width = '5px';
          dot.style.height = '5px';
          dot.style.borderRadius = '50%';
          dot.style.backgroundColor = ev.color_css;
          dotsContainer.appendChild(dot);
        });

        cell.appendChild(dotsContainer);
        cell.style.display = 'flex';
        cell.style.flexDirection = 'column';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        
        // Attach event metadata to DOM dataset
        cell.dataset.events = JSON.stringify(dayEvents);
        cell.dataset.date = cellDateStr;

        // Hover & tap events to trigger tooltips
        cell.addEventListener('mouseenter', (e) => this.showTooltip(e));
        cell.addEventListener('mouseleave', () => this.hideTooltip());
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showTooltip(e, true);
        });
      }

      grid.appendChild(cell);
    }

    monthCard.appendChild(grid);
    return monthCard;
  },

  /**
   * Displays the glassmorphism floating tooltip containing event details
   */
  showTooltip(event, isClick = false) {
    const cell = event.currentTarget;
    const eventsData = JSON.parse(cell.dataset.events || '[]');
    const dateStr = cell.dataset.date;

    if (eventsData.length === 0) return;

    // Remove existing highlights
    document.querySelectorAll('.mini-day-cell.event-highlight').forEach(el => {
      el.classList.remove('event-highlight');
      el.style.removeProperty('--glow-color');
    });

    // Formatting date neatly
    const dateObj = new Date(dateStr + 'T00:00:00');
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString('es-ES', options);

    // Build rich tooltip HTML (supports multiple events on a single day!)
    let html = `<div class="tooltip-date">${formattedDate}</div>`;
    eventsData.forEach(ev => {
      let badgeText = '';
      if (ev.inicio !== ev.fin) {
        if (dateStr === ev.inicio) {
          badgeText = 'Inicio';
        } else if (dateStr === ev.fin) {
          badgeText = 'Final';
        }
      }

      const badgeHtml = badgeText 
        ? `<span class="tooltip-event-badge badge-${badgeText.toLowerCase()}">${badgeText}</span>` 
        : '';

      html += `
        <div class="tooltip-event-card">
          ${badgeHtml}
          <div class="tooltip-title">
            <span class="tooltip-color-indicator" style="background: ${ev.color_css};"></span>
            ${ev.titulo}
          </div>
          <p class="tooltip-desc">${ev.descripcion || 'Sin descripción adicional.'}</p>
        </div>
      `;

      // Highlight start and end cells
      const startCell = document.querySelector(`.mini-day-cell[data-date="${ev.inicio}"]`);
      const endCell = document.querySelector(`.mini-day-cell[data-date="${ev.fin}"]`);
      if (startCell) {
        startCell.classList.add('event-highlight');
        startCell.style.setProperty('--glow-color', ev.color_css);
      }
      if (endCell) {
        endCell.classList.add('event-highlight');
        endCell.style.setProperty('--glow-color', ev.color_css);
      }
    });

    this.elements.tooltip.innerHTML = html;
    this.elements.tooltip.style.display = 'block';

    // Calculate bounding box and smart layout position
    const cellRect = cell.getBoundingClientRect();
    const modalRect = this.elements.modal.querySelector('.calendario-modal-content').getBoundingClientRect();
    
    // Relative coordinates inside the modal container
    const relativeLeft = cellRect.left - modalRect.left;
    const relativeTop = cellRect.top - modalRect.top;

    // Tooltip size measurement
    const tooltipWidth = this.elements.tooltip.offsetWidth;
    const tooltipHeight = this.elements.tooltip.offsetHeight;

    // Default centered on top of cell
    let leftPos = relativeLeft + (cellRect.width / 2) - (tooltipWidth / 2);
    let topPos = relativeTop - tooltipHeight - 10;

    // Boundary constraints: horizontal
    if (leftPos < 10) leftPos = 10;
    if (leftPos + tooltipWidth > modalRect.width - 10) {
      leftPos = modalRect.width - tooltipWidth - 10;
    }

    // Boundary constraints: vertical (Smart swap to bottom if top is out of bounds)
    if (relativeTop - tooltipHeight - 10 < 10) {
      topPos = relativeTop + cellRect.height + 10; // Position below
    }

    this.elements.tooltip.style.left = `${leftPos}px`;
    this.elements.tooltip.style.top = `${topPos}px`;
    this.elements.tooltip.classList.add('active');
  },

  /**
   * Hides the floating tooltip
   */
  hideTooltip() {
    if (this.elements.tooltip) {
      this.elements.tooltip.classList.remove('active');
      this.elements.tooltip.style.display = 'none';
    }
    // Remove highlights from all cells
    document.querySelectorAll('.mini-day-cell.event-highlight').forEach(el => {
      el.classList.remove('event-highlight');
      el.style.removeProperty('--glow-color');
    });
  },

  /**
   * Proactive Toast Alerts Check (runs on app launch)
   */
  async checkProactiveAlerts() {
    if (this.state.alertCheckDone) return;
    
    let activeSemester = '2026-1'; // Default fallback
    if (SistemaCargaOfertas && SistemaCargaOfertas.semestreActual) {
      activeSemester = SistemaCargaOfertas.semestreActual;
    }

    let events = [];

    // Fetch calendar JSON
    try {
      const r2Url = `${APP_CONFIG.R2_BUCKET_URL}/calendario/${activeSemester}.json`;
      const response = await fetch(r2Url);
      if (response.ok) {
        const data = await response.json();
        events = data.eventos || [];
      }
    } catch (err) {
      // Fallback
      try {
        const response = await fetch(`./data/calendario/${activeSemester}.json`);
        if (response.ok) {
          const data = await response.json();
          events = data.eventos || [];
        }
      } catch (localErr) {
        console.warn('Proactive alerts: unable to fetch calendar data.', localErr);
        return;
      }
    }

    if (events.length === 0) return;

    // Analyze dates
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTime = today.getTime();

    events.forEach(ev => {
      if (!ev.alerta) return;

      const start = new Date(ev.inicio + 'T00:00:00');
      start.setHours(0,0,0,0);
      const startTime = start.getTime();

      const end = new Date(ev.fin + 'T23:59:59');
      const endTime = end.getTime();

      const diffTime = startTime - todayTime;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let alertLevel = null; // 'today', 'warning', 'info'
      let message = '';

      // 1. Level 'today': event is active today (today is between start and end)
      if (todayTime >= startTime && todayTime <= endTime) {
        alertLevel = 'today';
        message = `📅 ¡Hoy está activo: ${ev.titulo}! ${ev.descripcion ? '- ' + ev.descripcion : ''}`;
      }
      // 2. Level 'warning': starts in 1 to 3 days
      else if (diffDays > 0 && diffDays <= 3) {
        alertLevel = 'warning';
        message = `⚠️ ¡Alerta: ${ev.titulo} inicia en ${diffDays} día${diffDays > 1 ? 's' : ''}!`;
      }
      // 3. Level 'info': starts in 4 to diasAlerta days
      else if (diffDays > 3 && diffDays <= (ev.diasAlerta || 7)) {
        alertLevel = 'info';
        message = `💡 Recordatorio: ${ev.titulo} inicia en ${diffDays} días.`;
      }

      // If alert condition met, show toast only if not notified yet
      if (alertLevel) {
        const storageKey = `alerted_cal_${ev.id}_${alertLevel}`;
        if (!localStorage.getItem(storageKey)) {
          if (typeof Toast !== 'undefined') {
            const toastType = alertLevel === 'today' ? 'error' : (alertLevel === 'warning' ? 'warning' : 'info');
            Toast.show(message, toastType, 8000);
            localStorage.setItem(storageKey, 'true');
          }
        }
      }
    });

    this.state.alertCheckDone = true;

    // Optional: Calculate total active/warning alerts to display as numerical badge in ActionBar
    this.updateActionBarBadge(events, todayTime);
  },

  /**
   * Updates the numerical notification badge on the Action Bar toggle
   */
  updateActionBarBadge(events, todayTime) {
    let alertCount = 0;

    events.forEach(ev => {
      if (!ev.alerta) return;

      const start = new Date(ev.inicio + 'T00:00:00');
      start.setHours(0,0,0,0);
      const startTime = start.getTime();

      const end = new Date(ev.fin + 'T23:59:59');
      const endTime = end.getTime();

      const diffTime = startTime - todayTime;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // Count alert if it's active today OR starts in <= 3 days
      if ((todayTime >= startTime && todayTime <= endTime) || (diffDays > 0 && diffDays <= 3)) {
        alertCount++;
      }
    });

    if (ActionBar && typeof ActionBar.setBadge === 'function') {
      ActionBar.setBadge(alertCount);
    }
  }
};
