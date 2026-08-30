import React, { useState, useEffect } from 'react';
import roadmapService from '../../services/roadmapService.js';

export default function VideoLectureModal({ course, onLaunchFocus, onClose }) {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchVideos() {
      if (!course) return;
      setLoading(true);
      setError(null);
      try {
        const query = `${course.title} ${course.skills?.slice(0, 2).join(' ') || ''}`.trim();
        const res = await roadmapService.getTopicVideos(query);
        if (isMounted && res?.data && res.data.length > 0) {
          setVideos(res.data);
          setSelectedVideo(res.data[0]);
        } else if (isMounted) {
          // Fallback video card
          const defaultQuery = encodeURIComponent(course.title + ' tutorial');
          setVideos([{
            title: `${course.title} - Complete Masterclass Tutorial`,
            channel: course.provider || 'YouTube Learning',
            url: `https://www.youtube.com/results?search_query=${defaultQuery}`,
            videoId: null
          }]);
        }
      } catch (err) {
        console.warn('Failed to load topic videos:', err);
        if (isMounted) {
          setError('Could not load online playlist. You can still launch YouTube directly.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchVideos();
    return () => { isMounted = false; };
  }, [course]);

  if (!course) return null;

  // Extract YouTube video ID from URL if not provided directly
  const getVideoId = (vid) => {
    if (vid?.videoId) return vid.videoId;
    if (!vid?.url) return null;
    const match = vid.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const currentVideoId = getVideoId(selectedVideo);
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(course.title + ' tutorial')}`;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.12), transparent 50%), #0d1117',
        border: '1.5px solid rgba(99, 102, 241, 0.35)',
        borderRadius: '20px', padding: '24px', maxWidth: '900px', width: '100%',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85)', color: '#f0f6fc',
        fontFamily: 'inherit'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '28px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
              📺
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Wanderer Video Lecture Studio
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0 0 0', color: '#ffffff' }}>
                {course.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px', width: '30px', height: '30px', color: '#94a3b8',
              cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Video Player & Playlist Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: videos.length > 1 ? '1.8fr 1.2fr' : '1fr',
          gap: '16px', marginBottom: '20px'
        }}>
          {/* Main Embedded Player Area */}
          <div style={{ background: '#000000', borderRadius: '14px', overflow: 'hidden', border: '1px solid #30363d' }}>
            {currentVideoId ? (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=1&rel=0`}
                  title={selectedVideo?.title || course.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0
                  }}
                />
              </div>
            ) : (
              <div style={{
                padding: '40px 20px', textAlign: 'center', background: 'rgba(22, 27, 34, 0.8)',
                minHeight: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎬</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                  {loading ? 'Finding Best Video Tutorials...' : 'Ready to Stream Masterclass'}
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '400px', margin: '0 auto 16px' }}>
                  {loading ? 'Querying grounded YouTube tutorials and verified courses...' : 'Click below to watch verified tutorials directly on YouTube or choose a lecture from the playlist.'}
                </p>
                <a
                  href={youtubeSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 20px', borderRadius: '10px', background: '#dc2626',
                    color: '#ffffff', textDecoration: 'none', fontWeight: 700, fontSize: '13px',
                    display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)'
                  }}
                >
                  ▶ Watch on YouTube ↗
                </a>
              </div>
            )}

            {/* Current Playing Details */}
            {selectedVideo && (
              <div style={{ padding: '14px 16px', background: 'rgba(15, 23, 42, 0.9)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', lineHeight: 1.4 }}>
                  {selectedVideo.title}
                </div>
                <div style={{ fontSize: '12px', color: '#a5b4fc', marginTop: '4px', display: 'flex', gap: '10px' }}>
                  <span>👤 {selectedVideo.channel || course.provider || 'YouTube'}</span>
                  {course.level && <span>📊 {course.level}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Playlist Sidebar */}
          {videos.length > 0 && (
            <div style={{
              background: 'rgba(22, 27, 34, 0.8)', border: '1px solid #30363d',
              borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column',
              maxHeight: '380px', overflowY: 'auto'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#8b949e', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                📑 Curated Video Lectures ({videos.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {videos.map((vid, idx) => {
                  const isCur = selectedVideo?.title === vid.title || (vid.videoId && vid.videoId === currentVideoId);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (getVideoId(vid)) {
                          setSelectedVideo(vid);
                        } else if (vid.url) {
                          window.open(vid.url, '_blank');
                        }
                      }}
                      style={{
                        padding: '10px 12px', borderRadius: '10px',
                        background: isCur ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: isCur ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '18px', color: isCur ? '#818cf8' : '#94a3b8' }}>
                        {isCur ? '▶' : '🎬'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '12.5px', fontWeight: 600, color: isCur ? '#ffffff' : '#cbd5e1',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {vid.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>
                          {vid.channel || 'YouTube'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* AI Guidance & Skills Taught */}
        {course.why && (
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '12px', padding: '14px', marginBottom: '18px', fontSize: '13px', lineHeight: 1.5, color: '#e2e8f0'
          }}>
            💡 <strong>AI Syllabus Guidance:</strong> {course.why}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <a
            href={selectedVideo?.url || youtubeSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 18px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)', color: '#cbd5e1',
              textDecoration: 'none', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            🌐 Open in YouTube Tab ↗
          </a>

          {onLaunchFocus && (
            <button
              onClick={() => { onClose(); onLaunchFocus(course.title); }}
              style={{
                padding: '10px 18px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none',
                color: '#ffffff', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
              }}
            >
              ⏱️ Watch & Focus (Study Session)
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
