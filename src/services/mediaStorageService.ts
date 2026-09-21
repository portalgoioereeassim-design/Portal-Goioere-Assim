// IndexedDB store for persistent local images
const STORE_NAME = 'media_files';
const DB_NAME = 'PortalMediaStore';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const getIndexedDB = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported'));
      }
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
};

// Store image in local storage
export const saveMediaToIndexedDB = async (id: string, dataUrlOrBlob: string | Blob): Promise<void> => {
  try {
    const db = await getIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        id,
        data: dataUrlOrBlob,
        timestamp: Date.now(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to save to local storage:', e);
  }
};

// Compress and optimize image to JPEG using Canvas
export const compressImage = (
  file: File, 
  maxWidth = 1400, 
  maxHeight = 1400, 
  quality = 0.82
): Promise<{ blob: Blob; dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = reject;

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas 2D context unavailable'));
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, quality);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, dataUrl });
          } else {
            resolve({ blob: file, dataUrl });
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export interface ProcessedImageResult {
  url: string;
  provider: 'local';
  message?: string;
  originalSize: number;
  finalSize?: number;
}

export const mediaStorageService = {
  /**
   * Main upload pipeline:
   * 1. Compresses/optimizes the image to web size.
   * 2. Stores locally in persistent browser storage.
   */
  async processAndUploadImage(
    file: File, 
    _folder: string = 'materias'
  ): Promise<ProcessedImageResult> {
    const originalSize = file.size;

    // 1. Optimize image
    let optimizedBlob: Blob = file;
    let dataUrl = '';
    try {
      const compressed = await compressImage(file);
      optimizedBlob = compressed.blob;
      dataUrl = compressed.dataUrl;
    } catch (err) {
      console.warn('Image compression fallback to raw file:', err);
    }

    // 2. Store in local storage
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await saveMediaToIndexedDB(mediaId, optimizedBlob);

    const finalUrl = dataUrl || (await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(optimizedBlob);
    }));

    return {
      url: finalUrl,
      provider: 'local',
      originalSize,
      finalSize: optimizedBlob.size,
      message: 'Imagem otimizada e salva com sucesso no portal.',
    };
  },

  async uploadMedia(file: File, folder: string = 'materias'): Promise<string> {
    const result = await this.processAndUploadImage(file, folder);
    return result.url;
  },
};
