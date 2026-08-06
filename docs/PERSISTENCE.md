# Sistema de Persistencia (IndexedDB y LocalStorage)

A partir de la versión 2.0.0, el proyecto migró de `localStorage` síncrono a **IndexedDB** asíncrono para superar el límite estricto de 5MB y permitir el almacenamiento de múltiples ofertas académicas pesadas.

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

## Normalización de Datos al Cargar
Durante `initializeState()`, cada subject persistido se normaliza mediante `normalizeSubject` para mantener consistencia entre:

- coordenadas visuales (`row`, `col`, `blocks`, `jornada`),
- campos canónicos de cálculo (`day`, `startMinutes`, `endMinutes`).

Esto permite reparar automáticamente registros legacy o inconsistentes sin intervención manual del usuario.

## Notas de Agosto 2026

- Se reforzó la normalización para recalcular tiempos cuando no coinciden con la grilla real.
- Esta reparación evita errores en cálculo de huecos y en exportaciones que dependen de horas canónicas.