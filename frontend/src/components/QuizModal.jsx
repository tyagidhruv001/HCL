import React, { useState, useEffect } from 'react';
import { QuizAPI } from '../services/quiz.api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Storage } from '../utils/storage.js';

export default function QuizModal({ topic, courseId, difficulty = 'beginner', onClose, onComplete }) {
  const { showToast } = useToast();
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
        const res = await QuizAPI.generateQuiz(topic, difficulty, 3);
        const data = res?.data || res;
        if (isMounted && data && data.questions && data.questions.length > 0) {
          setQuizData(data);
        } else {
          throw new Error('Empty quiz payload');
        }
      } catch (err) {
        if (isMounted) {
          // Robust client-side fallback quiz if both backends are unreachable
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
                explanation: 'Active recall and hands-on coding build mental models and long-term retention far more effectively than passive video watching.'
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
      showToast('✨ Correct answer! Great job!', 'success');
    } else {
      showToast('❌ Not quite right. Review the explanation below.', 'error');
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsFinished(true);
      if (courseId) {
        Storage.markCourseComplete(courseId);
        if (onComplete) onComplete(courseId);
      }
    }
  };

  const handleFinishAndClose = () => {
    showToast(`🎉 Quiz completed! You scored ${score}/${questions.length}!`, 'success');
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '580px', padding: '28px', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <span className="badge badge-indigo" style={{ fontSize: '11px', marginBottom: '6px', display: 'inline-block' }}>
              🧪 Active Recall Quiz
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {topic ? `${topic.toUpperCase()} Knowledge Check` : 'Skill Assessment'}
            </h2>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: '16px' }}>✕</button>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'spin 1.5s linear infinite' }}>⟳</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Generating targeted assessment questions...</div>
          </div>
        )}

        {/* Question View */}
        {!loading && !isFinished && currentQ && (
          <div>
            {/* Progress indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <span>Question {currentIdx + 1} of {questions.length}</span>
              <span>Score: <strong style={{ color: '#34d399' }}>{score}</strong></span>
            </div>
            <div className="progress-bar-wrap" style={{ height: '6px', marginBottom: '20px' }}>
              <div className="progress-bar-fill" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
            </div>

            {/* Question Text */}
            <div style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.5, color: '#f8fafc', marginBottom: '18px' }}>
              {currentQ.question}
            </div>

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = isAnswerSubmitted && idx === currentQ.correct_index;
                const isWrong = isAnswerSubmitted && isSelected && idx !== currentQ.correct_index;

                let borderCol = 'var(--border-subtle)';
                let bgCol = 'rgba(255,255,255,0.03)';
                let textCol = 'var(--text-primary)';

                if (isCorrect) {
                  borderCol = '#10b981';
                  bgCol = 'rgba(16, 185, 129, 0.15)';
                  textCol = '#34d399';
                } else if (isWrong) {
                  borderCol = '#ef4444';
                  bgCol = 'rgba(239, 68, 68, 0.15)';
                  textCol = '#f87171';
                } else if (isSelected) {
                  borderCol = 'var(--indigo)';
                  bgCol = 'rgba(99, 102, 241, 0.15)';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswerSubmitted}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${borderCol}`,
                      background: bgCol,
                      color: textCol,
                      fontSize: '14px',
                      lineHeight: 1.4,
                      cursor: isAnswerSubmitted ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: isCorrect ? '#10b981' : (isWrong ? '#ef4444' : (isSelected ? 'var(--indigo)' : 'rgba(255,255,255,0.08)')),
                      color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0
                    }}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation card after submit */}
            {isAnswerSubmitted && currentQ.explanation && (
              <div style={{
                background: selectedOption === currentQ.correct_index ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                border: `1px solid ${selectedOption === currentQ.correct_index ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '13px',
                lineHeight: 1.5,
                color: '#cbd5e1',
                marginBottom: '20px'
              }}>
                <strong style={{ color: selectedOption === currentQ.correct_index ? '#34d399' : '#a5b4fc', display: 'block', marginBottom: '4px' }}>
                  💡 Concept Explanation:
                </strong>
                {currentQ.explanation}
              </div>
            )}

            {/* Bottom action controls */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {!isAnswerSubmitted ? (
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null}
                >
                  Submit Answer ✓
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleNextQuestion}
                >
                  {currentIdx + 1 < questions.length ? 'Next Question →' : 'View Results 🏆'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results Screen */}
        {!loading && isFinished && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>
              {score === questions.length ? '🌟' : (score > 0 ? '🏆' : '📚')}
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px', color: '#ffffff' }}>
              Quiz Finished!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
              You answered <strong style={{ color: '#34d399' }}>{score} of {questions.length}</strong> questions correctly ({Math.round((score / Math.max(1, questions.length)) * 100)}%).
            </p>

            <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#a5b4fc', marginBottom: '6px' }}>⚡ Rewards Earned:</div>
              <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>
                ✅ <strong>+{score * 50} Knowledge XP</strong> added to your profile<br />
                🔥 <strong>Active Recall Streak</strong> maintained<br />
                {courseId && <span>🎓 Step mastery marked on your learning roadmap</span>}
              </div>
            </div>

            <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={handleFinishAndClose}>
              Continue Learning Journey →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
