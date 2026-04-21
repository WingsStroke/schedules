"use strict";

const StorageDB = {
  dbName: "UdeCHorariosDB",
  version: 1,
  db: null,

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Creamos el "almacén" genérico donde guardaremos cualquier JSON grande
        if (!db.objectStoreNames.contains("store")) {
          db.createObjectStore("store");
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        await this.migrateFromLocalStorage();
        resolve(true);
      };

      request.onerror = (event) => {
        console.error("Error al inicializar IndexedDB:", event.target.error);
        reject(event.target.error);
      };
    });
  },

  async migrateFromLocalStorage() {
    // Revisamos si ya hicimos la migración en el pasado
    const isMigrated = localStorage.getItem("idb_migrated_v1");
    
    if (!isMigrated) {
      console.info("Iniciando migración automática a IndexedDB...");
      try {
        const oldSchedulesStr = localStorage.getItem("schedules");
        
        if (oldSchedulesStr) {
          const oldSchedulesObj = JSON.parse(oldSchedulesStr);
          await this.setItem("schedules", oldSchedulesObj);
          console.info("Horarios migrados exitosamente a la nueva base de datos.");
        }
        
        // Marcamos como migrado, pero NO borramos el localStorage 
        // como medida de seguridad por si algo falla en el futuro.
        localStorage.setItem("idb_migrated_v1", "true");
      } catch (error) {
        console.error("Error durante la migración de datos:", error);
      }
    }
  },

  setItem(key, value) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Base de datos no conectada");
      
      const tx = this.db.transaction("store", "readwrite");
      const store = tx.objectStore("store");
      const req = store.put(value, key); // Guarda o actualiza
      
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  getItem(key) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Base de datos no conectada");
      
      const tx = this.db.transaction("store", "readonly");
      const store = tx.objectStore("store");
      const req = store.get(key);
      
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => reject(req.error);
    });
  }
};