import dotenv from 'dotenv';
dotenv.config();
import { generateJSON } from './geminiService.js';
import Question from '../models/Question.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// ── Fallback questions for standard offline subjects ────────────────────
export const FALLBACK_QUESTIONS = {
  dsa: [
    { q: 'What is the time complexity of binary search on a sorted array?', opts: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], ans: 1, type: 'conceptual', explanation: 'Binary search halves the search space at each step, yielding logarithmic O(log n) time complexity.' },
    { q: 'Which data structure is primarily used in Breadth-First Search (BFS)?', opts: ['Stack', 'Priority Queue', 'Queue', 'Deque'], ans: 2, type: 'conceptual', explanation: 'BFS explores nodes level by level using a FIFO Queue.' },
    { q: 'What is the worst-case time complexity of QuickSort?', opts: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], ans: 2, type: 'edge_case', explanation: 'QuickSort degrades to O(n²) when the pivot chosen is consistently the extreme element on already sorted data.' },
    { q: 'Which traversal algorithm implicitly uses a call stack during recursion?', opts: ['BFS', 'Level Order Traversal', 'DFS', 'Dijkstra'], ans: 2, type: 'code_analysis', explanation: 'Depth-First Search (DFS) relies on recursive stack frames (LIFO order).' },
    { q: 'What is the time complexity of Dijkstra with a min-heap on a graph with V vertices and E edges?', opts: ['O(V²)', 'O((V + E) log V)', 'O(E² log V)', 'O(V + E)'], ans: 1, type: 'mathematical', explanation: 'Each vertex extraction takes O(log V) and each edge relaxation takes O(log V), totaling O((V + E) log V).' },
    { q: 'In a min-heap with N elements, which element is guaranteed to be at the root?', opts: ['Maximum element', 'Median element', 'Minimum element', 'Arbitrary element'], ans: 2, type: 'conceptual', explanation: 'The min-heap property requires the parent key to be less than or equal to child keys, placing the minimum at the root.' },
    { q: 'What is the space complexity of standard Merge Sort on an array?', opts: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], ans: 2, type: 'conceptual', explanation: 'Standard Merge Sort requires an auxiliary array of size O(n) to merge subarrays.' },
    { q: 'Which algorithm detects a cycle in a directed graph efficiently?', opts: ['Simple BFS', 'DFS with 3-color vertex marking', 'Prim Algorithm', 'Floyd-Warshall'], ans: 1, type: 'applied_scenario', explanation: 'DFS with white/gray/black 3-color states detects back-edges which indicate cycles in directed graphs.' },
  ],
  quantum: [
    { q: 'What fundamental quantum phenomenon allows qubits to exist in linear combinations of |0⟩ and |1⟩?', opts: ['Superposition', 'Quantum Tunneling', 'Decoherence', 'Quantum Teleportation'], ans: 0, type: 'conceptual', explanation: 'Superposition allows a quantum state |ψ⟩ = α|0⟩ + β|1⟩ with |α|² + |β|² = 1.' },
    { q: 'Which quantum logic gate is used to transform a basis state |0⟩ into an equal superposition (|0⟩ + |1⟩)/√2?', opts: ['Pauli-X Gate', 'Hadamard (H) Gate', 'CNOT Gate', 'Phase-S Gate'], ans: 1, type: 'code_analysis', explanation: 'The Hadamard gate creates an equal superposition from computational basis states.' },
    { q: 'What is the dimension of the state space of a quantum system with n qubits?', opts: ['n', '2n', '2ⁿ', 'n²'], ans: 2, type: 'mathematical', explanation: 'The Hilbert space for an n-qubit system grows exponentially as the tensor product of 2-dimensional spaces: 2ⁿ.' },
    { q: 'Which matrix property must all quantum logic gates satisfy to preserve probability amplitudes?', opts: ['Orthogonal', 'Unitary (U†U = I)', 'Idempotent', 'Nilpotent'], ans: 1, type: 'conceptual', explanation: 'Quantum evolution is reversible and norm-preserving, which requires gate operators to be Unitary matrices.' },
  ],
};



