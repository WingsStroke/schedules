# 📅 Sistema de Horarios Académicos - UdeC

> Aplicación web para crear, gestionar y optimizar horarios universitarios con generación automática de combinaciones libres de choques.

## 🎯 **Descripción**

Sistema completo de gestión de horarios académicos diseñado específicamente para la Universidad de Concepción (UdeC). Permite:

- ✅ Crear y gestionar múltiples horarios personalizados
- ✅ Importar ofertas académicas desde JSON
- ✅ Generar combinaciones automáticas sin choques de horario
- ✅ Filtrar por grupos, programas y profesores
- ✅ Calcular costos mensuales de transporte y alimentación
- ✅ Visualizar mini-horarios de combinaciones
- ✅ Modo nocturno con glass morphism
- ✅ Exportar/Importar horarios en JSON
- ✅ Búsqueda inteligente de asignaturas

---

## 🏗️ **Arquitectura del Proyecto**

```
horarios-udec/
├── index.html                          # Estructura HTML principal
│
├── css/                                # Estilos (4,229 líneas)
│   ├── styles.css                      # Estilos base y layout
│   ├── dark-mode.css                   # Modo nocturno + glass morphism
│   ├── sidebar-panel.css               # Panel lateral de asignaturas
│   ├── filtros-asignaturas.css         # Estilos de filtros
│   ├── minihorarios-styles.css         # Vista miniatura de horarios
│   └── glass-design-system.css         # Sistema de diseño glass
│
├── js/                                 # Lógica (5,819 líneas)
│   ├── app.js                          # ⭐ Núcleo principal (2,942 líneas)
│   ├── sidebar-panel.js                # Panel lateral y gestión asignaturas
│   ├── motor-combinaciones.js          # Generador de combinaciones
│   ├── cargador-combinaciones.js       # Conversión combinaciones → horarios
│   ├── sistema-carga-ofertas.js        # Parser JSON ofertas académicas
│   ├── integracion-busqueda.js         # Sistema de búsqueda
│   ├── minihorarios-ui.js              # Visualización minihorarios
│   └── dark-mode.js                    # Control modo nocturno
│
└── docs/                               # 📚 Documentación (este directorio)
    ├── ARCHITECTURE.md                 # Arquitectura técnica completa
    └── MODULES.md                      # Descripción detallada de módulos
```

**Total:** 10,557 líneas de código

---

## 🚀 **Inicio Rápido**

### **Requisitos**
- Navegador moderno (Chrome, Firefox, Edge, Safari)
- JavaScript habilitado
- LocalStorage disponible (~5MB recomendado)

### **Instalación**
```bash
# Clonar o descargar el proyecto
git clone <repository-url>

# Abrir en navegador
# No requiere instalación de dependencias ni servidor
# Simplemente abre index.html en tu navegador
```

### **Uso Básico**

1. **Crear horario:**
   - Haz clic en "Crear nuevo horario"
   - Asigna un nombre

2. **Agregar asignaturas manualmente:**
   - Haz clic en una celda vacía
   - Completa el formulario
   - Guarda

3. **O importar oferta académica:**
   - Sidebar → Buscar asignaturas
   - Cargar JSON de oferta académica
   - Seleccionar asignaturas
   - Generar combinaciones

---

## 💾 **Tecnologías**

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Almacenamiento:** LocalStorage API
- **Estándares:** Vanilla JS (sin frameworks)
- **Diseño:** CSS Grid, Flexbox, Glass Morphism
- **Compatibilidad:** Navegadores modernos (2020+)

---

## 🎨 **Características Principales**

### **1. Gestión de Horarios**
- Múltiples horarios en un solo sistema
- Jornada diurna (8:00-20:00) y nocturna (18:00-23:00)
- Bloques de 90 minutos configurables
- Código de colores personalizable por asignatura

### **2. Generador de Combinaciones**
- Motor inteligente que evita choques de horario
- Filtros por grupo, programa, profesor
- Hasta 10 combinaciones simultáneas
- Sistema de descarte y favoritos

### **3. Calculadora de Costos Mensuales**
- Calcula transporte según días con clases
- Considera meriendas diarias
- Detecta huecos entre bloques
- Exclusión de días específicos

### **4. Búsqueda de Asignaturas**
- Búsqueda por código o nombre
- Integración con oferta académica UdeC
- Filtros en tiempo real

### **5. Modo Nocturno**
- Toggle instantáneo día/noche
- Glass morphism design
- Persistencia de preferencia
- Optimizado para bajo brillo

### **6. Importación/Exportación**
- JSON de oferta académica UdeC
- Exportar horarios propios
- Compartir configuraciones

---

## 📊 **Estructura de Datos**

