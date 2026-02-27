// ============================================
// タイマー集中管理
// すべてのsetTimeoutをここ経由で登録し、一括キャンセル可能に
// ============================================

interface TimerEntry {
  id: string;
  timeoutId: ReturnType<typeof setTimeout>;
  description: string;
  createdAt: number;
}

export interface TimerRegistry {
  /** 登録されているタイマー */
  timers: Map<string, TimerEntry>;

  /** タイマーを登録し、IDを返す */
  register: (callback: () => void, delay: number, description: string) => string;

  /** 特定のタイマーをキャンセル */
  cancel: (timerId: string) => void;

  /** すべてのタイマーをキャンセル */
  cancelAll: () => void;

  /** 説明のパターンにマッチするタイマーをキャンセル */
  cancelByPattern: (pattern: RegExp) => void;

  /** 登録されているタイマー数を取得 */
  size: () => number;

  /** デバッグ用: 登録されているタイマー一覧を取得 */
  getAll: () => Array<{ id: string; description: string; createdAt: number }>;
}

/**
 * タイマーレジストリを作成
 * シングルトンとして使用することを想定
 */
export const createTimerRegistry = (): TimerRegistry => {
  const timers = new Map<string, TimerEntry>();

  const generateId = (): string => {
    return `timer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  };

  return {
    timers,

    register: (callback: () => void, delay: number, description: string): string => {
      const id = generateId();

      const timeoutId = setTimeout(() => {
        callback();
        timers.delete(id);
      }, delay);

      timers.set(id, {
        id,
        timeoutId,
        description,
        createdAt: Date.now(),
      });

      return id;
    },

    cancel: (timerId: string): void => {
      const entry = timers.get(timerId);
      if (entry) {
        clearTimeout(entry.timeoutId);
        timers.delete(timerId);
      }
    },

    cancelAll: (): void => {
      const count = timers.size;
      timers.forEach((entry) => {
        clearTimeout(entry.timeoutId);
      });
      timers.clear();
    },

    cancelByPattern: (pattern: RegExp): void => {
      const toCancel: string[] = [];
      timers.forEach((entry, id) => {
        if (pattern.test(entry.description)) {
          toCancel.push(id);
        }
      });

      toCancel.forEach((id) => {
        const entry = timers.get(id);
        if (entry) {
          clearTimeout(entry.timeoutId);
          timers.delete(id);
        }
      });
    },

    size: (): number => {
      return timers.size;
    },

    getAll: (): Array<{ id: string; description: string; createdAt: number }> => {
      return Array.from(timers.values()).map((entry) => ({
        id: entry.id,
        description: entry.description,
        createdAt: entry.createdAt,
      }));
    },
  };
};

// シングルトンインスタンス
export const timerRegistry = createTimerRegistry();
