"use strict";

// Inyectamos los estilos de los botones de confirmación
const toastStyles = document.createElement('style');
toastStyles.innerHTML = `
  .toast-actions { display: flex; gap: 12px; margin-top: 12px; justify-content: center; }
  .toast-btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; transition: transform 0.1s; }
  .toast-btn:active { transform: scale(0.95); }
  .toast-cancel { background: rgba(255,255,255,0.2); color: white; }
  .toast-accept { background: #4CAF50; color: white; }
`;
document.head.appendChild(toastStyles);

export const Toast = {
  show: function(message, type = 'info', duration = 3000) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    
    setTimeout(() => {
      toast.style.animation = "slideOut 0.3s ease-out forwards";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // NUEVO: Toast con botones de confirmación
  confirm: function(message, onConfirm) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.className = `toast warning`; // Usamos el color naranja/warning
    toast.innerHTML = `
      <div style="margin-bottom: 8px;">${message}</div>
      <div class="toast-actions">
        <button class="toast-btn toast-cancel">Cancelar</button>
        <button class="toast-btn toast-accept">Sobreescribir</button>
      </div>
    `;
    
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    
    const removeToast = () => {
      toast.classList.remove("show");
      toast.addEventListener("transitionend", () => toast.remove());
    };

    toast.querySelector(".toast-cancel").onclick = removeToast;
    toast.querySelector(".toast-accept").onclick = () => {
      removeToast();
      if(onConfirm) onConfirm();
    };
  },

  // NUEVO: Toast con botón de acción
  showAction: function(message, buttonText, onAction, duration = 0) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.className = `toast info`;
    toast.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: 500;">${message}</div>
      <div class="toast-actions" style="margin-top: 6px;">
        <button class="toast-btn toast-accept" style="background: #1d4ed8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600;">${buttonText}</button>
      </div>
    `;
    
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    
    const removeToast = () => {
      toast.classList.remove("show");
      toast.addEventListener("transitionend", () => toast.remove());
    };

    toast.querySelector(".toast-accept").onclick = () => {
      removeToast();
      if(onAction) onAction();
    };

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  }
};
window.Toast = Toast;