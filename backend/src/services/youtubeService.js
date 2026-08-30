import dotenv from 'dotenv';
dotenv.config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const VIDEO_KEYWORDS = [
  'youtube', 'video', 'videos', 'watch', 'tutorial', 'tutorials',
  'lecture', 'lectures', 'playlist', 'clip', 'stream', 'channel',
  'video lecture', 'video tutorial'
];

/**
 * Check if the user is asking for video recommendations or links
 */
export function wantsVideos(query) {
  if (!query) return false;
  const q = String(query).toLowerCase();
  return VIDEO_KEYWORDS.some(k => new RegExp(`\\b${k}\\b`, 'i').test(q));
}

/**
 * Resolves vague follow-up requests like "related video", "video", "youtube"
 * to the actual topic discussed previously in the conversation.
 */
export function resolveContextualQuery(query, history = []) {
  if (!query) return '';
  const q = String(query).trim();
  const qLower = q.toLowerCase();

  let prevSubject = '';
  if (Array.isArray(history) && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg && msg.role === 'user' && msg.content) {
        const text = String(msg.content).trim();
        const cleaned = text
          .replace(/^(who is|what is|how does|explain|tell me about|describe|calculate)\s+/i, '')
          .replace(/\b(youtube|video|videos|tutorial|tutorials)\b/gi, '')
          .trim();
        if (cleaned.length > 1 && !/^(her|his|their|it|this|that|these|those|video|videos|related)$/i.test(cleaned)) {
          prevSubject = cleaned;
          break;
        }
      }
    }
  }

  if (!prevSubject) return q;

  // 1. Check for pronouns (her, his, him, their, its, this, that, etc.)
  const pronounRegex = /\b(her|his|him|their|its|this|that|these|those)\b/i;
  if (pronounRegex.test(q)) {
    return q.replace(pronounRegex, prevSubject).trim();
  }

  // 2. Check for generic video / follow-up phrases
  const genericVideoWords = new Set([
    'video', 'videos', 'related video', 'related videos', 'youtube', 'youtube video',
    'youtube videos', 'video tutorial', 'video tutorials', 'show video', 'show videos',
    'give video', 'give videos', 'videos please', 'video please', 'watch video',
    'watch videos', 'more video', 'more videos', 'links', 'video links', 'tutorials',
    'tutorial', 'videos on this', 'video for this', 'videos for this', 'related', 'link',
    'show me', 'recommend video', 'recommend videos'
  ]);

  if (
    genericVideoWords.has(qLower) ||
    /^(show|give|find|recommend|get|send|provide)?\s*(me\s+)?(some\s+)?(related\s+)?(youtube\s+)?(videos?|tutorials?|links?)(\s+(on|for|about)\s+(this|it|above))?$/i.test(qLower)
  ) {
    return `${prevSubject} video tutorial`;
  }

  return q;
}

/**
 * Search YouTube videos (Official API or robust keyless scraper)
 */
export async function searchYouTube(query, maxResults = 4) {
  if (!query || !query.trim()) return [];

  // 1. Official YouTube API v3
  if (YOUTUBE_API_KEY) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' tutorial')}&type=video&maxResults=${maxResults}&key=${encodeURIComponent(YOUTUBE_API_KEY.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const results = [];
        for (const item of data.items || []) {
          const vid = item.id?.videoId;
          if (!vid) continue;
          const snippet = item.snippet || {};
          results.push({
            title: snippet.title || '',
            url: `https://www.youtube.com/watch?v=${vid}`,
            channel: snippet.channelTitle || 'YouTube',
            thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
            duration: null,
          });
        }
        if (results.length > 0) return results;
      }
    } catch (apiErr) {
      console.warn('[youtubeService] Official API failed, falling back to keyless scraper:', apiErr.message);
    }
  }

  // 2. Keyless YouTube Scraper
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const match = html.match(/var ytInitialData\s*=\s*({.*?});/s);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    const results = [];
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (item.videoRenderer) {
          const vr = item.videoRenderer;
          const videoId = vr.videoId;
          const title = vr.title?.runs?.[0]?.text || '';
          const channel = vr.ownerText?.runs?.[0]?.text || 'YouTube';
          const thumbnails = vr.thumbnail?.thumbnails || [];
          const thumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '';
          const duration = vr.lengthText?.simpleText || null;

          if (videoId && title) {
            results.push({
              title,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              channel,
              thumbnail,
              duration,
            });
          }

          if (results.length >= maxResults) break;
        }
      }
      if (results.length >= maxResults) break;
    }

    return results;
  } catch (err) {
    console.warn('[youtubeService] Keyless search failed:', err.message);
    return [];
  }
}

export default {
  wantsVideos,
  searchYouTube,
};