export async function generateAIQuestions(subject = 'DSA', count = 5, ctx = {}) {
  const cleanSubject = (subject || 'Software Engineering').trim();
  const difficulty = ctx.difficulty || (ctx.lastScore !== null && ctx.lastScore >= 80 ? 'hard' : ctx.lastScore !== null && ctx.lastScore < 50 ? 'easy' : 'medium');
  const targetCount = Math.max(3, Math.min(10, count || 5));
  const variationSalt = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // 1. PRIMARY: Groq High-Speed LLM Generator (Guaranteed Freshness & High Variance)
  if (GROQ_API_KEY) {
    try {
      console.log(`[Checkpoint AI] Generating fresh ${targetCount} ${difficulty} questions for "${cleanSubject}" (Variation: ${variationSalt}) via Groq...`);
      const prompt = `You are the Lead Technical Examiner and Adaptive AI Assessment Engine in StudySpark.
Construct a completely fresh, novel, and intellectually rigorous ${targetCount}-question diagnostic test for the following topic:

🎯 TOPIC / SYLLABUS: "${cleanSubject}"
📊 DIFFICULTY TIER: "${difficulty}"
🎲 VARIATION TOKEN (to guarantee non-repeating questions): "${variationSalt}"

Generate a diverse balance across these 4 cognitive question types:
1. 🧠 Conceptual & Theoretical Foundations (definitions, mechanisms, principles)
2. 💻 Code / Logic Analysis & Tracing (interpreting logic, state changes, algorithmic cost)
3. 🔬 Applied Scenario & Problem Solving (system design choices, debugging, real-world trade-offs)
4. ⚙️ Edge Cases & Diagnostics (boundary conditions, invariants, failure modes)

Return a pure JSON object matching this schema:
{
  "subject": "${cleanSubject}",
  "questions": [
    {
      "q": "Clear, standalone question text with precise technical terms",
      "opts": ["Option A", "Option B", "Option C", "Option D"],
      "ans": 0,
      "type": "conceptual",
      "explanation": "Clear 1-2 sentence explanation of why this answer is correct and why distractors are wrong.",
      "difficulty": "${difficulty}"
    }
  ]
}

CRITICAL RULES:
- Generate EXACTLY ${targetCount} unique, non-repeating questions tailored 100% to "${cleanSubject}".
- Every question MUST have EXACTLY 4 distinct, plausible options in "opts".
- "ans" MUST be an integer from 0 to 3 matching the correct option index.
- "type" MUST be one of: "conceptual", "code_analysis", "applied_scenario", "edge_case".
- Return ONLY valid JSON. No markdown fences.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.85, // High entropy for non-repeating questions
          response_format: { type: 'json_object' }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);
        const qList = parsed.questions || parsed.quiz || [];
        if (Array.isArray(qList) && qList.length > 0) {
          const validated = validateAndFormatQuestions(qList, cleanSubject, difficulty);
          if (validated.length >= 3) {
            persistQuestionsToDB(validated, cleanSubject);
            return validated;
          }
        }
      }
    } catch (groqErr) {
      console.warn(`[Checkpoint AI] Groq question generation error:`, groqErr.message);
    }
  }

  // 2. SECONDARY: Python ML Microservice Engine
  try {
    const mlResp = await fetch(`${ML_SERVICE_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: `Generate ${targetCount} brand new multiple-choice test questions for ${cleanSubject} in JSON format with q, opts (4 choices), ans (0-3 index), type, and explanation. Salt: ${variationSalt}`,
        history: []
      })
    });
    if (mlResp.ok) {
      const mlData = await mlResp.json();
      const rawText = mlData.answer || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const qList = parsed.questions || parsed.quiz || [];
        if (Array.isArray(qList) && qList.length > 0) {
          const validated = validateAndFormatQuestions(qList, cleanSubject, difficulty);
          if (validated.length >= 3) {
            persistQuestionsToDB(validated, cleanSubject);
            return validated;
          }
        }
      }
    }
  } catch (mlErr) {
    // Continue to next tier
  }

  // 3. TERTIARY: Gemini 2.5 Flash
  try {
    const geminiPrompt = `Generate a fresh diagnostic test for "${cleanSubject}" with ${targetCount} multiple-choice questions (Variation: ${variationSalt}). Return JSON: { "questions": [ { "q": "...", "opts": ["A","B","C","D"], "ans": 0, "type": "conceptual", "explanation": "..." } ] }`;
    const result = await generateJSON(geminiPrompt, { temperature: 0.85 });
    const qList = result?.questions || [];
    if (Array.isArray(qList) && qList.length > 0) {
      const validated = validateAndFormatQuestions(qList, cleanSubject, difficulty);
      if (validated.length >= 3) {
        persistQuestionsToDB(validated, cleanSubject);
        return validated;
      }
    }
  } catch (geminiErr) {
    console.warn(`[Checkpoint AI] Gemini fallback error:`, geminiErr.message);
  }

  // 4. FOURTH: Smart Dynamic Topic-Aware Generator (with algorithmic variation)
  return generateDynamicFallback(cleanSubject, targetCount, difficulty);
}

