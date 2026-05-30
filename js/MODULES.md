# Índice de Módulos (Capa de Lógica - ES Modules)

El proyecto utiliza un sistema de **Módulos de ES6 (ES Modules)** en lugar del antiguo sistema de scripts cargados secuencialmente en el DOM. El punto de entrada principal es `js/main.js`, cargado en el HTML mediante `<script type="module" src="js/main.js">`. Todos los módulos importan y exportan explícitamente sus dependencias.

---

## 1. Cimientos, Configuración y Utilidades
* **[`core.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/core.js):** Constantes del sistema (`APP_CONFIG` con la URL del bucket de Cloudflare R2), `ErrorHandler` centralizado, utilidades de almacenamiento y tiempo, y gestión centralizada de colores de asignaturas.
* **[`storage-db.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/storage-db.js):** Motor asíncrono basado en **IndexedDB** (`StorageDB`) que provee una abstracción de almacenamiento clave-valor persistente con capacidad para ofertas académicas pesadas, superando el límite de 5MB de LocalStorage.
* **[`version.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/version.js):** Información de la versión actual del proyecto para el sistema de changelogs.
* **[`toast-system.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/toast-system.js):** Sistema liviano de notificaciones tipo Toast en pantalla.

## 2. Estado Global y Lógica Pura
* **[`state-manager.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/state-manager.js):** Única fuente de verdad para el estado de la aplicación (`schedules`, `editorState`). Valida e importa esquemas de horarios y gestiona el auto-guardado en `StorageDB`.
* **[`calculadora-aguinaldo.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/calculadora-aguinaldo.js):** Lógica de cálculo de costos (transporte, alimentación, conteo de días activos y detección de huecos/viajes adicionales) y utilidades de días festivos.

## 3. Ofertas Académicas (Cloudflare R2 & Web Workers)
* **[`sistema-carga-ofertas.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/sistema-carga-ofertas.js):** Gestor de ofertas académicas. Carga dinámicamente el índice de semestres (`index.json`) y los archivos de oferta de las carreras (`{semestre}/{programa}.xlsx.json`) desde el bucket público de **Cloudflare R2**.
* **[`motor-combinaciones.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/motor-combinaciones.js):** Motor de cálculo que ejecuta la generación de combinaciones de asignaturas. Delega el procesamiento pesado a un Web Worker si está disponible.
* **[`motor.worker.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/motor.worker.js):** Archivo del **Web Worker** que ejecuta el cálculo de combinaciones en un hilo secundario para evitar congelar la interfaz de usuario (UI).
* **[`cargador-combinaciones.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/cargador-combinaciones.js):** Mapea y traduce las combinaciones del motor en objetos de asignaturas renderizables compatibles con el esquema de horarios.

## 4. Interfaz de Usuario y Renderizado
* **[`dom-renderer.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/dom-renderer.js):** Motor de renderizado de la tabla principal optimizado (Virtual DOM light) que pinta las asignaturas y gestiona la visualización del horario en base al estado actual.
* **[`sidebar-panel.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/sidebar-panel.js):** Lógica del panel lateral de asignaturas seleccionadas, configuración de filtros de materias, control del límite de combinaciones y selector de período académico.
* **[`minihorarios-ui.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/minihorarios-ui.js):** Componente para la renderización de las miniaturas de horarios resultantes de las combinaciones en el sidebar.
* **[`integracion-busqueda.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/integracion-busqueda.js):** Buscador inteligente de asignaturas en la oferta académica cargada (búsquedas insensibles a mayúsculas y tildes).
* **[`dark-mode.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/dark-mode.js):** Control del tema visual (claro/oscuro) y persistencia del estado en `SafeStorage`.
* **[`export-engine.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/export-engine.js):** Motor de exportación del horario actual a formato de Imagen (PNG) y PDF (formato de matrícula UdeC).

## 5. El Orquestador
* **[`main.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/main.js):** Punto de entrada del sistema. Inicializa el ciclo de vida de la aplicación, enlaza los *Event Listeners* globales del DOM (modales principales, CRUD de horarios, panel de changelog y menú flotante) y conecta los diferentes subsistemas.