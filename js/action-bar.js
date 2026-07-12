/**
 * JS Module: Action Bar
 * Handles expanding/collapsing, persistence of state, badge count, and hooks for action buttons.
 */

export const ActionBar = {
  elements: {
    bar: null,
    toggle: null,
    badge: null,
    btnMallas: null,
    btnCalendario: null
  },

  callbacks: {
    mallas: [],
    calendario: []
  },

  /**
   * Initializes the Action Bar component
   */
  init() {
    const bar = document.getElementById('homeActionBar');
    const toggle = document.getElementById('actionBarToggle');
    const badge = document.getElementById('actionBarBadge');
    const btnMallas = document.getElementById('btnVisorMallas');
    const btnCalendario = document.getElementById('btnCalendarioAcademico');

    ActionBar.elements = { bar, toggle, badge, btnMallas, btnCalendario };

    if (!bar || !toggle) {
      console.warn('Action Bar: elements not found in the DOM.');
      return;
    }

    // Set up toggle click handler with stopPropagation to prevent double triggers
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      ActionBar.toggle();
    });

    // Always start collapsed on page load as requested by the user
    bar.classList.add('collapsed');
    toggle.setAttribute('aria-label', 'Mostrar herramientas');
    toggle.setAttribute('title', 'Mostrar herramientas');

    // Bind action buttons
    if (btnMallas) {
      btnMallas.addEventListener('click', (e) => {
        e.stopPropagation();
        ActionBar._trigger('mallas');
      });
    }

    if (btnCalendario) {
      btnCalendario.addEventListener('click', (e) => {
        e.stopPropagation();
        ActionBar._trigger('calendario');
      });
    }
  },

  /**
   * Toggles the bar open or closed
   */
  toggle() {
    const bar = ActionBar.elements.bar;
    const toggleBtn = ActionBar.elements.toggle;

    if (!bar || !toggleBtn) return;

    const isCollapsed = bar.classList.toggle('collapsed');

    if (isCollapsed) {
      toggleBtn.setAttribute('aria-label', 'Mostrar herramientas');
      toggleBtn.setAttribute('title', 'Mostrar herramientas');
    } else {
      toggleBtn.setAttribute('aria-label', 'Ocultar herramientas');
      toggleBtn.setAttribute('title', 'Ocultar herramientas');
    }
  },

  /**
   * Sets the notification badge count
   * @param {number} count - The badge count. 0 or less will hide the badge.
   */
  setBadge(count) {
    if (!ActionBar.elements.badge) return;

    if (count > 0) {
      ActionBar.elements.badge.textContent = count > 99 ? '99+' : count;
      ActionBar.elements.badge.style.display = 'flex';
    } else {
      ActionBar.elements.badge.style.display = 'none';
      ActionBar.elements.badge.textContent = '0';
    }
  },

  /**
   * Registers a callback for when an action button is clicked
   * @param {string} action - 'mallas' or 'calendario'
   * @param {Function} callback - Callback function
   */
  onAction(action, callback) {
    if (ActionBar.callbacks[action] && typeof callback === 'function') {
      ActionBar.callbacks[action].push(callback);
    }
  },

  /**
   * Triggers all callbacks registered for a specific action
   * @private
   */
  _trigger(action) {
    const list = ActionBar.callbacks[action] || [];
    if (list.length === 0) {
      // Fallback placeholder toast message if no handlers are registered yet
      const message = action === 'mallas' 
        ? 'El Visor de Mallas Académicas estará disponible pronto.' 
        : 'El Calendario Académico estará disponible pronto.';
      if (typeof Toast !== 'undefined') {
        Toast.show(message, 'info');
      } else {
        console.log(`Action Bar clicked: ${action}`);
      }
    } else {
      list.forEach(cb => {
        try {
          cb();
        } catch (err) {
          console.error(`Error in Action Bar callback for '${action}':`, err);
        }
      });
    }
  }
};
