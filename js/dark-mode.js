/**
 * MODO NOCTURNO - DARK MODE
 * Sistema de tema oscuro con persistencia en localStorage
 */

(function() {
  'use strict';
  
  // Verificar si ya existe el botón
  if (document.getElementById('themeToggle')) {
    return;
  }
  
  // Crear botón de tema
  const themeToggle = document.createElement('button');
  themeToggle.id = 'themeToggle';
  themeToggle.setAttribute('aria-label', 'Cambiar tema');
  themeToggle.setAttribute('title', 'Cambiar entre modo diurno y nocturno');
  
  // Iconos SVG
  const sunIcon = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="5" fill="currentColor"/>
      <path d="M12 1v4M12 19v4M23 12h-4M5 12H1M20.66 3.34l-2.83 2.83M6.17 17.83l-2.83 2.83M20.66 20.66l-2.83-2.83M6.17 6.17L3.34 3.34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
  
  const moonIcon = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
    </svg>
  `;
  
  // Estado inicial
  let isDarkMode = localStorage.getItem('darkMode') === 'true';
  
  // Función para actualizar icono
  function updateIcon() {
    themeToggle.innerHTML = isDarkMode ? moonIcon : sunIcon;
  }
  
  // Función para aplicar tema
  // Función para aplicar tema
  function applyTheme(dark) {
    const metaTheme = document.getElementById('theme-meta');
    
    if (dark) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
      if (metaTheme) metaTheme.setAttribute('content', '#121212');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
      if (metaTheme) metaTheme.setAttribute('content', '#ffffff');
    }
    
    isDarkMode = dark;
    updateIcon();
  }
  
  // Función para toggle del tema
  function toggleTheme() {
    // Agregar clase de rotación
    themeToggle.classList.add('rotating');
    
    // Agregar clase temporal para transiciones
    document.body.classList.add('theme-transitioning');
    
    // Cambiar tema
    applyTheme(!isDarkMode);
    
    // Remover clase de rotación después de la animación
    setTimeout(() => {
      themeToggle.classList.remove('rotating');
    }, 400);
    
    // Remover clase de transición después de completar
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 450);
  }
  
  // Event listener
  themeToggle.addEventListener('click', toggleTheme);
  
  // Aplicar tema inicial
  applyTheme(isDarkMode);
  
  // Función para verificar si estamos en el home
  function isInHome() {
    const homeView = document.getElementById('home');
    return homeView && homeView.classList.contains('active');
  }
  
  // Función para mostrar/ocultar botón según la vista
  function updateButtonVisibility() {
    if (isInHome()) {
      themeToggle.style.display = 'flex';
    } else {
      themeToggle.style.display = 'none';
    }
  }
  
  // Agregar botón al DOM cuando esté listo
  if (document.body) {
    document.body.appendChild(themeToggle);
    updateButtonVisibility();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(themeToggle);
      updateButtonVisibility();
    });
  }
  
  // Observar cambios en las vistas para mostrar/ocultar el botón
  const observer = new MutationObserver(() => {
    updateButtonVisibility();
  });
  
  // Observar cambios en el body y sus hijos
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
    });
  }
  
  // Detectar preferencia del sistema (opcional)
  if (!localStorage.getItem('darkMode')) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      applyTheme(true);
    }
  }
  
})();
