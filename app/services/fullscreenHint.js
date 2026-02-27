import AsyncStorage from '@react-native-async-storage/async-storage';

const ROTATE_FS_HINT_COUNT_KEY = 'jumper.rotate_fs_hint.count.v1';
let quotaOpQueue = Promise.resolve();

function withQuotaLock(task) {
    const run = quotaOpQueue.then(task, task);
    quotaOpQueue = run.catch(() => undefined);
    return run;
}

async function readRotateFsHintCount() {
    try {
        const stored = await AsyncStorage.getItem(ROTATE_FS_HINT_COUNT_KEY);
        const parsed = stored ? Number.parseInt(stored, 10) : 0;
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
        return 0;
    }
}

async function writeRotateFsHintCount(nextCount) {
    const safeCount = Number.isFinite(nextCount) && nextCount > 0 ? Math.floor(nextCount) : 0;
    try {
        await AsyncStorage.setItem(ROTATE_FS_HINT_COUNT_KEY, String(safeCount));
    } catch {
        // Best-effort persistence only.
    }
}

export async function consumeRotateFullscreenHintQuota() {
    return withQuotaLock(async () => {
        const current = await readRotateFsHintCount();
        if (current >= 3) return false;
        await writeRotateFsHintCount(current + 1);
        return true;
    });
}

export async function resetRotateFullscreenHintQuota() {
    return withQuotaLock(async () => {
        await writeRotateFsHintCount(0);
    });
}

export async function getRotateFullscreenHintCount() {
    return withQuotaLock(async () => readRotateFsHintCount());
}
