import React, { useState, useEffect } from 'react';
import roadmapService from '../../services/roadmapService.js';

export default function VideoLectureModal({ course, onLaunchFocus, onClose }) {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchVideos() {
      if (!course) return;
      setLoading(true);
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
          setSelectedVideo(null);
        }
      } catch {
        if (isMounted) {
          const defaultQuery = encodeURIComponent(course.title + ' tutorial');
          setVideos([{
            title: `${course.title} - Tutorial Masterclass`,
            channel: course.provider || 'YouTube',
            url: `https://www.youtube.com/results?search_query=${defaultQuery}`,
            videoId: null
          }]);
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
        position: 'fixed',
        inset: 0,
        background: 'rgba(14, 26, 20, 0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--paper-card)',
        border: '1.5px solid var(--contour-active)',
        borderRadius: '4px',
        padding: '26px 28px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow)',
        color: 'var(--ink)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.5px solid var(--contour-active)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '26px', padding: '8px 12px', background: 'rgba(199, 110, 26, 0.1)', borderRadius: '3px', border: '1px solid rgba(199, 110, 26, 0.25)', color: 'var(--ochre)' }}>
              📺
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ochre)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                Wanderer Video Lecture Studio
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, margin: '2px 0 0 0', color: 'var(--pine)', fontFamily: 'var(--font-serif)' }}>
                {course.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--slate-subtle)',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Video Player & Playlist Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: videos.length > 1 ? '1.8fr 1.2fr' : '1fr',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {/* Main Embedded Player Area */}
          <div style={{ background: '#000000', borderRadius: '4px', overflow: 'hidden', border: '1.5px solid var(--contour-active)' }}>
            {currentVideoId ? (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=1&rel=0`}
                  title={selectedVideo?.title || course.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 0
                  }}
                />
              </div>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'var(--paper)',
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎬</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--pine)', marginBottom: '6px', fontFamily: 'var(--font-serif)' }}>
                  {loading ? 'Finding Best Video Tutorials...' : 'Ready to Stream Masterclass'}
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--slate)', maxWidth: '400px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                  {loading ? 'Querying grounded YouTube tutorials and verified courses...' : 'Click below to watch verified tutorials directly on YouTube or choose a lecture from the playlist.'}
                </p>
                <a
                  href={youtubeSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{
                    padding: '9px 18px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ▶ Watch on YouTube ↗
                </a>
              </div>
            )}

            {/* Current Playing Details */}
            {selectedVideo && (
              <div style={{ padding: '12px 16px', background: 'var(--paper)', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--pine)', lineHeight: 1.4, fontFamily: 'var(--font-serif)' }}>
                  {selectedVideo.title}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--slate-subtle)', marginTop: '4px', display: 'flex', gap: '10px', fontFamily: 'var(--font-mono)' }}>
                  <span>👤 {selectedVideo.channel || course.provider || 'YouTube'}</span>
                  {course.level && <span>📊 {course.level}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Playlist Sidebar */}
          {videos.length > 0 && (
            <div style={{
              background: 'var(--paper)',
              border: '1.5px solid var(--contour-active)',
              borderRadius: '4px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '380px',
              overflowY: 'auto'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-subtle)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
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
                        padding: '10px 12px',
                        borderRadius: '3px',
                        background: isCur ? 'rgba(24, 55, 40, 0.08)' : 'var(--paper-card)',
                        border: isCur ? '1.5px solid var(--pine)' : '1px solid var(--border)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '16px', color: isCur ? 'var(--pine)' : 'var(--slate-subtle)' }}>
                        {isCur ? '▶' : '🎬'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          color: isCur ? 'var(--pine)' : 'var(--ink)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontFamily: 'var(--font-serif)'
                        }}>
                          {vid.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--slate-subtle)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
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
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--ochre)',
            borderRadius: '0 3px 3px 0',
            padding: '12px 14px',
            marginBottom: '18px',
            fontSize: '0.85rem',
            lineHeight: 1.55,
            color: 'var(--slate)'
          }}>
            <strong style={{ color: 'var(--pine)' }}>💡 AI Syllabus Guidance:</strong> {course.why}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <a
            href={selectedVideo?.url || youtubeSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
            style={{
              padding: '9px 16px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🌐 Open in YouTube Tab ↗
          </a>

          {onLaunchFocus && (
            <button
              onClick={() => { onClose(); onLaunchFocus(course.title); }}
              className="btn-primary"
              style={{
                padding: '9px 18px',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⏱️ Watch & Focus (Study Session)
            </button>
          )}

          <button
            onClick={onClose}
            className="btn-outline"
            style={{
              padding: '9px 18px',
              fontSize: '0.84rem'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
