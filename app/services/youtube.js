import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || 'YOUR_PLACEHOLDER_KEY';

/**
 * Fetch the real-world epoch (ms) when a YouTube video / live stream started.
 * For live streams: uses `liveStreamingDetails.actualStartTime`
 * For VODs:         uses `snippet.publishedAt`
 */
export async function fetchStreamStartTime(videoId) {
    if (!videoId) return null;
    try {
        const res = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
                id: videoId,
                part: 'liveStreamingDetails,snippet',
                key: API_KEY,
            },
        });
        const item = res.data.items?.[0];
        if (!item) return null;

        const startTime =
            item.liveStreamingDetails?.actualStartTime ||
            item.liveStreamingDetails?.scheduledStartTime ||
            item.snippet?.publishedAt;

        return startTime ? new Date(startTime).getTime() : null;
    } catch (err) {
        console.warn('[YouTube API] fetchStreamStartTime failed:', err.message);
        return null;
    }
}

/**
 * Extract a YouTube video ID from any common YouTube URL format.
 */
export function extractVideoId(url) {
    if (!url) return null;
    const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watch) return watch[1];
    const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (short) return short[1];
    const live = url.match(/\/live\/([a-zA-Z0-9_-]{11})/);
    if (live) return live[1];
    return null;
}
