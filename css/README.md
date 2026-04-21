# Guía de Estilos CSS — Horarios UdeC

> Documentación actualizada del sistema CSS del proyecto. Refleja el estado real del código a Marzo 2026.

---

## Archivos CSS

```
css/
├── styles.css               (1,963 líneas) — Estilos base, layout, tabla, modales
├── dark-mode.css            (1,087 líneas) — Modo nocturno completo
├── sidebar-panel.css          (566 líneas) — Panel lateral "Generar horario"
├── filtros-asignaturas.css    (453 líneas) — Modal de filtros de asignatura
├── minihorarios-styles.css    (473 líneas) — Vista previa de combinaciones
└── responsive.css             (659 líneas) — Media queries para móvil y tablet

Total: ~5,200 líneas
```

### Orden de carga (index.html)

```html
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="css/minihorarios-styles.css">
<link rel="stylesheet" href="css/sidebar-panel.css">
<link rel="stylesheet" href="css/filtros-asignaturas.css">
<link rel="stylesheet" href="css/dark-mode.css">
<link rel="stylesheet" href="css/responsive.css">   ← último: máxima especificidad
```

El orden importa. `dark-mode.css` sobreescribe el modo claro. `responsive.css` va al final para sobreescribir todo lo anterior en breakpoints móviles.

---

## styles.css — Base

Contiene layout general, tabla de horarios, modales, componentes core y sistema de exportación.

### Sistema de celdas y asignaturas

Las celdas (`.cell`) tienen `height: 60px` en escritorio. En móvil el valor lo dicta CSS y el JS lo lee dinámicamente con `getCellHeight()` — **nunca usar el número 60 hardcodeado en JS nuevo**.

```css
.cell {
  height: 60px;
  position: relative;
  overflow: visible; /* permite que subjects multibloque se extiendan */
}

.subject {
  position: absolute;
  top: 0; left: 0; width: 100%;
  height: calc(blocks × cellHeight); /* calculado por JS */
}
```

Los subjects multibloque se extienden visualmente sobre las celdas bloqueadas de abajo. `overflow: visible` en `.cell` es intencional — no cambiarlo a `hidden` sin considerar este comportamiento.

### Sistema de colores de asignatura

Siempre usar `getSubjectColor(nombre)` definida en `app.js`. Nunca crear paletas locales en otros módulos.

### Modales

El sistema de modales usa `.modal` + `.modal.active`. El `#subjectModal` tiene overrides propios para su ancho de 480px. En móvil se convierte en bottom sheet (ver `responsive.css`).

### Exportación de imagen

`.subject-export` es una clase temporal aplicada por JS durante la captura con `html2canvas`. Aumenta fuentes a 22/17/15px. Nunca debe estar en el DOM en estado normal.

---

## dark-mode.css — Modo Nocturno

Todos los selectores empiezan con `body.dark-mode`. Patrón universal:

```css
body.dark-mode .mi-elemento {
  background: rgba(30, 30, 30, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
}
```

### Valores de referencia

```
Fondos:       rgba(30,30,30,0.85) — modales y paneles
              rgba(20,20,20,0.97) — columna sticky de horas
Texto:        #e0e0e0 — principal
              #b0b0b0 — secundario
              #808080 — deshabilitado
Bordes:       rgba(255,255,255,0.08) — sutil
              rgba(255,255,255,0.15) — normal
              rgba(255,255,255,0.25) — énfasis
```

### Reglas especiales

- `input[type="checkbox"]` excluido del selector universal de inputs para evitar fondos no deseados
- Iconos SVG como `<img>` usan `filter: invert(1)` en dark-mode (ej: `.icon-filtros`, `.home-empty-svg`)
- La columna sticky de horas necesita fondo sólido opaco para tapar el contenido que pasa por debajo al hacer scroll horizontal

---

## responsive.css — Responsividad

Dos breakpoints con cobertura completa:

```
768px — tablet / móvil horizontal
480px — móvil vertical (prioridad)
```

### Componentes clave en móvil

**Tabla de horarios:**
- `#scheduleContainer` con `overflow-x: auto` y scroll horizontal
- Columna `.time` con `position: sticky; left: 0` — siempre visible
- `th:first-child` sticky con `z-index: 21` (encima de la columna de datos)
- Indicador de scroll: `#scheduleContainer::after` gradiente fade que desaparece con clase `.scroll-end`
- Celdas: 44px en 768px, 40px en 480px
- Columnas de días: `min-width: 90px` en 768px, `78px` en 480px

**Modal de asignatura (#subjectModal):**
- Se convierte en bottom sheet: `align-items: flex-end`, `border-radius: 20px 20px 0 0`
- Animación `slideUpSheet` desde abajo
- `body:has(#subjectModal.active)` bloquea scroll del body mientras está abierto

**Modal exportar imagen:**
- Pantalla completa en móvil (`100vw × 100dvh`, `border-radius: 0`)
- Preview arriba con `order: -1`, opciones abajo

**Sidebar:**
- `width: 100vw` en móvil (pantalla completa)

**Changelog:**
- `width: 100vw` en móvil con overlay para cerrar tocando fuera

### Cómo añadir nuevos overrides móviles

Siempre en `responsive.css`, nunca en los archivos base:

```css
@media (max-width: 768px) {
  .mi-componente {
    /* ajuste tablet */
  }
}

@media (max-width: 480px) {
  .mi-componente {
    /* ajuste móvil vertical */
  }
}
```

Si el override necesita dark-mode, añadirlo en `dark-mode.css` dentro del mismo media query:

```css
@media (max-width: 768px) {
  body.dark-mode .mi-componente {
    /* dark + móvil */
  }
}
```

---

## Convenciones

- **kebab-case** para clases: `.schedule-card`, `.subject-content`
- **camelCase** para IDs (coincide con JS): `#subjectModal`, `#scheduleContainer`
- `!important` solo en `dark-mode.css` cuando sea estrictamente necesario para ganar especificidad
- No usar `glass-design-system.css` — ese archivo no existe en el proyecto actual
- `getCellHeight()` es la única fuente de verdad para la altura de celda en JS

---

**Última actualización:** Marzo 2026
