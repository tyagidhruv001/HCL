import api from './api';

const competencyService = {
  // Get DAG for user's active learning pathway (synced with MongoDB)
  getRoadmapDAG: async () => {
    const response = await api.get('/competency/roadmap');
    return response.data;
  },

  // Get user's saved/explored competency graphs from MongoDB
  getSavedGraphs: async () => {
    const response = await api.get('/competency/saved-graphs');
    return response.data;
  },

  // Generate or load custom competency DAG from MongoDB
  generateDAG: async (topic) => {
    const response = await api.post('/competency/generate', { topic });
    return response.data;
  },

  // Mark node as mastered & dynamically unlock downstream dependencies
  markMastered: async (topic, nodeId, score = 100) => {
    const response = await api.post('/competency/mark-mastered', {
      topic,
      nodeId,
      score,
    });
    return response.data;
  },

  // Append a competency node to the active roadmap in MongoDB
  appendNode: async (nodeLabel, nodeDesc, tier) => {
    const response = await api.post('/competency/append-node', {
      nodeLabel,
      nodeDesc,
      tier,
    });
    return response.data;
  },
};

export default competencyService;
