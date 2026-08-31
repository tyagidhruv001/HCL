import React, { useState, useEffect } from 'react';
import quizService from '../../services/quizService';

export default function QuizModal({ topic, difficulty = 'beginner', courseId, onClose, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadQuiz() {
      setLoading(true);
      try {
        const res = await quizService.generateQuiz(topic, difficulty, 3);
        const data = res?.data || res;
        if (isMounted && data?.questions?.length > 0) {
          setQuizData(data);
        } else {
          throw new Error('Empty quiz payload');
        }
      } catch {
        if (isMounted) {
          // Client-side fallback questions if backend unavailable
          setQuizData({
            topic: topic || 'Core Competency',
            difficulty,
            questions: [
              {
                id: 1,
                question: `What is the core foundational principle when working with ${topic || 'modern programming'}?`,
                options: [
                  'Understanding modular decomposition and clean abstractions',
                  'Writing all logic into a single unformatted script',
                  'Avoiding version control entirely',
                  'Hardcoding credentials into source code'
                ],
                correct_index: 0,
                explanation: 'Modular decomposition and strong abstraction boundaries ensure maintainable, testable, and scalable software systems.'
              },
              {
                id: 2,
                question: 'Why is continuous practice and active recall important in technical skill acquisition?',
                options: [
                  'It forces neural synaptic strengthening and prevents the illusion of competence',
                  'It guarantees 100% bug-free code on the first run',
                  'It eliminates the need to ever read documentation',
                  'It replaces compiler checks'
                ],
                correct_index: 0,
                explanation: 'Active recall and hands-on coding build mental models and long-term retention far more effectively than passive reading.'
              },
              {
                id: 3,
                question: 'How do you verify the stability and correctness of software changes?',
                options: [
                  'Automated unit tests, integration testing, and peer code review',
                  'Deploying directly to production on Friday evening',
                  'Removing all logging telemetry and assertions',
                  'Assuming anything that compiles has zero logical bugs'
                ],
                correct_index: 0,
                explanation: 'Comprehensive test coverage and code reviews catch bugs before they affect end users.'
              }
            ]
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadQuiz();
    return () => { isMounted = false; };
  }, [topic, difficulty]);

  const questions = quizData?.questions || [];
  const currentQ = questions[currentIdx];

  const handleSelectOption = (idx) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);
    if (selectedOption === currentQ.correct_index) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsFinished(true);
      if (courseId && onComplete) {
        onComplete(courseId);
      }
    }
  };

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
        padding: '28px',
        maxWidth: '580px',
        width: '100%',
        boxShadow: 'var(--shadow)',
        color: 'var(--ink)'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1.5px solid var(--contour-active)' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ochre)', background: 'rgba(199, 110, 26, 0.1)', border: '1px solid rgba(199, 110, 26, 0.25)', padding: '2px 9px', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>
              🧪 Active Recall Challenge
            </span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 600, marginTop: '6px', color: 'var(--pine)', fontFamily: 'var(--font-serif)', margin: '6px 0 0 0' }}>
              {topic || 'Skill Assessment'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--slate-subtle)', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate-subtle)' }}>
            <div style={{ fontSize: '28px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
            <p style={{ marginTop: '10px', fontSize: '0.88rem' }}>Generating active recall questions for {topic}...</p>
          </div>
        ) : isFinished ? (
          
          /* Results Screen */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '54px', marginBottom: '12px' }}>
              {score === questions.length ? '🏆' : score > 0 ? '🎉' : '📚'}
            </div>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--pine)', marginBottom: '8px', fontFamily: 'var(--font-serif)' }}>
              Assessment Complete!
            </h4>
            <p style={{ fontSize: '0.92rem', color: 'var(--slate)', marginBottom: '20px' }}>
              You scored <strong style={{ color: 'var(--pine)' }}>{score}</strong> out of <strong style={{ color: 'var(--pine)' }}>{questions.length}</strong>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="btn-primary"
                onClick={onClose}
                style={{
                  padding: '10px 24px',
                  borderRadius: '3px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✓ Continue Learning
              </button>
            </div>
          </div>

        ) : currentQ ? (

          /* Question & Options */
          <div>
            {/* Progress indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--slate-subtle)', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
              <span>Question {currentIdx + 1} of {questions.length}</span>
              <span style={{ color: 'var(--ochre)', textTransform: 'capitalize', fontWeight: 700 }}>{difficulty} Level</span>
            </div>

            {/* Question Text */}
            <div style={{
              background: 'var(--paper)',
              border: '1px solid var(--contour-faint)',
              borderRadius: '3px',
              padding: '16px',
              fontSize: '1rem',
              fontWeight: 600,
              lineHeight: 1.5,
              marginBottom: '16px',
              color: 'var(--pine)',
              fontFamily: 'var(--font-serif)'
            }}>
              {currentQ.question}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {currentQ.options?.map((opt, idx) => {
                let bg = 'var(--paper)';
                let border = 'var(--border)';
                let color = 'var(--ink)';

                if (isAnswerSubmitted) {
                  if (idx === currentQ.correct_index) {
                    bg = 'rgba(24, 55, 40, 0.12)';
                    border = 'var(--pine)';
                    color = 'var(--pine)';
                  } else if (idx === selectedOption) {
                    bg = 'rgba(239, 68, 68, 0.1)';
                    border = '#ef4444';
                    color = '#b91c1c';
                  }
                } else if (selectedOption === idx) {
                  bg = 'rgba(24, 55, 40, 0.08)';
                  border = 'var(--pine)';
                  color = 'var(--pine)';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '3px',
                      background: bg,
                      border: `1.5px solid ${border}`,
                      color,
                      textAlign: 'left',
                      fontSize: '0.88rem',
                      lineHeight: 1.4,
                      cursor: isAnswerSubmitted ? 'default' : 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <span style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: selectedOption === idx ? 'var(--pine)' : 'var(--paper-card)',
                      color: selectedOption === idx ? 'var(--paper)' : 'var(--slate)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      flexShrink: 0
                    }}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation box after answer submission */}
            {isAnswerSubmitted && currentQ.explanation && (
              <div style={{
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--ochre)',
                padding: '10px 14px',
                borderRadius: '0 3px 3px 0',
                fontSize: '0.85rem',
                color: 'var(--slate)',
                marginBottom: '16px',
                lineHeight: 1.55
              }}>
                <strong style={{ color: 'var(--pine)' }}>💡 Explanation:</strong> {currentQ.explanation}
              </div>
            )}

            {/* Action button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {!isAnswerSubmitted ? (
                <button
                  className="btn-primary"
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '3px',
                    fontWeight: 700,
                    cursor: selectedOption !== null ? 'pointer' : 'not-allowed',
                    opacity: selectedOption !== null ? 1 : 0.5
                  }}
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={handleNextQuestion}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '3px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {currentIdx + 1 < questions.length ? 'Next Question ➔' : 'View Results ➔'}
                </button>
              )}
            </div>

          </div>

        ) : null}

      </div>
    </div>
  );
}
