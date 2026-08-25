"""
roadmap_generator.py — Dynamic Learning Path & Curriculum Generator
Combines Knowledge Graph, Skill Gap Analysis, and Multi-Factor Course Ranking to synthesize full roadmaps.
"""

from typing import Dict, Any, List, Optional
from app.engine.knowledge_graph import knowledge_graph
from app.engine.skill_gap import skill_gap_analyzer, SkillGapReport
from app.engine.course_ranker import course_ranker
from app.models.schemas import RecommendationOutput, CoursePhaseOutput


class RoadmapGenerator:
    """
    Synthesizes custom 3-phase curricula based on algorithmic gap analysis.
    """

    def __init__(self, kg=knowledge_graph, analyzer=skill_gap_analyzer, ranker=course_ranker):
        self.kg = kg
        self.analyzer = analyzer
        self.ranker = ranker

    def generate(
        self,
        name: str,
        goal: str,
        level: str = "beginner",
        interests: Optional[List[str]] = None,
        timeline: Optional[str] = "3 months",
        current_skills: Optional[List[str]] = None
    ) -> RecommendationOutput:
        interests = interests or []
        current_skills = current_skills or []

        # 1. Perform Skill Gap Analysis
        gap_report: SkillGapReport = self.analyzer.analyze(
            name=name,
            goal=goal,
            level=level,
            interests=interests,
            current_skills=current_skills,
            timeline=timeline
        )

        known_ids = [k.id for k in gap_report.known_skills]
        selected_course_ids = set()

        # 2. Select Courses for Phase 1 (Foundations & Prerequisites)
        p1_courses = self.ranker.rank_courses_for_skills(
            target_skills=gap_report.phase_1_skills or gap_report.target_skills[:2],
            learner_level="beginner",
            known_skill_ids=known_ids,
            preferred_domains=interests,
            limit=2,
            exclude_ids=list(selected_course_ids)
        )
        for c in p1_courses:
            selected_course_ids.add(c.get("id"))

        # 3. Select Courses for Phase 2 (Core Practical Applications)
        p2_courses = self.ranker.rank_courses_for_skills(
            target_skills=gap_report.phase_2_skills or gap_report.target_skills,
            learner_level="intermediate" if level != "advanced" else "advanced",
            known_skill_ids=known_ids + list(selected_course_ids),
            preferred_domains=interests,
            limit=2,
            exclude_ids=list(selected_course_ids)
        )
        for c in p2_courses:
            selected_course_ids.add(c.get("id"))

        # 4. Select Courses for Phase 3 (Advanced Capstone / Specialization)
        p3_courses = self.ranker.rank_courses_for_skills(
            target_skills=gap_report.phase_3_skills or gap_report.target_skills,
            learner_level="advanced",
            known_skill_ids=known_ids + list(selected_course_ids),
            preferred_domains=interests,
            limit=2,
            exclude_ids=list(selected_course_ids)
        )
        for c in p3_courses:
            selected_course_ids.add(c.get("id"))

        # 5. Build Human-Readable Themes and Milestones
        p1_skill_names = ", ".join(s.name for s in gap_report.phase_1_skills) or "Core Fundamentals"
        p2_skill_names = ", ".join(s.name for s in gap_report.phase_2_skills) or "Practical Frameworks"
        p3_skill_names = ", ".join(s.name for s in gap_report.phase_3_skills) or "Advanced Systems & Capstone"

        phases = [
            CoursePhaseOutput(
                id=1,
                title="Phase 1: Foundation & Core Principles",
                theme=f"Build solid fundamentals in: {p1_skill_names}",
                duration="4 weeks",
                milestone="Master syntax, core paradigms, and complete initial environment setup & exercises",
                courses=p1_courses
            ),
            CoursePhaseOutput(
                id=2,
                title="Phase 2: Practical Applications & Engineering",
                theme=f"Build production-grade applications with: {p2_skill_names}",
                duration="6 weeks",
                milestone="Construct standalone functional projects and master ecosystem tooling",
                courses=p2_courses
            ),
            CoursePhaseOutput(
                id=3,
                title="Phase 3: Advanced Specialization & Capstone",
                theme=f"Architect scalable systems and capstone work: {p3_skill_names}",
                duration="6 weeks",
                milestone="Deploy an end-to-end portfolio capstone ready for technical interviews and production",
                courses=p3_courses
            )
        ]

        title = f"AI Learning Path for {name}"
        desc = (
            f"Personalized {gap_report.estimated_weeks}-week curriculum targeted for: \"{goal}\". "
            f"Baseline readiness: {gap_report.readiness_percentage}%."
        )

        return RecommendationOutput(
            title=title,
            description=desc,
            totalDuration=timeline or f"{gap_report.estimated_weeks} weeks",
            phases=phases
        )


# Singleton
roadmap_generator = RoadmapGenerator()
