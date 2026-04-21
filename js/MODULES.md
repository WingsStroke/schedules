# Índice de Módulos (Capa de Lógica - Vanilla JS)

El proyecto utiliza un patrón de **Módulos mediante Namespaces Globales**. El orden de carga en el `index.html` (mediante el atributo `defer`) es estrictamente jerárquico.

## 1. Cimientos y Persistencia
* **`core.js`:** Utilidades matemáticas, `ErrorHandler`, constantes (`APP_CONFIG`) y colores.
* **`storage-db.js`:** Motor asíncrono de IndexedDB (`StorageDB`).

## 2. Estado y Datos Aislados
* **`state-manager.js`:** Única fuente de verdad. Maneja el estado global (`schedules`, `editorState`) y las validaciones de choque de horarios.
* **`calculadora-aguinaldo.js`:** Lógica matemática pura para el cálculo de costos y festivos colombianos.

## 3. Motor de Combinaciones (El Cerebro de Ofertas)
* **`sistema-carga-ofertas.js`:** Lee y parsea los archivos JSON de `/data`.
* **`motor-combinaciones.js`:** Genera el producto cartesiano y descarta solapamientos.
* **`cargador-combinaciones.js`:** Traduce el output matemático en objetos iterables.

## 4. UI y Renderizado (Manipulación del DOM)
* **`dom-renderer.js`:** Construye la tabla principal y pinta las tarjetas de asignaturas.
* **`sidebar-panel.js` / `minihorarios-ui.js`:** Manejan los paneles laterales.
* **`integracion-busqueda.js`:** Motor de búsqueda de asignaturas.
* **`dark-mode.js`:** Gestión de temas.

## 5. El Orquestador
* **`app.js`:** NO contiene lógica de negocio pesada. Su única función es conectar los *Event Listeners* (clicks, modales, exportaciones) con los módulos anteriores.