# 📅 Sistema de Horarios Académicos - UdeC

> Aplicación web responsiva de alto rendimiento construida en Vanilla JS (ES Modules) para crear, gestionar y optimizar horarios universitarios, con generación automática de combinaciones de asignaturas libres de choques.

---

## 🎯 **Descripción**

Sistema completo de gestión y optimización de horarios académicos diseñado para la Universidad de Concepción (UdeC) y extensible a otros currículos. Permite:

- ✅ **Crear y gestionar múltiples horarios** en paralelo.
- ✅ **Importación dinámica de ofertas académicas** desde **Cloudflare R2** con soporte para múltiples períodos académicos.
- ✅ **Generación automática de combinaciones** de horarios libres de choques en segundo plano (**Web Workers**).
- ✅ **Filtrado inteligente** en tiempo real por grupos, carreras y profesores.
- ✅ **Calculadora mensual de costos** de transporte y alimentación (detectando huecos entre clases y festivos nacionales).
- ✅ **Visualización interactiva de mini-horarios** para previsualizar combinaciones rápidamente.
- ✅ **Modo nocturno completo** con diseño *glassmorphic*.
- ✅ **Exportación multiplataforma** de horarios como Imagen (PNG) y PDF (formato oficial de matrícula).
- ✅ **Optimización de rendering** mediante sistema de Virtual DOM ligero.

---

## 🏗️ **Arquitectura del Proyecto**

El proyecto está estructurado de forma modular utilizando módulos nativos de ES6 y un flujo de empaquetado moderno con **Vite**.

```
horarios-udec/
├── index.html                          # Estructura HTML y modales principales
├── package.json                        # Scripts y dependencias (Vite, Vitest, JSDOM)
├── vite.config.js                      # Configuración de compilación y empaquetado
├── vitest.config.js                    # Configuración del entorno de pruebas unitarias
│
├── css/                                # Capa de Estilos (Vanilla CSS)
│   ├── styles.css                      # Estilos base y grilla del horario
│   ├── dark-mode.css                   # Temática oscura con efectos glass
│   ├── sidebar-panel.css               # Panel de asignaturas seleccionadas
│   ├── filtros-asignaturas.css         # Modal flotante de filtros avanzados
│   ├── minihorarios-styles.css         # Tarjetas de previsualización
│   └── responsive.css                  # Breakpoints para Tablet y Móvil
│
├── js/                                 # Capa de Lógica (ES Modules)
│   ├── main.js                         # ⭐ Orquestador y punto de entrada
│   ├── core.js                         # Constantes (R2), utilidades y Handler de errores
│   ├── storage-db.js                   # Motor IndexedDB asíncrono para almacenamiento local
│   ├── state-manager.js                # Única fuente de verdad para el estado de horarios
│   ├── dom-renderer.js                 # Motor de renderizado optimizado de la grilla
│   ├── sistema-carga-ofertas.js        # Cargador dinámico de ofertas desde Cloudflare R2
│   ├── integracion-busqueda.js         # Motor de búsqueda insensible a acentos/mayúsculas
│   ├── sidebar-panel.js                # Control del sidebar y selector de períodos
│   ├── minihorarios-ui.js              # UI de tarjetas de minihorarios
│   ├── motor-combinaciones.js          # Algoritmo generador de producto cartesiano
│   ├── motor.worker.js                 # Web Worker para cómputo en segundo plano
│   ├── cargador-combinaciones.js       # Conversión de combinaciones abstractas a materias
│   ├── calculadora-aguinaldo.js        # Lógica de costos y base de datos de festivos
│   ├── export-engine.js                # Motor de conversión a imagen/PDF de matrícula
│   ├── toast-system.js                 # Sistema liviano de toasts en pantalla
│   ├── dark-mode.js                    # Control y persistencia del tema visual
│   ├── version.js                      # Definición de la versión actual
│   └── MODULES.md                      # Índice descriptivo de cada archivo JS
│
├── public/                             # Assets Estáticos Servidos Directamente
│   ├── sw.js                           # Service Worker para caché fuera de línea (PWA)
│   ├── manifest.json                   # Configuración del Manifiesto PWA
│   ├── changelog.json                  # Historial de cambios y versiones
│   └── assets/                         # Ilustraciones e íconos de la app
│
├── tests/                              # Suite de Pruebas Unitarias
│   ├── motor-combinaciones.test.js     # Pruebas del algoritmo y choques
│   └── calculadora-aguinaldo.test.js   # Pruebas de la calculadora financiera
│
├── docs/                               # 📚 Documentación Técnica Detallada
│   ├── MODAL_SYSTEM.md                 # Arquitectura y diseño del sistema de modales
│   ├── PERSISTENCE.md                  # Detalles del paso de LocalStorage a IndexedDB
│   └── QUICK_DEV_GUIDE.md              # Guía de desarrollo rápido paso a paso
│
└── ARCHITECTURE.md                     # Arquitectura técnica global del sistema
```

---

## 🚀 **Inicio Rápido (Desarrollo)**

### **Requisitos**
- **Node.js** (versión 18 o superior recomendada)
- Un navegador web moderno compatible con ES Modules e IndexedDB

