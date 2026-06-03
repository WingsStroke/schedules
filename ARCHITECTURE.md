# 🏗️ Arquitectura Técnica - Sistema Horarios UdeC

> Documentación técnica completa de la arquitectura, patrones de diseño y decisiones técnicas del sistema.

---

## 📐 **Visión General de la Arquitectura**

### **Patrón de Diseño: ES Modules (ES6)**

El sistema está construido como una aplicación frontend moderna basada en **ES Modules (ES6)**, donde cada archivo declara explícitamente sus importaciones y exportaciones. Ya no se depende de un orden estricto de scripts con `defer` en el HTML ni de namespaces globales redundantes. El punto de entrada principal es [`js/main.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/main.js), el cual importa la lógica necesaria de los distintos subsistemas.

```
┌──────────────────────────────────────────────────────────┐
│                    index.html                            │
│              Estructura + Modales + Tablas                │
└────────────────────────┬─────────────────────────────────┘
                         │
          ┌───────────────┴────────────────┐
          │                                │
          ▼                                ▼
 ┌─────────────────┐              ┌──────────────────┐
 │   CSS Layer     │              │    JS Layer      │
 │   (5,200+ L)    │              │  (ES Modules)    │
 └─────────────────┘              └────────┬─────────┘
          │                                │
          │                         18 Módulos JS
          │                                │
          ▼                                ▼
 ┌─────────────────┐              ┌──────────────────┐
 │ Rendering Layer │◄────────────►│  Data Layer      │
 │ (DOM Renderer)  │              │ (IndexedDB + R2) │
 └─────────────────┘              └──────────────────┘
```

---

## 🎯 **Capas de la Aplicación**

### **1. Data Layer (Persistencia y Origen de Datos)**

El sistema combina almacenamiento local asíncrono y consumo dinámico de datos desde un almacenamiento en la nube.

#### **A. Persistencia Local: IndexedDB (`StorageDB`)**
Ubicado en [`js/storage-db.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/storage-db.js), es un motor de base de datos asíncrono que almacena los horarios del usuario. Supera el límite de 5MB del LocalStorage tradicional.
* **Base de Datos:** `UdeCHorariosDB` (Versión 1)
* **Object Store:** `store` (Almacenamiento clave-valor genérico)

Estructura de datos persistida:
```javascript
{
  // === SCHEDULES ===
  "schedules": [
    {
      id: "uuid",
      name: "Mi Horario 2026-1",
      jornada: "diurna",
      subjects: [
        {
          id: "uuid",
          name: "Programación I",
          group: "A",
          program: "Ing. Civil Informática",
          aula: "Sala A-301",
          credits: 5,
          row: 0,           // Bloque temporal en la tabla
          col: 1,           // Día de la semana (0 = Lunes)
          blocks: 2,        // Cantidad de bloques de clase (90/50 min)
          color: "#1d4ed8",
          jornada: "diurna",
          startMinutes: 420,
          endMinutes: 520,
          showCredits: true,
          showGroup: true,
          showProgram: true,
          showAula: true
        }
      ]
    }
  ],
  
  // === STATE ===
  "currentScheduleIndex": 0
}
```

