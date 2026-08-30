import dotenv from 'dotenv';
dotenv.config();
import { generateJSON } from './geminiService.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

/**
 * Generate a full prerequisite Knowledge Graph DAG for any subject/domain.
 * Returns an array of tiered nodes with incoming prerequisites and outgoing unlocks.
 */
export async function generateCompetencyDAG(topic = 'Quantum Computing') {
  const cleanTopic = (topic || 'Software Engineering').trim();

  // 1. PRIMARY: Groq LLM (High speed JSON mode)
  if (GROQ_API_KEY) {
    try {
      console.log(`[Competency AI] Generating Knowledge Graph DAG for "${cleanTopic}" via Groq...`);
      const prompt = `You are a Principal Curriculum Architect in StudySpark.
Construct an interactive Prerequisite Competency Knowledge Graph (DAG) for: "${cleanTopic}".

Create 8 to 10 distinct competency nodes across 4 tiers:
- "Foundational" (Tier 1: Essential mathematical, theoretical, or tooling prerequisites)
- "Core" (Tier 2: Fundamental mechanisms, primary frameworks, and core syntax)
- "Advanced" (Tier 3: Complex architectures, optimization, and system integration)
- "Mastery" (Tier 4: Capstone systems, distributed scaling, and specialized research)

Return a pure JSON object:
{
  "topic": "${cleanTopic}",
  "domain": "${cleanTopic}",
  "overview": "Concise 1-2 sentence overview of this technical trajectory.",
  "nodes": [
    {
      "id": "node_id_lowercase",
      "label": "Display Title",
      "tier": "Foundational",
      "icon": "⚡",
      "desc": "Technical summary.",
      "prerequisites": ["earlier_node_id"],
      "unlocks": ["later_node_id"],
      "estimatedHours": 20,
      "keySubtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"]
    }
  ]
}
Ensure valid DAG (no cycles). Output ONLY valid JSON.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);
        if (parsed.nodes && Array.isArray(parsed.nodes) && parsed.nodes.length >= 4) {
          return validateAndEnrichDAG(parsed, cleanTopic);
        }
      }
    } catch (err) {
      console.warn(`[Competency AI] Groq DAG generation error:`, err.message);
    }
  }

  // 2. SECONDARY: Gemini 2.5 Flash
  try {
    const geminiPrompt = `Generate a competency DAG for "${cleanTopic}" with 8 to 10 nodes (id, label, tier: Foundational/Core/Advanced/Mastery, icon, desc, prerequisites: [], unlocks: [], estimatedHours: 20, keySubtopics: []). Return JSON: { "topic": "${cleanTopic}", "nodes": [...] }`;
    const result = await generateJSON(geminiPrompt, { maxOutputTokens: 2048 });
    if (result?.nodes && Array.isArray(result.nodes) && result.nodes.length >= 4) {
      return validateAndEnrichDAG(result, cleanTopic);
    }
  } catch (geminiErr) {
    console.warn(`[Competency AI] Gemini DAG error:`, geminiErr.message);
  }

  // 3. FALLBACK: Domain Specialized Synthesizer
  return synthesizeFallbackDAG(cleanTopic);
}

/**
 * Compute dynamic node statuses (mastered, in_progress, ready, locked)
 * based on user's real MongoDB learning progress and verified checkpoints.
 */
export function computeDynamicNodeStates(nodes, userRoadmap = null, userCheckpoints = [], userSessions = []) {
  const completedRoadmapCourses = userRoadmap?.completedCourseIds || [];
  const doneRoadmapTopics = (userRoadmap?.nodes || []).filter(n => n.status === 'done').map(n => n.topic?.toLowerCase());
  const checkpointPassMap = new Map();

  userCheckpoints.forEach(cp => {
    if (cp.subject && cp.score >= 70) {
      checkpointPassMap.set(cp.subject.toLowerCase(), cp.score);
    }
  });

  const sessionTopicSet = new Set(userSessions.map(s => (s.topic || '').toLowerCase()));

  // Pass 1: Mark explicitly mastered or in_progress nodes
  nodes.forEach((node, idx) => {
    const labelLower = (node.label || '').toLowerCase();
    const idLower = (node.id || '').toLowerCase();

    const isRoadmapDone = completedRoadmapCourses.includes(node.id) || doneRoadmapTopics.includes(labelLower);
    const hasPassedCheckpoint = checkpointPassMap.has(labelLower) || checkpointPassMap.has(idLower);

    if (isRoadmapDone || hasPassedCheckpoint) {
      node.status = 'mastered';
      node.masteryScore = checkpointPassMap.get(labelLower) || checkpointPassMap.get(idLower) || 95;
      node.verifiedViaCheckpoint = hasPassedCheckpoint;
    } else if (sessionTopicSet.has(labelLower) || (idx === 0 && !isRoadmapDone)) {
      node.status = 'in_progress';
    } else {
      node.status = 'pending_check';
    }
  });

  // Pass 2: Resolve prerequisites for un-mastered nodes (ready vs locked)
  const masteredIds = new Set(nodes.filter(n => n.status === 'mastered').map(n => n.id));

  nodes.forEach(node => {
    if (node.status === 'mastered') return;

    const prereqs = node.prerequisites || [];
    if (prereqs.length === 0) {
      if (node.status !== 'in_progress') node.status = 'ready';
    } else {
      const allPrereqsMet = prereqs.every(pId => masteredIds.has(pId));
      if (allPrereqsMet) {
        if (node.status !== 'in_progress') node.status = 'ready';
      } else {
        node.status = 'locked';
      }
    }
  });

  return nodes;
}

/**
 * Transform an active MongoDB roadmap into an interactive Competency DAG with learner progress states.
 */
export function mapRoadmapToCompetencyDAG(roadmap, userCheckpoints = [], userSessions = []) {
  if (!roadmap || !roadmap.phases || !Array.isArray(roadmap.phases)) {
    return synthesizeFallbackDAG(roadmap?.goal || 'Computer Science');
  }

  const rawNodes = [];
  const tiers = ['Foundational', 'Core', 'Advanced', 'Mastery'];
  let previousNodeId = null;

  roadmap.phases.forEach((phase, pIdx) => {
    const tier = tiers[Math.min(pIdx, tiers.length - 1)];
    const courses = phase.courses || [{ title: phase.title, topic: phase.theme }];

    courses.forEach((course, cIdx) => {
      const nodeId = `node_p${pIdx + 1}_c${cIdx + 1}`;
      const prerequisites = previousNodeId ? [previousNodeId] : [];

      rawNodes.push({
        id: nodeId,
        label: course.title || `Phase ${pIdx + 1}: ${phase.title}`,
        tier,
        icon: getPhaseIcon(pIdx),
        desc: course.desc || phase.theme || `Core competencies in ${phase.title}`,
        prerequisites,
        unlocks: [],
        estimatedHours: 15 + pIdx * 5,
        keySubtopics: course.topics || [phase.theme || 'Fundamental Principles', 'Hands-on Implementation', 'Checkpoint Assessment'],
        phaseNumber: pIdx + 1
      });

      previousNodeId = nodeId;
    });
  });

  // Cross-link outgoing unlocks
  for (let i = 0; i < rawNodes.length; i++) {
    const currentId = rawNodes[i].id;
    rawNodes[i].unlocks = rawNodes
      .filter(n => n.prerequisites.includes(currentId))
      .map(n => n.id);
  }

  const enrichedNodes = computeDynamicNodeStates(rawNodes, roadmap, userCheckpoints, userSessions);
  const masteredCount = enrichedNodes.filter(n => n.status === 'mastered').length;
  const readiness = enrichedNodes.length > 0 ? Math.round((masteredCount / enrichedNodes.length) * 100) : 0;

  return {
    topic: roadmap.goal || roadmap.title || 'Active Learning Pathway',
    domain: roadmap.goal || 'Engineering',
    overview: `Interactive prerequisite competency dependency graph for your active "${roadmap.goal || roadmap.title}" curriculum.`,
    isRoadmapLinked: true,
    totalNodes: enrichedNodes.length,
    masteredNodesCount: masteredCount,
    readinessPercentage: readiness,
    nodes: enrichedNodes
  };
}

function getPhaseIcon(pIdx) {
  const icons = ['📐', '⚡', '💻', '🔬', '🚀', '🏆'];
  return icons[pIdx % icons.length];
}

function validateAndEnrichDAG(dagData, topic) {
  const validNodes = (dagData.nodes || []).map((n, idx) => ({
    id: n.id ? String(n.id).toLowerCase().replace(/\s+/g, '_') : `node_${idx + 1}`,
    label: n.label || `Competency ${idx + 1}`,
    tier: ['Foundational', 'Core', 'Advanced', 'Mastery'].includes(n.tier) ? n.tier : idx < 2 ? 'Foundational' : idx < 5 ? 'Core' : idx < 8 ? 'Advanced' : 'Mastery',
    icon: n.icon || '📘',
    desc: n.desc || `Key principles and techniques in ${topic}.`,
    prerequisites: Array.isArray(n.prerequisites) ? n.prerequisites.map(p => String(p).toLowerCase().replace(/\s+/g, '_')) : [],
    unlocks: Array.isArray(n.unlocks) ? n.unlocks.map(u => String(u).toLowerCase().replace(/\s+/g, '_')) : [],
    estimatedHours: Number(n.estimatedHours) || 20,
    keySubtopics: Array.isArray(n.keySubtopics) && n.keySubtopics.length > 0 ? n.keySubtopics : ['Core Concepts', 'Hands-on Practice', 'Milestone Review']
  }));

  // Ensure reciprocal unlocks
  validNodes.forEach(node => {
    node.prerequisites.forEach(prereqId => {
      const target = validNodes.find(n => n.id === prereqId);
      if (target && !target.unlocks.includes(node.id)) {
        target.unlocks.push(node.id);
      }
    });
  });

  return {
    topic: dagData.topic || topic,
    domain: dagData.domain || topic,
    overview: dagData.overview || `Visual prerequisite competency dependency graph for ${topic}.`,
    nodes: validNodes
  };
}

function synthesizeFallbackDAG(topic) {
  const clean = topic || 'Software Engineering';
  const nodes = [
    {
      id: 'foundations_1',
      label: `${clean} Theoretical Foundations`,
      tier: 'Foundational',
      icon: '📐',
      desc: `Core mathematical principles, mental models, and primary syntax constructs of ${clean}.`,
      prerequisites: [],
      unlocks: ['core_1', 'core_2'],
      estimatedHours: 20,
      keySubtopics: ['Mathematical Axioms', 'Syntax & Primitives', 'Mental Models']
    },
    {
      id: 'foundations_2',
      label: `${clean} Environment & Tooling`,
      tier: 'Foundational',
      icon: '🛠️',
      desc: `Toolchains, compiler pipelines, debugging harnesses, and setup workflows for ${clean}.`,
      prerequisites: [],
      unlocks: ['core_1'],
      estimatedHours: 15,
      keySubtopics: ['Toolchain Setup', 'Runtime Environment', 'Debugging Harnesses']
    },
    {
      id: 'core_1',
      label: `Core ${clean} Mechanics`,
      tier: 'Core',
      icon: '⚡',
      desc: `Primary constructs, state management, standard algorithms, and fundamental problem-solving workflows.`,
      prerequisites: ['foundations_1', 'foundations_2'],
      unlocks: ['advanced_1', 'advanced_2'],
      estimatedHours: 25,
      keySubtopics: ['State Progression', 'Algorithmic Primitives', 'Error Handling']
    },
    {
      id: 'core_2',
      label: `Data Flow & State Systems`,
      tier: 'Core',
      icon: '🔄',
      desc: `Data serialization, asynchronous boundaries, and memory management patterns in ${clean}.`,
      prerequisites: ['foundations_1'],
      unlocks: ['advanced_2'],
      estimatedHours: 25,
      keySubtopics: ['Data Serialization', 'Async Control Flow', 'Memory Patterns']
    },
    {
      id: 'advanced_1',
      label: `Advanced ${clean} Architecture`,
      tier: 'Advanced',
      icon: '💻',
      desc: `High-performance optimizations, concurrency control, distributed interfaces, and scaling patterns.`,
      prerequisites: ['core_1'],
      unlocks: ['mastery_1'],
      estimatedHours: 35,
      keySubtopics: ['Concurrency & Scale', 'Design Trade-offs', 'Performance Profiling']
    },
    {
      id: 'advanced_2',
      label: `Applied Ecosystem & Frameworks`,
      tier: 'Advanced',
      icon: '🔬',
      desc: `Integration with production ecosystem libraries, telemetry instruments, and industry frameworks.`,
      prerequisites: ['core_1', 'core_2'],
      unlocks: ['mastery_1'],
      estimatedHours: 30,
      keySubtopics: ['Production Libraries', 'Telemetry', 'Security Standards']
    },
    {
      id: 'mastery_1',
      label: `Capstone ${clean} Engineering`,
      tier: 'Mastery',
      icon: '🚀',
      desc: `End-to-end autonomous research, specialized algorithms, resilient fault-tolerance, and production deployment.`,
      prerequisites: ['advanced_1', 'advanced_2'],
      unlocks: [],
      estimatedHours: 45,
      keySubtopics: ['Production Capstone', 'Novel Architectures', 'Peer Review']
    }
  ];

  return {
    topic: clean,
    domain: clean,
    overview: `Foundational to mastery prerequisite competency graph for ${clean}.`,
    nodes
  };
}

export default {
  generateCompetencyDAG,
  mapRoadmapToCompetencyDAG
};
