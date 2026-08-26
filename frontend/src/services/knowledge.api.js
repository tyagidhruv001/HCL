import { api } from './api.js';

export const KnowledgeAPI = {
  /**
   * Retrieves the complete skill prerequisite DAG topology.
   * @param {string} domain - "all" | "web" | "data" | "ai" | "cloud" | "cyber" | "design"
   */
  getSkillGraph: async (domain = 'all') => {
    try {
      const res = await api.get(`/recommendation/skills-graph?domain=${domain}`);
      return res.data;
    } catch (err) {
      console.warn('Backend skill graph API unreachable, calling ML service directly:', err.message);
      // Direct ML service fallback
      try {
        const mlRes = await fetch(`http://localhost:8088/api/skills/graph?domain=${domain}`);
        if (mlRes.ok) {
          const data = await mlRes.json();
          return { data };
        }
      } catch (mlErr) {
        console.warn('ML direct graph failed:', mlErr.message);
      }
      throw err;
    }
  }
};