#### **B. Preferencias Cortas: `SafeStorage`**
Ubicado en [`js/core.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/core.js). Es un wrapper seguro alrededor de `localStorage` para almacenar estados síncronos sencillos (ej: `darkMode`, `lastSeenChangelogVersion`).

#### **C. Origen de Datos Académicos: Cloudflare R2**
Las ofertas académicas (los archivos JSON de las materias) se almacenan en un bucket público de Cloudflare R2.
* **URL del Bucket:** `https://pub-ed2a196c92624cfbadea4f7a02c13d95.r2.dev` (Configurado en `APP_CONFIG.R2_BUCKET_URL` en `core.js`).
* **Índice Global:** Un archivo `index.json` en la raíz del bucket lista los períodos académicos (semestres) disponibles de manera dinámica.
* **Estructura del Bucket:**
  ```
  bucket/
  ├── index.json            ← Lista de semestres (ej: ["2026-1", "2025-2"])
  ├── 2026-1/
  │   ├── sistemas.xlsx.json
  │   ├── alimentos.xlsx.json
  │   └── ...
  └── 2025-2/
      └── ...
  ```

---

### **2. Business Logic Layer (Lógica de Negocio)**

#### **A. Administrador de Estado ([`js/state-manager.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/state-manager.js))**
Mantiene la única fuente de verdad para el estado de la aplicación (`schedules`, `editorState`).
* Realiza las mutaciones de los horarios.
* Ejecuta validaciones de esquemas al importar y exportar datos.
* Orquesta el auto-guardado en IndexedDB mediante `StorageDB`.

#### **B. Motor de Combinaciones ([`js/motor-combinaciones.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/motor-combinaciones.js))**
Genera combinaciones horarias válidas sin choques a partir de las asignaturas seleccionadas.
* Filtra las asignaturas por grupo, programa y profesor.
* Realiza el producto cartesiano de los grupos disponibles.
* Para evitar congelamientos de la interfaz, el cálculo intensivo se delega a un hilo de fondo utilizando un Web Worker ([`js/motor.worker.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/motor.worker.js)).

#### **C. Traductor de Combinaciones ([`js/cargador-combinaciones.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/cargador-combinaciones.js))**
Traduce las combinaciones matemáticas calculadas por el motor en listas de asignaturas con la estructura visual (bloques, días de inicio/fin) apta para el renderizador de horarios.

#### **D. Carga de Ofertas ([`js/sistema-carga-ofertas.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/sistema-carga-ofertas.js))**
Se encarga de obtener el índice de semestres desde R2 y de descargar y parsear el JSON de la carrera seleccionada. Integra validaciones robustas para evitar caídas de la aplicación por datos nulos.

#### **E. Calculadora de Costos ([`js/calculadora-aguinaldo.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/calculadora-aguinaldo.js))**
Contiene la lógica de negocio para estimar costos de transporte y alimentación mensuales. Cuenta con la lista oficial de festivos en Colombia para calcular de forma exacta los días de clases del mes consultado, detectando también huecos de tiempo entre clases que requieran viajes adicionales.

---

### **3. Presentation Layer (Interfaz y Renderizado)**

#### **A. Renderizador del Horario ([`js/dom-renderer.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/dom-renderer.js))**
Motor de renderizado óptimo y desacoplado de la lógica de negocio. Utiliza una estrategia de pintado selectivo y caché de elementos para minimizar operaciones del DOM al actualizar la tabla.
* Construye dinámicamente la tabla según la jornada activa (diurna: 7:00 a 18:00, nocturna: 17:30 a 22:00).
* Calcula el alto de celda (`getCellHeight()`) de forma dinámica para ajustarse a las reglas responsivas de CSS (60px en escritorio, 40px en móvil).
* Posiciona de forma absoluta las tarjetas de asignaturas multibloque basándose en los minutos de inicio y fin.

#### **B. Interfaz del Sidebar ([`js/sidebar-panel.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/sidebar-panel.js))**
Administra el panel lateral interactivo:
* Carga la lista de materias de la carrera actual.
* Presenta los filtros de grupos, profesores e información del período académico.
* Aloja el **Selector de Semestres** dinámico al fondo del panel, que permite consultar ofertas de períodos pasados y futuros consultando dinámicamente R2.
* Administra las previsualizaciones de minihorarios ([`js/minihorarios-ui.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/minihorarios-ui.js)).

#### **C. Sistema de Búsqueda ([`js/integracion-busqueda.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/integracion-busqueda.js))**
Maneja el input de texto de búsqueda en el sidebar. Ejecuta normalización de texto (eliminando tildes y mayúsculas) sobre el catálogo de asignaturas cargado para garantizar resultados exactos y amigables.

#### **D. Barra de Herramientas del Home ([`js/action-bar.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/action-bar.js))**
Administra la barra de herramientas lateral deslizable en la vista de inicio. Controla el estado de expansión/colapso, la persistencia en `localStorage`, y gestiona el badge de notificaciones del calendario.

#### **E. Visor de Mallas Académicas ([`js/visor-mallas.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/visor-mallas.js))**
Gestiona la descarga y parseo de mallas curriculares locales, renderiza la grilla interactiva de asignaturas ordenadas por semestre, e implementa el algoritmo de grafo recursivo para iluminar las cadenas completas de prerrequisitos y desbloqueos.

#### **F. Calendario Académico ([`js/calendario-academico.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/calendario-academico.js))**
Obtiene y renderiza las fechas académicas desde Cloudflare R2 (con fallback local), construye dinámicamente las cuadrículas de mini-calendarios por mes, despliega los tooltips enriquecidos y ejecuta el sistema de alertas proactivas (urgencia de 3 niveles) almacenadas en caché.

---

## 🔄 **Flujos de Datos Críticos**

### **Flujo 1: Crear Asignatura Manualmente**

```
Usuario hace doble clic en celda vacía
        │
        ▼
main.js (listener de celda) ──> Abre subjectModal
        │
        ▼
Usuario ingresa los datos y presiona "Guardar"
        │
        ▼
main.js (saveSubjectBtn.onclick)
        ├─ Valida campos obligatorios
        └─ Llama a state-manager.js:addSubjectToSchedule()
                │
                ▼
state-manager.js (Modifica schedules[] en memoria)
        ├─ Llama a saveData() ──> Guarda asíncronamente en StorageDB (IndexedDB)
        └─ Dispara DOMRenderer.rebuildScheduleView() ──> Actualiza la tabla del DOM
```

### **Flujo 2: Generar Combinaciones con R2 y Selector de Período**

```
DOMContentLoaded / Cambio de Semestre
        │
        ▼
sistema-carga-ofertas.js:obtenerIndicesSemestre() ──> Obtiene index.json de R2
        │
        ▼
sidebar-panel.js (Puebla selector de períodos e inicializa con el más reciente)
        │
        ▼
Usuario selecciona una carrera y período
        │
        ▼
sistema-carga-ofertas.js:cargarOfertaPorSemestre() ──> Descarga {semestre}/{programa}.json
        │
        ▼
integracion-busqueda.js (Filtra y muestra materias en el Sidebar)
        │
        ▼
Usuario selecciona materias y presiona "Generar Combinaciones"
        │
        ▼
motor-combinaciones.js ──> Envía materias al Web Worker (motor.worker.js)
        │
        ▼
Web Worker realiza producto cartesiano y filtros (hilo secundario)
        │
        ▼
motor-combinaciones.js recibe el array de combinaciones óptimas
        │
        ▼
minihorarios-ui.js renderiza las mini-cards en el panel
        │
        ▼
Usuario elige combinación ──> cargador-combinaciones.js (traduce a subjects[])
        │
        ▼
state-manager.js:createSchedule() ──> Guarda en IndexedDB y activa nuevo horario
```

---

## 🎨 **Sistema de Estilos y Responsividad**

### **Estructura CSS Desacoplada**

El diseño se basa en una arquitectura modular sin dependencias de frameworks CSS como Tailwind (vanilla CSS para máxima flexibilidad y rendimiento):

* [`styles.css`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/css/styles.css): Contiene los estilos base de la aplicación, el layout principal de la grilla horaria, tarjetas y modales.
* [`dark-mode.css`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/css/dark-mode.css): Aplica la temática oscura y de glassmorphic utilizando selectores bajo `body.dark-mode`.
* [`responsive.css`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/css/responsive.css): Contiene todos los media queries específicos para tabletas (768px) y móviles (480px).
* Hojas de estilos específicas de componentes: [`sidebar-panel.css`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/css/sidebar-panel.css), [`filtros-asignaturas.css`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/css/filtros-asignaturas.css) y [`minihorarios-styles.css`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/css/minihorarios-styles.css).

---

## 🧪 **Testing Integrado con Vitest**

El proyecto cuenta con una suite de pruebas unitarias configurada mediante **Vitest** y **JSDOM** para garantizar la validez de los algoritmos críticos sin necesidad de un navegador completo.

* **Tests de Lógica de Costos:** [`tests/calculadora-aguinaldo.test.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/tests/calculadora-aguinaldo.test.js) valida el conteo de días con clases y el cálculo financiero de alimentación y transporte.
* **Tests del Generador:** [`tests/motor-combinaciones.test.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/tests/motor-combinaciones.test.js) simula la selección de asignaturas y comprueba que el motor detecte choques correctamente y genere las combinaciones libres de solapamientos esperadas.

Para ejecutar las pruebas:
```bash
npm test
```

---

## 🛠️ **Entorno de Desarrollo y Despliegue**

### **Desarrollo con Vite**
El proyecto usa **Vite** como servidor de desarrollo rápido y empaquetador para producción.
* Servidor de desarrollo: `npm run dev`
* Compilación de producción: `npm run build`
* Servidor de pruebas local (preview): `npm run preview`

### **CI/CD: GitHub Actions**
El despliegue está automatizado mediante GitHub Actions. Al realizar un push a la rama principal, el workflow `.github/workflows/deploy.yml` compila el proyecto usando Vite y publica el bundle resultante en **GitHub Pages**.
* **URL de Producción:** `https://github.com/WingsStroke/schedules`

---

## 🔮 **Decisiones de Diseño Clave**

1. **¿Por qué ES Modules y Vite en lugar de Vanilla estático sin dependencias?**
   A medida que el código creció a 18 archivos JS, los imports/exports nativos facilitaron el mantenimiento y la separación de responsabilidades. Vite provee un servidor de desarrollo ultra-rápido y optimiza el despliegue a producción compilando a un bundle unificado.
2. **¿Por qué IndexedDB en lugar de LocalStorage?**
   Las ofertas académicas y configuraciones detalladas de horarios consumían rápidamente la cuota de 5MB de LocalStorage. IndexedDB permite almacenar gigabytes de datos sin problemas y realizar lecturas/escrituras asíncronas no bloqueantes.
3. **¿Por qué Web Workers?**
   El cálculo del producto cartesiano de múltiples asignaturas con decenas de grupos puede involucrar miles de combinaciones de horarios. Ejecutar este algoritmo en el hilo principal congelaba el DOM y causaba retrasos perceptibles en la UI; el Web Worker corre esta tarea en segundo plano de manera imperceptible para el usuario.
4. **¿Por qué Cloudflare R2?**
   Centraliza la distribución de la oferta académica eliminando la necesidad de incluir archivos JSON gigantescos en el repositorio Git del cliente. Además, R2 no aplica cargos por ancho de banda saliente (egress), haciéndolo ideal para alojamiento estático.