### **LocalStorage Keys**
```javascript
{
  "schedules": [...],           // Array de horarios
  "currentScheduleIndex": 0,    // Índice del horario activo
  "lastVersion": "2.8.0",       // Última versión vista
  "darkMode": true,             // Estado modo nocturno
  "ofertaAcademica": {...}      // Oferta académica cargada
}
```

### **Formato de Asignatura**
```javascript
{
  id: "uuid",
  name: "Programación I",
  color: "#1d4ed8",
  row: 0,                       // Fila (bloque de tiempo)
  col: 1,                       // Columna (día de semana)
  blocks: 2,                    // Cantidad de bloques (90min c/u)
  group: "A",
  program: "Ing. Civil Informática",
  aula: "Sala A-301",
  credits: 5,
  jornada: "diurna",
  startMinutes: 480,            // 8:00 AM
  endMinutes: 660,              // 11:00 AM
  showCredits: true,
  showGroup: true,
  showProgram: true,
  showAula: true
}
```

---

## 🧩 **Módulos Principales**

### **app.js** (2,942 líneas)
- Gestión de schedules (crear, editar, eliminar)
- Renderizado de tabla de horarios
- Sistema de modales
- Manejo de errores global
- Calculadora mensual
- Changelog

### **motor-combinaciones.js** (394 líneas)
- Algoritmo de generación de combinaciones
- Detección de choques
- Sistema de filtros
- Gestión de asignaturas seleccionadas

### **sidebar-panel.js** (836 líneas)
- UI del panel lateral
- Gestión de filtros
- Control de asignaturas
- Integración con motor de combinaciones

### **cargador-combinaciones.js** (507 líneas)
- Conversión de combinaciones a formato de horario
- Mapeo de bloques temporales
- Generación de subjects para renderizado

### **sistema-carga-ofertas.js** (212 líneas)
- Parser de JSON de oferta académica UdeC
- Validación de formato
- Normalización de datos

---

## 🔍 **Flujo de Datos Principal**

```
┌─────────────────────────────────────────────────────────────┐
│                     USUARIO                                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. IMPORTAR OFERTA ACADÉMICA (JSON)                        │
│     sistema-carga-ofertas.js → Parsea y normaliza           │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. BUSCAR ASIGNATURAS                                       │
│     integracion-busqueda.js → Sidebar con resultados        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. SELECCIONAR ASIGNATURAS + APLICAR FILTROS               │
│     sidebar-panel.js → Gestiona selección                   │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. GENERAR COMBINACIONES                                    │
│     motor-combinaciones.js → Genera sin choques             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. CONVERTIR A HORARIOS                                     │
│     cargador-combinaciones.js → Mapea a formato subject     │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  6. VISUALIZAR MINIHORARIOS                                  │
│     minihorarios-ui.js → Muestra vista previa               │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  7. SELECCIONAR COMBINACIÓN → CREAR HORARIO                 │
│     app.js → Guarda en schedules[] → localStorage           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ **Mantenimiento**

### **Agregar Nueva Funcionalidad**
1. Leer `docs/ARCHITECTURE.md` para entender el sistema
2. Identificar módulo(s) afectado(s) en `docs/MODULES.md`
3. Implementar siguiendo patrones existentes
4. Actualizar documentación relevante

### **Debugging**
- `ErrorHandler.errorLog` contiene últimos 50 errores
- Console logs habilitados por defecto
- Inspeccionar `localStorage` para estado

### **Estilos**
- Modo diurno: `css/styles.css` + específicos
- Modo nocturno: `css/dark-mode.css` (sobrescribe)
- Glass morphism: `css/glass-design-system.css`

---

## 📖 **Documentación Adicional**

Para información técnica detallada, consulta:

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Arquitectura técnica completa
- **[MODULES.md](docs/MODULES.md)** - Descripción detallada de cada módulo JS
- **[CSS_GUIDE.md](css/README.md)** - Guía de estilos y convenciones

---

## 🐛 **Problemas Conocidos**

- LocalStorage limitado a ~5MB (depende del navegador)
- No soporta modo offline completo (requiere carga inicial)
- Optimizado para pantallas ≥1024px

---

## 📝 **Changelog**

Ver historial completo en el botón "Changelog" dentro de la aplicación.

**Versión actual:** 2.8.0

---

## 👥 **Contribuciones**

Para contribuir al proyecto:
1. Lee toda la documentación en `/docs`
2. Sigue convenciones de código existentes
3. Actualiza documentación con cambios
4. Prueba en múltiples navegadores

---

## 📄 **Licencia**

[Especificar licencia del proyecto]

---

## 🔗 **Enlaces Útiles**

- Universidad de Concepción: [udec.cl](https://www.udec.cl)
- Oferta Académica: [portal.udec.cl](https://portal.udec.cl)

---

**Última actualización:** Marzo 2026  
**Mantenedor:** [Tu nombre/equipo]
