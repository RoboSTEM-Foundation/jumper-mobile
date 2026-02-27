import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_WALKTHROUGH_STEPS = {
    PICK_PRESET: 'pickPreset',
    SELECT_TEAM: 'selectTeam',
    OPEN_MATCH: 'openMatch',
    ENTER_FULLSCREEN: 'enterFullscreen',
    EXIT_FULLSCREEN: 'exitFullscreen',
};

const STORAGE_KEY = 'jumper.onboarding.walkthrough.v1';

const DEFAULT_STATE = {
    completed: false,
    skipped: false,
    step: ONBOARDING_WALKTHROUGH_STEPS.PICK_PRESET,
};
const LEGACY_STEP_MAP = {
    openTeamList: ONBOARDING_WALKTHROUGH_STEPS.SELECT_TEAM,
    findTeam: ONBOARDING_WALKTHROUGH_STEPS.SELECT_TEAM,
};
const VALID_STEPS = new Set(Object.values(ONBOARDING_WALKTHROUGH_STEPS));

export async function loadOnboardingWalkthroughState() {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_STATE };
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_STATE };
        if (parsed.completed) {
            return { ...DEFAULT_STATE, completed: true, skipped: !!parsed.skipped, step: null };
        }
        const mapped = LEGACY_STEP_MAP[parsed.step] || parsed.step;
        const nextStep = VALID_STEPS.has(mapped)
            ? mapped
            : ONBOARDING_WALKTHROUGH_STEPS.PICK_PRESET;
        return {
            completed: false,
            skipped: false,
            step: nextStep,
        };
    } catch {
        return { ...DEFAULT_STATE };
    }
}

export async function setOnboardingWalkthroughStep(step) {
    if (!step || typeof step !== 'string') return;
    try {
        await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                completed: false,
                skipped: false,
                step,
            })
        );
    } catch {
        // Best-effort persistence only.
    }
}

export async function completeOnboardingWalkthrough({ skipped = false } = {}) {
    try {
        await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                completed: true,
                skipped: !!skipped,
                step: null,
            })
        );
    } catch {
        // Best-effort persistence only.
    }
}

export async function resetOnboardingWalkthrough() {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
        // Best-effort persistence only.
    }
}
