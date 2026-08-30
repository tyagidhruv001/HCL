import dotenv from 'dotenv';
dotenv.config();
import { generateJSON, generateText } from './geminiService.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// ── Default curated industry companies ────────────────────────────────
export const DEFAULT_COMPANIES = [
  { name: 'Google', role: 'Software Engineer Intern', domain: 'Distributed Systems & Cloud', icon: '🌐', careersUrl: 'https://careers.google.com/jobs/results/?q=software+engineer' },
  { name: 'Microsoft', role: 'AI & Cloud Engineer Intern', domain: 'Cloud & AI Infrastructure', icon: '💻', careersUrl: 'https://careers.microsoft.com/v2/global/en/home.html' },
  { name: 'NVIDIA', role: 'Accelerated Computing & AI Intern', domain: 'High Performance Computing & GPU', icon: '⚡', careersUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite' },
  { name: 'Adobe', role: 'Machine Learning & Media Intern', domain: 'Creative Cloud & ML Systems', icon: '🎨', careersUrl: 'https://www.adobe.com/careers.html' },
  { name: 'Amazon', role: 'Software Development Engineer (SDE)', domain: 'E-commerce & AWS', icon: '📦', careersUrl: 'https://www.amazon.jobs/en/job_categories/software-development' },
  { name: 'Stripe', role: 'Full Stack Infrastructure Engineer', domain: 'Financial Infrastructure & APIs', icon: '💳', careersUrl: 'https://stripe.com/jobs' },
  { name: 'Uber', role: 'Backend Systems & Platform Engineer', domain: 'Mobility & Real-Time Logistics', icon: '🚗', careersUrl: 'https://www.uber.com/careers' },
  { name: 'Atlassian', role: 'Full Stack Developer', domain: 'Collaboration & Productivity Cloud', icon: '🚀', careersUrl: 'https://www.atlassian.com/company/careers' },
];

/**
 * Match a candidate's resume + StudySpark learning telemetry against top companies.
 */
export async function matchCandidateWithCompanies(resumeText = '', userCtx = {}) {
  const cleanResume = (resumeText || '').replace(/\s+/g, ' ').slice(0, 1500);
  const candidateBio = `Candidate: ${userCtx.name || 'Developer'} (${userCtx.branch || 'CSE'}, ${userCtx.education || 'Univ'}) | Goal: ${userCtx.goal || 'SWE'} | Skills: ${userCtx.skills || 'DSA, WebDev, ML'} | Pathway: ${userCtx.activeRoadmapTitle || 'Advanced CS'} (${userCtx.roadmapCompletionPct || 0}% done) | Diagnostic Score: ${userCtx.checkpointScore || 85}% | Projects: ${userCtx.projects || 'StudySpark Full-Stack Platform'} | Resume: ${cleanResume || 'Verified StudySpark Profile'}`;

  const companiesList = userCtx.customCompanies && userCtx.customCompanies.length > 0
    ? userCtx.customCompanies
    : DEFAULT_COMPANIES;

  // 1. PRIMARY: Groq High-Speed LLM (JSON Mode)
  if (GROQ_API_KEY) {
    try {
      console.log(`[Career AI] Matching candidate against ${companiesList.length} companies via Groq (${GROQ_MODEL})...`);
      const prompt = `You are a Technical Recruiter in StudySpark.
Evaluate this candidate against target companies:
${candidateBio}

Target Companies:
${JSON.stringify(companiesList.map(c => ({ name: c.name, role: c.role, domain: c.domain })))}

Return a pure JSON object:
{
  "matches": [
    {
      "company": "Google",
      "targetRole": "Software Engineer Intern",
      "matchScore": 88,
      "tier": "Strong Match",
      "companyOverview": "Global leader in distributed systems.",
      "whyYouMatch": "Strong algorithms proficiency and full-stack projects.",
      "missingSkills": ["Distributed Systems"],
      "recommendedNextStep": "Complete the Phase 2 milestone project.",
      "careersUrl": "https://careers.google.com",
      "icon": "🌐"
    }
  ],
  "candidateSummary": {
    "readinessTier": "Industry Ready",
    "topStrengths": ["DSA", "Full-Stack", "Consistency"],
    "overallReadinessScore": 85,
    "growthAdvice": "Focus on high-scale architecture and deployment."
  }
}
Sort matches by matchScore descending. Output ONLY valid JSON.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.35,
          response_format: { type: 'json_object' }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);
        if (parsed.matches && Array.isArray(parsed.matches) && parsed.matches.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn(`[Career AI] Groq match error:`, err.message);
    }
  }

  // 2. SECONDARY: Gemini 2.5 Flash
  try {
    const geminiPrompt = `Evaluate candidate (${candidateBio}) against: ${JSON.stringify(companiesList.map(c => c.name))}. Return JSON: { "matches": [{ "company": "Google", "targetRole": "SWE Intern", "matchScore": 85, "tier": "Strong Match", "companyOverview": "...", "whyYouMatch": "...", "missingSkills": ["Cloud"], "recommendedNextStep": "...", "careersUrl": "https://careers.google.com", "icon": "🌐" }], "candidateSummary": { "readinessTier": "High Potential", "topStrengths": ["DSA"], "overallReadinessScore": 82, "growthAdvice": "..." } }`;
    const result = await generateJSON(geminiPrompt, { maxOutputTokens: 2048 });
    if (result?.matches && Array.isArray(result.matches) && result.matches.length > 0) {
      return result;
    }
  } catch (geminiErr) {
    console.warn(`[Career AI] Gemini fallback error:`, geminiErr.message);
  }

  // 3. FALLBACK: Algorithmic Synthesizer
  return synthesizeDefaultMatches(companiesList, userCtx);
}

/**
 * Generate a personalized recruiter cold email citing the candidate's real projects & skills.
 */
export async function generateRecruiterEmail(company, role, companyOverview, resumeText, userCtx = {}) {
  const prompt = `You are an elite career strategist.
Candidate Profile:
Name: ${userCtx.name || 'Developer'}
Education: ${userCtx.branch || 'Computer Science'} · ${userCtx.education || 'University'}
Skills: ${userCtx.skills || 'Data Structures, React, Node.js, Python, Distributed Systems'}
Active Projects: ${userCtx.projects || 'Adaptive AI Learning Platform, Cloud Architecture'}
Resume / Experience Snippets:
${resumeText ? resumeText.slice(0, 2000) : userCtx.about || ''}

Target Company: ${company}
Target Role: ${role}
Company Context: ${companyOverview || 'Leading technology and engineering organization.'}

Write a highly personalized, compelling internship / job application email to a technical recruiter or engineering hiring manager at ${company}.

Requirements:
- Subject line must be punchy, relevant, and professional.
- Mention ${company} by name and why their engineering culture/mission excites the candidate.
- Highlight candidate's strongest technical skills and specific hands-on projects.
- Explain why the candidate is a strong fit for the ${role}.
- Keep it concise (130-170 words).
- Natural, confident, professional human tone (avoid robotic clichés).

Return EXACTLY in this format:
Subject: [Subject line here]

Body:
[Email body here]`;

  try {
    const text = await generateText(prompt, { temperature: 0.65 });
    return parseEmailResponse(text, company, role, userCtx);
  } catch (err) {
    return {
      subject: `Application for ${role} — ${userCtx.name || 'Software Developer'}`,
      body: `Hi Recruiting Team,\n\nI am writing to express my strong interest in the ${role} position at ${company}. Having followed ${company}'s work in scalable systems, I am excited about the opportunity to contribute.\n\nWith a background in ${userCtx.branch || 'Computer Science'} and hands-on experience building ${userCtx.projects || 'modern full-stack applications and algorithmic systems'}, I have developed strong proficiency in ${userCtx.skills || 'core engineering fundamentals'}.\n\nI would welcome the opportunity to discuss how my skill set aligns with ${company}'s engineering goals.\n\nBest regards,\n${userCtx.name || 'Applicant'}`
    };
  }
}

/**
 * Generate a professional tailored cover letter.
 */
export async function generateCoverLetter(company, role, companyOverview, resumeText, userCtx = {}) {
  const prompt = `Write a tailored, professional one-page cover letter for:
Candidate: ${userCtx.name || 'Developer'} (${userCtx.email || ''})
Education: ${userCtx.branch || 'Computer Science'} · ${userCtx.education || 'University'}
Skills: ${userCtx.skills || 'DSA, Full-Stack Development, AI Systems'}
Projects: ${userCtx.projects || 'StudySpark Adaptive Education Platform'}
Target Company: ${company}
Target Role: ${role}
Company Context: ${companyOverview || 'Industry leading technology company'}
Resume: ${resumeText ? resumeText.slice(0, 2000) : ''}

Requirements:
- Professional standard cover letter format with date and greeting.
- 3 clear paragraphs: Introduction & Enthusiasm, Core Technical Achievements & Projects, Value Contribution & Call to Action.
- Under 320 words.`;

  try {
    return await generateText(prompt, { temperature: 0.6 });
  } catch (err) {
    return `Dear Hiring Team at ${company},\n\nI am writing to express my enthusiastic interest in the ${role} role at ${company}. As a developer specializing in ${userCtx.skills || 'software engineering and problem solving'}, I have consistently sought opportunities to build high-impact, scalable solutions.\n\nDuring my academic and project work, I have architected ${userCtx.projects || 'end-to-end applications and optimized algorithmic pipelines'}. My experience has reinforced my ability to quickly master new technologies, collaborate effectively, and deliver robust software.\n\n${company}'s commitment to innovation aligns perfectly with my career aspirations. I am eager to bring my technical skills and problem-solving mindset to your engineering team.\n\nSincerely,\n${userCtx.name || 'Developer'}`;
  }
}

function parseEmailResponse(rawText, company, role, userCtx) {
  let subject = `Application for ${role} — ${userCtx.name || 'Software Developer'}`;
  let body = rawText;

  const subMatch = rawText.match(/Subject:\s*(.*)/i);
  if (subMatch && subMatch[1]) {
    subject = subMatch[1].trim();
  }

  const bodyMatch = rawText.replace(/Subject:.*?\n/i, '').replace(/Body:\s*/i, '').trim();
  if (bodyMatch) {
    body = bodyMatch;
  }

  return { subject, body };
}

function synthesizeDefaultMatches(companiesList, userCtx) {
  const userScore = userCtx.checkpointScore || 80;
  const matches = companiesList.map((c, i) => {
    const matchScore = Math.min(96, Math.max(65, userScore + (10 - i * 3)));
    return {
      company: c.name,
      targetRole: c.role,
      matchScore,
      tier: matchScore >= 85 ? 'Strong Match' : matchScore >= 75 ? 'Moderate Match' : 'Stretch Goal',
      companyOverview: `${c.name} is a global leader in ${c.domain}, engineering scalable distributed platforms.`,
      whyYouMatch: `Your verified background in ${userCtx.goal || 'Software Engineering'} and hands-on projects provide strong alignment with ${c.name}'s engineering standards.`,
      missingSkills: ['System Design at Scale', 'Production Monitoring'],
      recommendedNextStep: `Complete Phase 2 milestone project and practice concurrency in Focus Studio.`,
      careersUrl: c.careersUrl || `https://www.google.com/search?q=${encodeURIComponent(c.name + ' careers')}`,
      icon: c.icon || '💼'
    };
  });

  return {
    matches,
    candidateSummary: {
      readinessTier: userScore >= 80 ? 'Industry Ready' : 'High Potential',
      topStrengths: ['Data Structures & Algorithms', 'Core Architecture', 'Consistency'],
      overallReadinessScore: userScore,
      growthAdvice: 'Focus on completing end-to-end full-stack projects and practicing checkpoint diagnostic assessments.'
    }
  };
}

export default {
  matchCandidateWithCompanies,
  generateRecruiterEmail,
  generateCoverLetter,
  DEFAULT_COMPANIES
};