/**
 * Validate that every generated question conforms strictly to schema
 */
function validateAndFormatQuestions(qList, subject, difficulty) {
  return qList
    .filter(item => item && item.q && Array.isArray(item.opts) && item.opts.length === 4 && typeof item.ans === 'number' && item.ans >= 0 && item.ans <= 3)
    .map(item => ({
      q: String(item.q).trim(),
      opts: item.opts.map(o => String(o).trim()),
      ans: Number(item.ans),
      type: ['conceptual', 'code_analysis', 'applied_scenario', 'edge_case'].includes(item.type) ? item.type : 'conceptual',
      explanation: item.explanation || `Correct answer is option ${String.fromCharCode(65 + Number(item.ans))}.`,
      difficulty: item.difficulty || difficulty,
      subject,
    }));
}

/**
 * Asynchronously persist verified questions into MongoDB for caching & offline recall
 */
async function persistQuestionsToDB(questions, subject) {
  try {
    for (const q of questions) {
      await Question.findOneAndUpdate(
        { q: q.q },
        {
          subject,
          topic: subject,
          difficulty: q.difficulty || 'medium',
          q: q.q,
          opts: q.opts,
          ans: q.ans,
          tags: [q.type || 'conceptual', subject],
        },
        { upsert: true, new: true }
      ).catch(() => {});
    }
  } catch (e) {
    // Non-critical background save
  }
}

/**
 * Smart dynamic generator that parses the subject name to generate relevant topic questions
 */
function generateDynamicFallback(subject, count, difficulty) {
  const s = subject.toLowerCase();
  if (s.includes('quantum')) return FALLBACK_QUESTIONS.quantum.slice(0, count);
  if (s.includes('dsa') || s.includes('algo') || s.includes('data structure')) return FALLBACK_QUESTIONS.dsa.slice(0, count);

  // Synthesize subject-tailored questions dynamically
  const types = ['conceptual', 'applied_scenario', 'code_analysis', 'edge_case'];
  const questions = [];

  for (let i = 0; i < count; i++) {
    const qType = types[i % types.length];
    if (qType === 'conceptual') {
      questions.push({
        q: `What is the foundational architectural principle of ${subject}?`,
        opts: [
          `Separation of concerns and modular abstraction in ${subject}`,
          `Direct unmanaged memory manipulation without type safety`,
          `Uncontrolled global mutable state across all modules`,
          `Ignoring computational time complexity limits`
        ],
        ans: 0,
        type: 'conceptual',
        explanation: `${subject} prioritizes structured modularity, separation of concerns, and clean interface boundaries.`,
        difficulty
      });
    } else if (qType === 'applied_scenario') {
      questions.push({
        q: `When scaling a system using ${subject} under high load, which strategy is most effective?`,
        opts: [
          `Synchronous blocking operations on the main execution thread`,
          `Horizontal scaling, caching frequently accessed states, and asynchronous I/O`,
          `Restarting the server instance after every user request`,
          `Hardcoding static buffer sizes without auto-scaling policies`
        ],
        ans: 1,
        type: 'applied_scenario',
        explanation: `Scalability in modern ${subject} architectures is achieved through caching, horizontal concurrency, and non-blocking pipelines.`,
        difficulty
      });
    } else if (qType === 'code_analysis') {
      questions.push({
        q: `In ${subject}, what is the best practice for robust error and exception handling?`,
        opts: [
          `Swallowing all exceptions silently with empty catch blocks`,
          `Terminating the entire host process on minor runtime warnings`,
          `Using structured try/catch blocks with contextual error logging and graceful fallbacks`,
          `Ignoring error status codes returned by internal services`
        ],
        ans: 2,
        type: 'code_analysis',
        explanation: `Structured error handling with contextual telemetry prevents cascading failure and guarantees resilience in ${subject}.`,
        difficulty
      });
    } else {
      questions.push({
        q: `Which diagnostic checkpoint guarantees optimal integrity and performance in ${subject}?`,
        opts: [
          `Continuous integration tests, profiling memory usage, and validating edge constraints`,
          `Deploying code directly without automated unit test verification`,
          `Disabling logging and monitoring in production environments`,
          `Assuming zero network latency and infinite available bandwidth`
        ],
        ans: 0,
        type: 'edge_case',
        explanation: `Automated testing and profiling ensure boundaries and invariants are satisfied under real-world conditions.`,
        difficulty
      });
    }
  }

  return questions;
}

export default { generateAIQuestions };
