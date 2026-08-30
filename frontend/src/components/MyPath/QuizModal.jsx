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
      } catch (err) {
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
        position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'rgba(10, 15, 30, 0.96)', border: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: '20px', padding: '28px', maxWidth: '580px', width: '100%',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)', color: '#f1f5f9'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#c7d2fe', background: 'rgba(99,102,241,0.2)', padding: '3px 10px', borderRadius: '9999px' }}>
              🧪 Active Recall Challenge
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '6px', color: '#ffffff' }}>
              {topic || 'Skill Assessment'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '28px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
            <p style={{ marginTop: '10px' }}>Generating active recall questions for {topic}...</p>
          </div>
        ) : isFinished ? (
          
          /* Results Screen */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '54px', marginBottom: '12px' }}>
              {score === questions.length ? '🏆' : score > 0 ? '🎉' : '📚'}
            </div>
            <h4 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Assessment Complete!
            </h4>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>
              You scored <strong style={{ color: '#34d399' }}>{score}</strong> out of <strong style={{ color: '#ffffff' }}>{questions.length}</strong>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 24px', borderRadius: '10px', background: '#6366f1',
                  color: '#ffffff', border: 'none', fontWeight: 700, cursor: 'pointer'
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
              <span>Question {currentIdx + 1} of {questions.length}</span>
              <span style={{ color: '#a5b4fc', textTransform: 'capitalize' }}>{difficulty} Level</span>
            </div>

            {/* Question Text */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 600,
              lineHeight: 1.5, marginBottom: '16px', color: '#ffffff'
            }}>
              {currentQ.question}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {currentQ.options?.map((opt, idx) => {
                let bg = 'rgba(255, 255, 255, 0.03)';
                let border = 'rgba(255, 255, 255, 0.08)';
                let color = '#cbd5e1';

                if (isAnswerSubmitted) {
                  if (idx === currentQ.correct_index) {
                    bg = 'rgba(16, 185, 129, 0.2)';
                    border = '#10b981';
                    color = '#34d399';
                  } else if (idx === selectedOption) {
                    bg = 'rgba(239, 68, 68, 0.2)';
                    border = '#ef4444';
                    color = '#f87171';
                  }
                } else if (selectedOption === idx) {
                  bg = 'rgba(99, 102, 241, 0.25)';
                  border = '#6366f1';
                  color = '#ffffff';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    style={{
                      padding: '12px 16px', borderRadius: '10px', background: bg,
                      border: `1px solid ${border}`, color, textAlign: 'left',
                      fontSize: '13px', lineHeight: 1.4, cursor: isAnswerSubmitted ? 'default' : 'pointer',
                      transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: '10px'
                    }}
                  >
                    <span style={{
                      width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
                      fontWeight: 700, flexShrink: 0
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
                background: 'rgba(99, 102, 241, 0.1)', borderLeft: '3px solid #6366f1',
                padding: '10px 14px', borderRadius: '0 8px 8px 0', fontSize: '12px',
                color: '#cbd5e1', marginBottom: '16px', lineHeight: 1.5
              }}>
                💡 <strong>Explanation:</strong> {currentQ.explanation}
              </div>
            )}

            {/* Action button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {!isAnswerSubmitted ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null}
                  style={{
                    padding: '10px 20px', borderRadius: '10px',
                    background: selectedOption !== null ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    color: '#ffffff', border: 'none', fontWeight: 700,
                    cursor: selectedOption !== null ? 'pointer' : 'not-allowed'
                  }}
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', background: '#10b981',
                    color: '#ffffff', border: 'none', fontWeight: 700, cursor: 'pointer'
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
