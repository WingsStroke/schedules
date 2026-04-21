# Sistema de Persistencia (IndexedDB & LocalStorage)

A partir de la versión 2.0.0dev, el proyecto migró de `localStorage` síncrono a **IndexedDB** asíncrono para superar el límite estricto de 5MB y permitir el almacenamiento de múltiples ofertas académicas pesadas.

## Motor Principal: `StorageDB` (IndexedDB)
Ubicado en `js/storage-db.js`.
- **Base de Datos:** `UdeCHorariosDB` (Versión 1)
- **Object Store:** `store` (Almacén genérico de clave-valor).
- **Flujo:** Funciona mediante Promesas (`async/await`) para no bloquear el hilo principal (UI).

## Migración Automática (Retrocompatibilidad)
Cuando un usuario de la v1.0.8 entra a la v2.0.0dev, `StorageDB.init()` busca la clave `schedules` en el `localStorage` antiguo. Si la encuentra:
1. Copia los horarios a IndexedDB.
2. Crea una bandera en localStorage (`idb_migrated_v1 = true`) para no repetir la migración.
3. **No elimina** los datos originales por seguridad (Backup).

## Capa de Seguridad: `SafeStorage`
Ubicado en `js/core.js`. Actúa como fallback y maneja configuraciones menores (como el changelog version) que no requieren IndexedDB.