"""
course_ranker.py — Multi-Factor Course Scoring and Recommendation Engine
Ranks courses using skill overlap, difficulty calibration, prerequisite satisfaction, and ratings.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from app.engine.knowledge_graph import SkillNode, knowledge_graph

logger = logging.getLogger(__name__)

COURSES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "courses.json")


class CourseRanker:
    """
    Ranks catalog courses mathematically using weighted multi-objective scoring.
    """

    def __init__(self, courses_path: str = COURSES_PATH):
        self.courses: List[Dict[str, Any]] = []
        self._load_catalog(courses_path)

        # Configurable weight vectors
        self.w_skill_match = 0.40
        self.w_difficulty_fit = 0.20
        self.w_prereq_fit = 0.15
        self.w_rating = 0.15
        self.w_domain_match = 0.10

    def _load_catalog(self, path: str):
        try:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    self.courses = json.load(f)
                logger.info(f"Loaded {len(self.courses)} courses into CourseRanker.")
            else:
                logger.warning(f"Courses dataset not found at {path}")
        except Exception as e:
            logger.error(f"Error loading course catalog: {e}")
            self.courses = []

    def get_all_courses(self) -> List[Dict[str, Any]]:
        return self.courses

    def search_courses(
        self,
        query: Optional[str] = None,
        domain: Optional[str] = None,
        level: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Filters courses by text search, domain, and level."""
        results = self.courses

        if domain and domain.lower() != "all":
            d = domain.lower()
            results = [c for c in results if c.get("domain", "").lower() == d]

        if level and level.lower() != "all":
            lvl = level.lower()
            results = [c for c in results if c.get("level", "").lower() == lvl]

        if query:
            q = query.lower()
            scored = []
            for c in results:
                title = c.get("title", "").lower()
                desc = c.get("description", "").lower()
                tags = [t.lower() for t in c.get("tags", [])]
                skills = [s.lower() for s in c.get("skills", [])]

                match_score = 0
                if q in title:
                    match_score += 5
                if any(q in t for t in tags):
                    match_score += 4
                if any(q in s for s in skills):
                    match_score += 3
                if q in desc:
                    match_score += 1

                if match_score > 0:
                    scored.append((match_score, c))

            scored.sort(key=lambda x: x[0], reverse=True)
            results = [item[1] for item in scored]

        return results[:limit]

    def score_course(
        self,
        course: Dict[str, Any],
        target_skills: List[SkillNode],
        learner_level: str,
        known_skill_ids: List[str],
        preferred_domains: List[str]
    ) -> float:
        """
        Calculates normalized composite score (0.0 to 1.0) for a candidate course.
        """
        course_skills = [s.lower() for s in course.get("skills", [])]
        course_tags = [t.lower() for t in course.get("tags", [])]
        course_domain = course.get("domain", "").lower()
        course_level = course.get("level", "").lower()
        course_rating = float(course.get("rating", 4.5))
        course_prereqs = course.get("prerequisites", [])

        # 1. Skill Match Score (overlap between target skills and course skills/tags)
        target_names = [t.name.lower() for t in target_skills] + [t.id.lower() for t in target_skills]
        for t in target_skills:
            target_names.extend([syn.lower() for syn in t.synonyms])

        skill_overlap_count = 0
        for s in course_skills + course_tags:
            if any(t in s or s in t for t in target_names):
                skill_overlap_count += 1

        skill_match_score = min(1.0, skill_overlap_count / max(1, len(target_skills) or 1))

        # 2. Difficulty Fit
        # Level distance penalty
        levels = {"beginner": 1, "intermediate": 2, "advanced": 3}
        target_lvl_num = levels.get(learner_level.lower(), 1)
        course_lvl_num = levels.get(course_level, 1)
        diff_delta = abs(target_lvl_num - course_lvl_num)
        difficulty_score = max(0.0, 1.0 - (diff_delta * 0.4))

        # 3. Prerequisite Satisfaction
        # Has the learner completed the prerequisite courses or mastered prerequisite skills?
        if not course_prereqs:
            prereq_score = 1.0
        else:
            satisfied = sum(1 for p in course_prereqs if p.lower() in known_skill_ids)
            prereq_score = satisfied / len(course_prereqs)

        # 4. Rating Normalization (4.0 to 5.0 scaled to 0.0 to 1.0)
        rating_score = max(0.0, min(1.0, (course_rating - 4.0) / 1.0))

        # 5. Domain Match
        domain_score = 1.0 if (not preferred_domains or course_domain in [d.lower() for d in preferred_domains]) else 0.4

        # Composite weighted sum
        total_score = (
            self.w_skill_match * skill_match_score +
            self.w_difficulty_fit * difficulty_score +
            self.w_prereq_fit * prereq_score +
            self.w_rating * rating_score +
            self.w_domain_match * domain_score
        )

        return round(total_score, 4)

    def rank_courses_for_skills(
        self,
        target_skills: List[SkillNode],
        learner_level: str = "beginner",
        known_skill_ids: Optional[List[str]] = None,
        preferred_domains: Optional[List[str]] = None,
        limit: int = 4,
        exclude_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Returns the highest scoring courses tailored to target skills."""
        known_skill_ids = [k.lower() for k in (known_skill_ids or [])]
        preferred_domains = preferred_domains or []
        exclude_ids = set(exclude_ids or [])

        scored_courses = []
        for course in self.courses:
            if course.get("id") in exclude_ids:
                continue

            score = self.score_course(
                course=course,
                target_skills=target_skills,
                learner_level=learner_level,
                known_skill_ids=known_skill_ids,
                preferred_domains=preferred_domains
            )
            scored_courses.append((score, course))

        scored_courses.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_courses[:limit]]


# Singleton
course_ranker = CourseRanker()
