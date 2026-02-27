/**
 * 画像プリローダー
 * ゲーム開始時にキャラ画像をブラウザキャッシュに載せる
 */

const EXPRESSIONS = ['default', 'painful', 'happy', 'fainted'] as const;
const MOUTH_STATES = ['0', '1'] as const;
const MASTER_EXPRESSIONS = ['default'] as const;
const MAX_CACHE_SIZE = 512;
const decodedImageUrlSet = new Set<string>();
const inflightDecodeMap = new Map<string, Promise<void>>();

export interface PreloadResult {
  total: number;
  success: number;
  failed: string[];
}

interface PreloadOptions {
  onProgress?: (done: number, total: number, url: string) => void;
}

const buildCharacterImageUrls = (characterIds: string[]): string[] => {
  const urls: string[] = [];

  for (const characterId of characterIds) {
    for (const expression of EXPRESSIONS) {
      for (const mouth of MOUTH_STATES) {
        // faintedは口閉じのみ
        if (expression === 'fainted' && mouth === '1') continue;
        urls.push(`/agents/${characterId}_${expression}_${mouth}.jpg`);
      }
    }
  }

  for (const expression of MASTER_EXPRESSIONS) {
    for (const mouth of MOUTH_STATES) {
      urls.push(`/agents/master_${expression}_${mouth}.jpg`);
    }
  }

  return Array.from(new Set(urls));
};

const loadImageWithDecode = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(resolve).catch(() => {
          // decode失敗でもonload済みなら描画可能なので成功扱いにする
          resolve();
        });
        return;
      }

      resolve();
    };

    img.onerror = () => {
      reject(new Error(`Image preload failed: ${url}`));
    };

    img.src = url;
  });
};

export const isImageDecoded = (url: string): boolean => {
  return decodedImageUrlSet.has(url);
};

export const ensureImageDecoded = (url: string): Promise<void> => {
  if (decodedImageUrlSet.has(url)) {
    return Promise.resolve();
  }

  const inflight = inflightDecodeMap.get(url);
  if (inflight) {
    return inflight;
  }

  const promise = loadImageWithDecode(url)
    .then(() => {
      if (decodedImageUrlSet.size >= MAX_CACHE_SIZE) {
        const oldest = decodedImageUrlSet.values().next().value;
        if (oldest) decodedImageUrlSet.delete(oldest);
      }
      decodedImageUrlSet.add(url);
    })
    .finally(() => {
      inflightDecodeMap.delete(url);
    });

  inflightDecodeMap.set(url, promise);
  return promise;
};

/**
 * 指定キャラ+司会の必要画像を読み込み+decode完了まで待つ
 */
export async function preloadCharacterImagesWithDecode(
  characterIds: string[],
  options: PreloadOptions = {},
): Promise<PreloadResult> {
  if (typeof window === 'undefined') {
    return { total: 0, success: 0, failed: [] };
  }

  const urls = buildCharacterImageUrls(characterIds);
  const total = urls.length;
  let done = 0;
  let success = 0;
  const failed: string[] = [];

  await Promise.all(
    urls.map(async (url) => {
      try {
        await ensureImageDecoded(url);
        success += 1;
      } catch {
        failed.push(url);
      } finally {
        done += 1;
        options.onProgress?.(done, total, url);
      }
    }),
  );

  return {
    total,
    success,
    failed,
  };
}

/**
 * 指定キャラの全表情画像をプリロード
 * @param characterIds 選ばれた5キャラのID配列
 */
export function preloadCharacterImages(characterIds: string[]): void {
  if (typeof window === 'undefined') return;
  void preloadCharacterImagesWithDecode(characterIds);
}
