/** Transporte local de arquivo 3D entre páginas; nunca guarda chaves de API. */
const DB = "expressarte-model-handoff-v1";
const STORE = "models";
const KEY = "incoming-glb";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
      return reject(new Error("O navegador não suporta armazenamento temporário de modelos."));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Não foi possível abrir o armazenamento local."));
  });
}

export async function sendGlbToStudio(binary: Blob): Promise<void> {
  if (binary.size < 20 || binary.size > 35 * 1024 * 1024)
    throw new Error("Arquivo GLB inválido ou acima de 35 MB.");
  const db = await openDb();
  try {
    await new Promise<void>((resolve,reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(binary, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Não foi possível guardar o GLB."));
      tx.onabort = () => reject(tx.error || new Error("Gravação do GLB interrompida."));
    });
  } finally {db.close();}
}

export async function takeGlbForStudio(): Promise<Blob | null> {
  const db = await openDb();
  try {
    return await new Promise<Blob | null>((resolve,reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const request = tx.objectStore(STORE).get(KEY);
      tx.objectStore(STORE).delete(KEY);
      let value: unknown = null;
      request.onsuccess = () => {value = request.result;};
      tx.oncomplete = () => resolve(value instanceof Blob ? value : null);
      tx.onerror = () => reject(tx.error || new Error("Leitura local falhou."));
    });
  } finally {db.close();}
}
