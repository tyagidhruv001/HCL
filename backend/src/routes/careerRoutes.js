import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  parseResume,
  matchCompanies,
  generateApplication,
  getCompaniesList,
} from '../controllers/careerController.js';

const router = express.Router();

// Parse and extract text from uploaded PDF/DOCX/TXT resume
router.post('/parse-resume', protect, parseResume);

// Match candidate against hiring companies
router.post('/match', protect, matchCompanies);

// Generate customized recruiter cold email and cover letter
router.post('/generate-application', protect, generateApplication);

// Get default curated companies list
router.get('/companies', protect, getCompaniesList);

export default router;
