import axios from 'axios';

const DEFAULT_API_KEY = import.meta.env.VITE_DEFAULT_YOUTUBE_API_KEY;

export const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|live\/|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export const getStreamStartTime = async (videoId) => {
    const userKey = localStorage.getItem('youtube_api_key');
    const apiKey = userKey || DEFAULT_API_KEY;

    if (!apiKey) return null;

    try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
                part: 'liveStreamingDetails',
                id: videoId,
                key: apiKey,
            },
        });

        const items = response.data.items;
        if (items.length > 0 && items[0].liveStreamingDetails && items[0].liveStreamingDetails.actualStartTime) {
            return items[0].liveStreamingDetails.actualStartTime;
        }
    } catch (error) {
        console.error("Error fetching YouTube stream details:", error);
    }
    return null;
};