### **Instalación**

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/WingsStroke/schedules.git
   cd schedules
   ```

2. Instalar las dependencias de desarrollo (Vite, Vitest, JSDOM):
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
   *Abre `http://localhost:5173` en tu navegador para interactuar con la aplicación.*

### **Pruebas de Calidad**
Para correr la suite de pruebas automatizadas:
```bash
npm test
```

### **Compilación para Producción**
Para compilar y minificar los assets listos para desplegar:
```bash
npm run build
```
*Los archivos optimizados se generarán en la carpeta `./dist`.*

---

## 💾 **Tecnologías Clave**

- **Compilador/Build:** [Vite](https://vite.dev/) (empaquetado eficiente y recarga en caliente HMR).
- **Entorno de Pruebas:** [Vitest](https://vitest.dev/) con JSDOM para pruebas unitarias rápidas.
- **Persistencia:** [IndexedDB API](https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API) mediante la abstracción asíncrona `StorageDB` (soporte multihorario y cargas masivas sin límite de 5MB).
- **Paralelismo:** [Web Workers](https://developer.mozilla.org/es/docs/Web/API/Web_Workers_API) para descargar el algoritmo de combinaciones del hilo de la UI.
- **Alojamiento de Ofertas:** [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) como CDN de ofertas académicas en formato JSON.
- **Instalabilidad:** Capacidades PWA con Service Worker para funcionamiento offline completo de la aplicación core.

---

## ☁️ **Origen de Ofertas Académicas (Cloudflare R2)**

Para evitar saturar el repositorio y permitir actualizaciones dinámicas en tiempo real sin desplegar el código del frontend, la aplicación descarga las ofertas académicas desde un bucket de Cloudflare R2:

1. **`index.json`**: Ubicado en la raíz del bucket, contiene un array con los períodos académicos disponibles:
   ```json
   ["2026-1", "2025-2", "2025-1"]
   ```
2. **Ofertas por programa**: Ubicados en carpetas con el nombre del período (ej. `2026-1/sistemas.xlsx.json`), contienen el listado de materias, grupos y horarios del respectivo programa académico.

La URL base del bucket está definida en `APP_CONFIG.R2_BUCKET_URL` dentro de [`js/core.js`](file:///c:/Users/redbo/Downloads/Angel/proyectos/proyecto%20horarios%20udec/schedules/js/core.js).

---

## 🔍 **Flujo de Datos Principal**

El siguiente diagrama detalla cómo interactúan los diferentes módulos para generar combinaciones e integrarlas al horario del usuario:

```
┌─────────────────────────────────────────────────────────────┐
│                     USUARIO                                 │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. CARGA DE OFERTA ACADÉMICA                               │
│     Carga index.json y descarga el programa desde CF R2.    │
│     └─ sistema-carga-ofertas.js                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. BÚSQUEDA DE MATERIAS                                    │
│     Buscador insensible a tildes con resultados rápidos.    │
│     └─ integracion-busqueda.js                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. SELECCIÓN DE MATERIAS Y FILTROS                         │
│     Añade materias al panel y permite apagar grupos/profes. │
│     └─ sidebar-panel.js                                     │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. GENERACIÓN DE COMBINACIONES (WEB WORKER)                │
│     Calcula el producto cartesiano libre de choques.         │
│     └─ motor-combinaciones.js ──> motor.worker.js            │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. TRADUCCIÓN A FORMATO DE RENDERING                       │
│     Mapea grupos combinados a coordenadas (día, bloque).     │
│     └─ cargador-combinaciones.js                            │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  6. PREVISUALIZACIÓN DE MINIHORARIOS                         │
│     Renderiza mini-tarjetas en la sección de combinaciones. │
│     └─ minihorarios-ui.js                                   │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  7. ACTIVACIÓN Y PERSISTENCIA                               │
│     Guarda el nuevo horario en memoria e IndexedDB.         │
│     └─ state-manager.js ──> storage-db.js ──> dom-renderer.js│
└─────────────────────────────────────────────────────────────┘
```

---

## 📖 **Documentación Adicional**

Para profundizar en la implementación de componentes específicos:

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Arquitectura detallada del sistema, diagramas de clases, patrones de diseño y flujo de datos.
- **[js/MODULES.md](js/MODULES.md)**: Explicación y responsabilidades detalladas de cada módulo JS.
- **[css/README.md](css/README.md)**: Convenciones del sistema de estilos, media queries y variables de modo oscuro.
- **[docs/MODAL_SYSTEM.md](docs/MODAL_SYSTEM.md)**: Catálogo y patrones de comportamiento de todos los modales de la interfaz.
- **[docs/PERSISTENCE.md](docs/PERSISTENCE.md)**: Descripción del paso hacia IndexedDB y retrocompatibilidad.
- **[docs/QUICK_DEV_GUIDE.md](docs/QUICK_DEV_GUIDE.md)**: Guía práctica para añadir nuevos campos a asignaturas, crear modales o depurar problemas.

---

## 👥 **Despliegue Continuo (CI/CD)**

Cualquier cambio empujado a la rama `main` activa el flujo de trabajo de GitHub Actions configurado en `.github/workflows/deploy.yml`, el cual compila los archivos estáticos mediante Vite y los despliega automáticamente en la rama `gh-pages` para actualizar la versión pública del generador de horarios.

---

**Última actualización:** Mayo 2026
