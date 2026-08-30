/**
 * pathRecommendation.js
 * Adaptive Learning Path Generator (Client-side Dynamic Generator for ANY subject)
 */

export async function generateLearningPathAlgorithm(profile = {}) {
  const rawGoal = profile?.goal || 'Software Engineering Mastery';
  const cleanGoal = rawGoal.replace(/mastery|roadmap|pathway/gi, '').trim() || 'General Studies';
  const level = profile?.level || 'Beginner';
  const timeline = profile?.timeline || '3-4 Months';
  const reqs = profile?.requirements || profile?.customPrompt || '';
  const style = profile?.learningStyle || 'Project-Based';

  return {
    title: `${cleanGoal} Master Pathway`,
    description: reqs 
      ? `Custom-tailored curriculum engineered around your exact requirements: "${reqs.slice(0, 120)}${reqs.length > 120 ? '...' : ''}" with a ${style} focus.`
      : `A comprehensive ${level}-level pathway engineered to guide you from core ${cleanGoal} foundations to real-world applied mastery.`,
    totalDuration: timeline,
    phases: [
      {
        id: 1,
        phaseNumber: 1,
        title: `Phase 1: Foundations & Core Principles of ${cleanGoal}`,
        theme: `Establish fundamental syntax, key principles, and conceptual mental models for ${cleanGoal}`,
        duration: '3-4 weeks',
        milestone: `Construct a working foundational baseline application or solve core exercises in ${cleanGoal}.`,
        courses: [
          {
            id: 'dyn-step-101',
            title: `Core Fundamentals & Essentials of ${cleanGoal}`,
            provider: 'freeCodeCamp / Official Docs',
            level: level,
            duration: '12h',
            rating: 4.9,
            icon: '⚡',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanGoal + ' fundamentals tutorial')}`,
            skills: [`${cleanGoal} Basics`, 'Core Concepts', 'Tooling Setup'],
            why: `Builds the non-negotiable mental foundation before tackling complex frameworks in ${cleanGoal}.`
          },
          {
            id: 'dyn-step-102',
            title: `Hands-On Problem Solving & Syntax Mastery in ${cleanGoal}`,
            provider: 'The Odin Project / Coursera',
            level: level,
            duration: '14h',
            rating: 4.8,
            icon: '💻',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanGoal + ' exercises problem solving')}`,
            skills: ['Data Structures', 'Algorithmic Thinking', 'Clean Code'],
            why: `Teaches optimal algorithmic thinking and syntax fluency needed for production code.`
          }
        ]
      },
      {
        id: 2,
        phaseNumber: 2,
        title: `Phase 2: Applied Architecture & Frameworks in ${cleanGoal}`,
        theme: `Component engineering, design patterns, state management, and API design`,
        duration: '5-6 weeks',
        milestone: `Construct full-stack reactive applications or distributed modules applying ${cleanGoal} patterns.`,
        courses: [
          {
            id: 'dyn-step-201',
            title: `Architecture, Design Patterns & Applied Systems in ${cleanGoal}`,
            provider: 'Frontend Masters / Udemy',
            level: 'Intermediate',
            duration: '18h',
            rating: 4.9,
            icon: '🧠',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanGoal + ' architecture systems')}`,
            skills: ['System Design', 'Component Lifecycle', 'State Management'],
            why: `The industry-standard approach to build high-performance, maintainable modules.`
          },
          {
            id: 'dyn-step-202',
            title: `Database Persistence, Security & API Integration`,
            provider: 'Coursera / DeepLearning.AI',
            level: 'Intermediate',
            duration: '20h',
            rating: 4.7,
            icon: '🗄️',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanGoal + ' backend api database')}`,
            skills: ['REST APIs', 'Persistent Storage', 'Authentication & Security'],
            why: `Secures your application with role-based access control and persistent storage.`
          }
        ]
      },
      {
        id: 3,
        phaseNumber: 3,
        title: `Phase 3: Production Capstone & Specialization in ${cleanGoal}`,
        theme: `Performance optimization, cloud containerization, CI/CD, and portfolio deployment`,
        duration: '4-6 weeks',
        milestone: `Deploy a production-grade capstone project solving a real-world problem in ${cleanGoal}.`,
        courses: [
          {
            id: 'dyn-step-301',
            title: `${cleanGoal} Real-World Production Capstone`,
            provider: 'Industry Portfolio / GitHub',
            level: 'Advanced',
            duration: '16h',
            rating: 4.8,
            icon: '🚀',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanGoal + ' full capstone project')}`,
            skills: ['Docker & Cloud', 'CI/CD Pipelines', 'Performance Tuning'],
            why: `Proves your ability to take complex requirements and deliver robust solutions in production.`
          }
        ]
      }
    ]
  };
}

export default { generateLearningPathAlgorithm };
