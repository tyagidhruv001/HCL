import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

import User from '../models/user.js';
import Roadmap from '../models/roadmap.js';
import Checkpoint from '../models/checkpoint.js';
import {
  matchCandidateWithCompanies,
  generateRecruiterEmail,
  generateCoverLetter,
  DEFAULT_COMPANIES
} from '../services/aiCareerService.js';

// ──────────────────────────────────────────────────────────────
// @desc   Parse and extract clean text from PDF/DOCX/TXT resume
// @route  POST /api/careers/parse-resume
// @access Private
// ──────────────────────────────────────────────────────────────
export const parseResume = async (req, res) => {
  try {
    const { base64Data, fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ message: 'No file data provided' });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    let extractedText = '';
    const lower = (fileName || '').toLowerCase();

    if (lower.endsWith('.pdf')) {
      try {
        const data = await pdf(buffer);
        extractedText = data.text || '';
      } catch (pdfErr) {
        console.warn('Backend pdf-parse fallback to ML engine:', pdfErr.message);
        try {
          const mlResp = await fetch('http://localhost:8001/api/v1/parse_resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64_data: base64Data, file_name: fileName }),
          });
          if (mlResp.ok) {
            const mlData = await mlResp.json();
            extractedText = mlData.text || '';
          }
        } catch (mlErr) {
          console.warn('ML engine resume parser error:', mlErr.message);
        }
      }
    } else {
      extractedText = buffer.toString('utf-8');
    }

    // Clean up excessive whitespace
    const clean = (extractedText || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

    res.json({
      success: true,
      text: clean,
      length: clean.length,
    });
  } catch (error) {
    console.error('Parse Resume Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Match candidate with hiring companies & compute capability score
// @route  POST /api/careers/match
// @access Private
// ──────────────────────────────────────────────────────────────
export const matchCompanies = async (req, res) => {
  try {
    const userId = req.user._id;
    const { resumeText, customCompanies } = req.body;

    // 1. Fetch live user profile and telemetry from MongoDB
    const user = await User.findById(userId);
    const activeRoadmap = await Roadmap.findOne({ userId, status: 'ACTIVE' }).sort({ createdAt: -1 });
    const allCheckpoints = await Checkpoint.find({ userId });

    const avgScore = allCheckpoints.length > 0
      ? Math.round(allCheckpoints.reduce((a, s) => a + s.score, 0) / allCheckpoints.length)
      : user?.checkpointScore || 80;

    const completedNodes = activeRoadmap?.nodes?.filter(n => n.status === 'done') || [];
    const completedPhases = activeRoadmap?.phases?.map(p => p.title).join(', ') || '';

    const userCtx = {
      name: user?.name || 'Developer',
      email: user?.email || '',
      branch: user?.branch || 'Computer Science',
      year: user?.year || '4th Semester',
      education: user?.education || 'GLA University',
      goal: user?.goal || activeRoadmap?.goal || 'Software Engineering',
      skills: user?.skills || 'Data Structures, Web Development, Algorithm Design, Machine Learning',
      about: user?.about || '',
      activeRoadmapTitle: activeRoadmap?.title || activeRoadmap?.goal || 'Full-Stack & Algorithms',
      roadmapCompletionPct: user?.stats?.completionPct || (activeRoadmap?.completedCourseIds?.length ? 35 : 10),
      checkpointScore: avgScore,
      focusHours: user?.totalSwitches ? `${Math.round((user.totalSwitches * 3) / 60)} hrs` : '15+ hrs',
      projects: completedNodes.length > 0
        ? completedNodes.map(n => n.topic).slice(0, 4).join(', ')
        : 'StudySpark Adaptive Education Architecture, Full-Stack Project Deliverables',
      customCompanies: customCompanies || null,
    };

    // 2. Run AI matching
    const result = await matchCandidateWithCompanies(resumeText || '', userCtx);

    res.json({
      success: true,
      userContext: userCtx,
      matches: result.matches || [],
      candidateSummary: result.candidateSummary || {},
    });
  } catch (error) {
    console.error('Match Companies Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Generate personalized cold email & cover letter for a company
// @route  POST /api/careers/generate-application
// @access Private
// ──────────────────────────────────────────────────────────────
export const generateApplication = async (req, res) => {
  try {
    const userId = req.user._id;
    const { company, role, companyOverview, resumeText } = req.body;

    if (!company) {
      return res.status(400).json({ message: 'Company name is required.' });
    }

    const user = await User.findById(userId);
    const activeRoadmap = await Roadmap.findOne({ userId, status: 'ACTIVE' }).sort({ createdAt: -1 });

    const userCtx = {
      name: user?.name || 'Developer',
      email: user?.email || '',
      branch: user?.branch || 'Computer Science',
      education: user?.education || 'GLA University',
      skills: user?.skills || 'Data Structures, JavaScript, Python, React, Node.js',
      projects: activeRoadmap?.nodes?.filter(n => n.status === 'done').map(n => n.topic).join(', ') || 'StudySpark Adaptive AI Engine',
      about: user?.about || '',
      goal: user?.goal || 'Software Engineering',
    };

    const targetRole = role || 'Software Engineer Intern';

    // Generate both Cold Email and Cover Letter in parallel
    const [emailData, coverLetter] = await Promise.all([
      generateRecruiterEmail(company, targetRole, companyOverview, resumeText, userCtx),
      generateCoverLetter(company, targetRole, companyOverview, resumeText, userCtx),
    ]);

    res.json({
      success: true,
      company,
      role: targetRole,
      email: emailData,
      coverLetter,
    });
  } catch (error) {
    console.error('Generate Application Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Get default curated companies list
// @route  GET /api/careers/companies
// @access Private
// ──────────────────────────────────────────────────────────────
export const getCompaniesList = async (req, res) => {
  try {
    res.json({
      success: true,
      companies: DEFAULT_COMPANIES,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  parseResume,
  matchCompanies,
  generateApplication,
  getCompaniesList,
};
