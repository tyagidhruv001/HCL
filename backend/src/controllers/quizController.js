import { generateJSON } from '../services/geminiService.js';

// ──────────────────────────────────────────────────────────────
// @desc   Generate interactive active recall quiz questions via Gemini AI
// @route  POST /api/quiz/generate
// @access Public / Private
// ──────────────────────────────────────────────────────────────
export const generateQuiz = async (req, res) => {
  try {
    const { topic, difficulty = 'beginner', count = 3 } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, message: 'Topic is required' });
    }

    // If Gemini key is configured, generate dynamic active recall questions
    if (process.env.GEMINI_API_KEY) {
      const prompt = `
You are an expert technical educator and quiz generator.
Create ${count} multiple choice questions to test knowledge on the topic "${topic}" at a "${difficulty}" level.

Return a JSON object with this EXACT structure (no markdown fences, just pure JSON):
{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": 1,
      "question": "Clear conceptual question about ${topic}?",
      "options": [
        "Correct and accurate answer explanation",
        "Plausible but incorrect distractor 1",
        "Plausible but incorrect distractor 2",
        "Plausible but incorrect distractor 3"
      ],
      "correct_index": 0,
      "explanation": "Clear explanation of why this answer is correct."
    }
  ]
}

Rules:
- Ensure the questions test deep understanding rather than superficial syntax trivia.
- The correct_index must be an integer between 0 and 3 corresponding to the correct option in the options array.
- Provide ${count} high quality questions.
`.trim();

      try {
        console.log(`[Quiz API] Generating ${count} questions for topic: "${topic}"`);
        const data = await generateJSON(prompt);
        if (data?.questions?.length > 0) {
          return res.json({
            success: true,
            data,
            aiGenerated: true,
          });
        }
      } catch (aiErr) {
        console.warn('[Quiz API] Gemini generation failed, using fallback:', aiErr.message);
      }
    }

    // Fallback if AI call fails or key is missing
    const fallbackQuestions = [
      {
        id: 1,
        question: `What is the core architectural principle when applying ${topic}?`,
        options: [
          'Modular decomposition and clean abstraction boundaries',
          'Writing monolithic routines without unit tests',
          'Disabling all runtime error handlers',
          'Coupling presentation logic directly to database schemas'
        ],
        correct_index: 0,
        explanation: 'Modular design and strong encapsulation ensure maintainability, scalability, and testability across software systems.'
      },
      {
        id: 2,
        question: `Why is continuous practice and active recall important for mastering ${topic}?`,
        options: [
          'It reinforces synaptic connections and verifies true conceptual understanding',
          'It completely eliminates the need for software debugging',
          'It guarantees immediate production readiness without review',
          'It replaces code compilers'
        ],
        correct_index: 0,
        explanation: 'Active recall builds durable mental models and long-term retention far more effectively than passive reading.'
      },
      {
        id: 3,
        question: `How do you measure production readiness and performance in ${topic}?`,
        options: [
          'Through automated unit testing, benchmark profiling, and systematic code review',
          'By assuming all code works correctly if it compiles once',
          'By skipping staging environments entirely',
          'By removing all logging telemetry'
        ],
        correct_index: 0,
        explanation: 'Comprehensive automated test suites, profiling benchmarks, and code reviews ensure production reliability.'
      }
    ];

    res.json({
      success: true,
      data: {
        topic,
        difficulty,
        questions: fallbackQuestions.slice(0, count),
      },
      aiGenerated: false,
    });
  } catch (error) {
    console.error('Quiz Generation Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
