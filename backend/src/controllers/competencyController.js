import CompetencyGraph from '../models/competencyGraph.js';
import Roadmap from '../models/roadmap.js';
import Checkpoint from '../models/checkpoint.js';
import StudySession from '../models/studySession.js';
import User from '../models/user.js';
import {
  generateCompetencyDAG,
  mapRoadmapToCompetencyDAG,
  computeDynamicNodeStates
} from '../services/aiCompetencyService.js';

// ──────────────────────────────────────────────────────────────
// @desc   Get Competency DAG for User's Active Learning Pathway (Synced with MongoDB)
// @route  GET /api/competency/roadmap
// @access Private
// ──────────────────────────────────────────────────────────────
export const getActiveRoadmapDAG = async (req, res) => {
  try {
    const userId = req.user._id;
    const [activeRoadmap, userCheckpoints, userSessions] = await Promise.all([
      Roadmap.findOne({ userId, status: 'ACTIVE' }).sort({ createdAt: -1 }),
      Checkpoint.find({ userId }),
      StudySession.find({ userId }),
    ]);

    if (!activeRoadmap) {
      // Check if user has an existing saved graph in MongoDB
      const existingGraph = await CompetencyGraph.findOne({ userId }).sort({ updatedAt: -1 });
      if (existingGraph) {
        return res.json({
          success: true,
          ...existingGraph.toObject()
        });
      }

      const defaultDAG = await generateCompetencyDAG('Quantum Computing & Computer Science');
      const enriched = computeDynamicNodeStates(defaultDAG.nodes, null, userCheckpoints, userSessions);
      return res.json({
        success: true,
        isDefault: true,
        ...defaultDAG,
        nodes: enriched
      });
    }

    const dag = mapRoadmapToCompetencyDAG(activeRoadmap, userCheckpoints, userSessions);

    // Persist or update in MongoDB CompetencyGraph collection
    const saved = await CompetencyGraph.findOneAndUpdate(
      { userId, topic: dag.topic },
      {
        userId,
        roadmapId: activeRoadmap._id,
        topic: dag.topic,
        domain: dag.domain,
        overview: dag.overview,
        isRoadmapLinked: true,
        nodes: dag.nodes,
        totalNodes: dag.totalNodes,
        masteredNodesCount: dag.masteredNodesCount,
        readinessPercentage: dag.readinessPercentage,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      roadmapId: activeRoadmap._id,
      ...saved.toObject()
    });
  } catch (error) {
    console.error('Get Active Roadmap DAG Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Generate Dynamic Competency DAG for any Topic/Subject & Persist in MongoDB
// @route  POST /api/competency/generate
// @access Private
// ──────────────────────────────────────────────────────────────
export const generateCustomDAG = async (req, res) => {
  try {
    const userId = req.user._id;
    const { topic } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: 'Topic is required to generate competency graph.' });
    }

    const cleanTopic = topic.trim();

    // 1. Check if user already generated and saved this graph in MongoDB
    const cachedGraph = await CompetencyGraph.findOne({
      userId,
      topic: { $regex: new RegExp(`^${cleanTopic}$`, 'i') }
    });

    const [userCheckpoints, userSessions, userRoadmap] = await Promise.all([
      Checkpoint.find({ userId }),
      StudySession.find({ userId }),
      Roadmap.findOne({ userId, status: 'ACTIVE' }).sort({ createdAt: -1 })
    ]);

    if (cachedGraph && cachedGraph.nodes?.length >= 4) {
      // Re-evaluate dynamic states against latest checkpoints
      const recomputedNodes = computeDynamicNodeStates(cachedGraph.nodes, userRoadmap, userCheckpoints, userSessions);
      cachedGraph.nodes = recomputedNodes;
      cachedGraph.masteredNodesCount = recomputedNodes.filter(n => n.status === 'mastered').length;
      cachedGraph.readinessPercentage = Math.round((cachedGraph.masteredNodesCount / recomputedNodes.length) * 100);
      await cachedGraph.save();

      return res.json({
        success: true,
        fromCache: true,
        ...cachedGraph.toObject()
      });
    }

    // 2. Synthesize via AI Service
    const synthesized = await generateCompetencyDAG(cleanTopic);
    const enrichedNodes = computeDynamicNodeStates(synthesized.nodes, userRoadmap, userCheckpoints, userSessions);
    const masteredCount = enrichedNodes.filter(n => n.status === 'mastered').length;
    const readiness = enrichedNodes.length > 0 ? Math.round((masteredCount / enrichedNodes.length) * 100) : 0;

    // 3. Save to MongoDB
    const saved = await CompetencyGraph.findOneAndUpdate(
      { userId, topic: cleanTopic },
      {
        userId,
        roadmapId: userRoadmap?._id || null,
        topic: cleanTopic,
        domain: synthesized.domain || cleanTopic,
        overview: synthesized.overview,
        isRoadmapLinked: false,
        nodes: enrichedNodes,
        totalNodes: enrichedNodes.length,
        masteredNodesCount: masteredCount,
        readinessPercentage: readiness,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      ...saved.toObject()
    });
  } catch (error) {
    console.error('Generate Custom DAG Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Mark Competency Node as Mastered & Dynamically Unlock Downstream Nodes
// @route  POST /api/competency/mark-mastered
// @access Private
// ──────────────────────────────────────────────────────────────
export const markNodeMastered = async (req, res) => {
  try {
    const userId = req.user._id;
    const { topic, nodeId, score } = req.body;

    if (!topic || !nodeId) {
      return res.status(400).json({ message: 'Topic and Node ID are required.' });
    }

    const graph = await CompetencyGraph.findOne({
      userId,
      topic: { $regex: new RegExp(`^${topic}$`, 'i') }
    });

    if (!graph) {
      return res.status(404).json({ message: 'Competency graph not found.' });
    }

    // Update target node
    const targetNode = graph.nodes.find(n => n.id === nodeId);
    if (!targetNode) {
      return res.status(404).json({ message: 'Node not found in graph.' });
    }

    targetNode.status = 'mastered';
    targetNode.masteryScore = score || 100;
    targetNode.verifiedViaCheckpoint = true;
    targetNode.completedAt = new Date();

    // Re-resolve locks on all other nodes
    const masteredIds = new Set(graph.nodes.filter(n => n.status === 'mastered').map(n => n.id));
    graph.nodes.forEach(node => {
      if (node.status === 'mastered') return;
      const prereqs = node.prerequisites || [];
      if (prereqs.length === 0 || prereqs.every(p => masteredIds.has(p))) {
        node.status = 'ready';
      } else {
        node.status = 'locked';
      }
    });

    graph.masteredNodesCount = graph.nodes.filter(n => n.status === 'mastered').length;
    graph.readinessPercentage = Math.round((graph.masteredNodesCount / graph.nodes.length) * 100);
    await graph.save();

    // Also append skill to user's profile in MongoDB
    await User.findByIdAndUpdate(userId, {
      $addToSet: { skills: targetNode.label }
    });

    res.json({
      success: true,
      message: `Competency "${targetNode.label}" verified and marked as Mastered!`,
      graph: graph.toObject()
    });
  } catch (error) {
    console.error('Mark Node Mastered Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Get all saved competency graphs for user
// @route  GET /api/competency/saved-graphs
// @access Private
// ──────────────────────────────────────────────────────────────
export const getSavedGraphs = async (req, res) => {
  try {
    const userId = req.user._id;
    const graphs = await CompetencyGraph.find({ userId }).sort({ updatedAt: -1 }).limit(10);
    res.json({
      success: true,
      graphs
    });
  } catch (error) {
    console.error('Get Saved Graphs Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Pin / Append Competency Node into Active Pathway in MongoDB
// @route  POST /api/competency/append-node
// @access Private
// ──────────────────────────────────────────────────────────────
export const appendNodeToRoadmap = async (req, res) => {
  try {
    const userId = req.user._id;
    const { nodeLabel, nodeDesc, tier } = req.body;

    if (!nodeLabel) {
      return res.status(400).json({ message: 'Node label is required.' });
    }

    const activeRoadmap = await Roadmap.findOne({ userId, status: 'ACTIVE' }).sort({ createdAt: -1 });
    if (!activeRoadmap) {
      return res.status(404).json({ message: 'No active roadmap found to append node.' });
    }

    const day = `Day ${(activeRoadmap.nodes?.length || 0) + 1}`;
    const newNode = {
      day,
      topic: nodeLabel,
      status: 'pending',
      subject: activeRoadmap.goal || 'Engineering',
      color: tier === 'Foundational' ? '#38bdf8' : tier === 'Core' ? '#818cf8' : tier === 'Advanced' ? '#c084fc' : '#34d399'
    };

    activeRoadmap.nodes = [...(activeRoadmap.nodes || []), newNode];
    await activeRoadmap.save();

    res.json({
      success: true,
      message: `"${nodeLabel}" successfully appended to your learning pathway!`,
      roadmap: activeRoadmap
    });
  } catch (error) {
    console.error('Append Node Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export default {
  getActiveRoadmapDAG,
  generateCustomDAG,
  markNodeMastered,
  getSavedGraphs,
  appendNodeToRoadmap
};
