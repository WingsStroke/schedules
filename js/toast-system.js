"use strict";

window.Toast = {
  show: function(message, type = 'info', duration = 3000) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    
    const toast = document.createElement("div");
    // Tipos disponibles: 'info', 'success', 'error', 'warning'
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Disparar la animación de entrada
    requestAnimationFrame(() => toast.classList.add("show"));
    
    // Destruir el toast después del tiempo establecido
    setTimeout(() => {
      toast.classList.remove("show");
      toast.addEventListener("transitionend", () => toast.remove());
    }, duration);
  }
};