import api from './api';

const careerService = {
  // Parse and extract clean text from uploaded PDF/DOCX/TXT
  parseResume: async (base64Data, fileName) => {
    const response = await api.post('/careers/parse-resume', {
      base64Data,
      fileName,
    });
    return response.data;
  },

  // Match candidate profile and resume against hiring companies
  matchCompanies: async (resumeText = '', customCompanies = null) => {
    const response = await api.post('/careers/match', {
      resumeText,
      customCompanies,
    });
    return response.data;
  },

  // Generate personalized recruiter cold email & tailored cover letter
  generateApplication: async (company, role, companyOverview, resumeText = '') => {
    const response = await api.post('/careers/generate-application', {
      company,
      role,
      companyOverview,
      resumeText,
    });
    return response.data;
  },

  // Get curated companies list
  getCompanies: async () => {
    const response = await api.get('/careers/companies');
    return response.data;
  },
};

export default careerService;
