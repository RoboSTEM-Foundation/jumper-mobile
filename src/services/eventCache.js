// Event cache service for storing webcast selections and history

const CACHE_KEY = 'vex_match_jumper_event_cache';

const getCache = () => {
    try {
        const cache = localStorage.getItem(CACHE_KEY);
        return cache ? JSON.parse(cache) : {};
    } catch (error) {
        console.error('Error reading cache:', error);
        return {};
    }
};

const saveCache = (cache) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.error('Error saving cache:', error);
    }
};

export const getCachedWebcast = (eventId) => {
    const cache = getCache();
    return cache[eventId] || null;
};

export const setCachedWebcast = (eventId, videoId, url, method = 'user-selected') => {
    const cache = getCache();
    const timestamp = new Date().toISOString();

    const entry = {
        videoId,
        url,
        selectedAt: timestamp,
        method,
        history: cache[eventId]?.history || []
    };

    // Add to history
    entry.history.push({
        timestamp,
        action: 'selected',
        videoId,
        url,
        method
    });

    cache[eventId] = entry;
    saveCache(cache);
    return entry;
};

export const getEventHistory = (eventId) => {
    const cache = getCache();
    return cache[eventId] || null;
};

export const addEventHistoryEntry = (eventId, action, metadata) => {
    const cache = getCache();
    const timestamp = new Date().toISOString();

    if (!cache[eventId]) {
        cache[eventId] = {
            history: []
        };
    }

    cache[eventId].history.push({
        timestamp,
        action,
        ...metadata
    });

    saveCache(cache);
};

export const clearEventCache = (eventId) => {
    const cache = getCache();
    delete cache[eventId];
    saveCache(cache);
};

export const exportCache = () => {
    return JSON.stringify(getCache(), null, 2);
};

export const importCache = (jsonString) => {
    try {
        const imported = JSON.parse(jsonString);
        saveCache(imported);
        return true;
    } catch (error) {
        console.error('Error importing cache:', error);
        return false;
    }
};
