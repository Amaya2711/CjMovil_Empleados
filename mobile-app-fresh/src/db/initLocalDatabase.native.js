import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'cj_movil.db';
const SCHEMA_VERSION = 1;
let initPromise = null;

const openDatabase = async () => {
  return SQLite.openDatabaseAsync(DATABASE_NAME);
};

export const initLocalDatabase = async () => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = await openDatabase();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS DbVersion (
        Version INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS SyncPendiente (
        IdLocal TEXT PRIMARY KEY NOT NULL,
        Modulo TEXT NOT NULL,
        Operacion TEXT NOT NULL,
        Payload TEXT NOT NULL,
        FechaRegistro TEXT NOT NULL,
        Intentos INTEGER NOT NULL DEFAULT 0,
        Sincronizado INTEGER NOT NULL DEFAULT 0,
        FechaSincronizacion TEXT NULL
      );
    `);

    const versionRow = await db.getFirstAsync('SELECT Version FROM DbVersion LIMIT 1');
    const currentVersion = Number(versionRow?.Version ?? 0);
    if (!currentVersion) {
      await db.runAsync('INSERT INTO DbVersion (Version) VALUES (?)', [SCHEMA_VERSION]);
    }

    return {
      databaseName: DATABASE_NAME,
      version: SCHEMA_VERSION,
    };
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
};
