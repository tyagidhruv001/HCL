"""
skill_gap.py — Skill Gap Analysis Engine
Evaluates learner's current skills vs target career goals and decomposes missing competencies.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from app.engine.knowledge_graph import knowledge_graph, SkillNode


@dataclass
class SkillGapReport:
    learner_name: str
    goal: str
    level: str
    target_skills: List[SkillNode] = field(default_factory=list)
    known_skills: List[SkillNode] = field(default_factory=list)
    missing_prerequisites: List[SkillNode] = field(default_factory=list)
    phase_1_skills: List[SkillNode] = field(default_factory=list)
    phase_2_skills: List[SkillNode] = field(default_factory=list)
    phase_3_skills: List[SkillNode] = field(default_factory=list)
    readiness_percentage: int = 0
    estimated_weeks: int = 12


class SkillGapAnalyzer:
    """
    Analyzes gap between learner's current baseline and target goal competencies.
    """

    def __init__(self, kg=knowledge_graph):
        self.kg = kg

    def analyze(
        self,
        name: str,
        goal: str,
        level: str = "beginner",
        interests: Optional[List[str]] = None,
        current_skills: Optional[List[str]] = None,
        timeline: Optional[str] = "3 months"
    ) -> SkillGapReport:
        interests = interests or []
        current_skills = current_skills or []
        level = (level or "beginner").lower()

        # 1. Resolve known skills
        known_nodes: List[SkillNode] = []
        for sk in current_skills:
            node = self.kg.get_skill(sk)
            if node and node not in known_nodes:
                known_nodes.append(node)

        # 2. Identify target skills from goal and domain interests
        target_nodes: List[SkillNode] = []
        goal_matched = self.kg.match_skills_from_text(goal)
        for node in goal_matched:
            if node not in target_nodes:
                target_nodes.append(node)

        # Match from interests
        for interest in interests:
            interest_matched = self.kg.match_skills_from_text(interest)
            for node in interest_matched:
                if node not in target_nodes:
                    target_nodes.append(node)

        # If no explicit skills matched from text, map common goals to core domain tracks
        if not target_nodes:
            target_nodes = self._fallback_target_nodes(goal, interests)

        # 3. Find missing prerequisites via Knowledge Graph
        known_ids = [k.id for k in known_nodes]
        target_ids = [t.id for t in target_nodes]
        
        missing_prereq_ids = self.kg.find_missing_prerequisites(target_ids, known_ids)
        missing_prereq_nodes = [self.kg.get_skill(pid) for pid in missing_prereq_ids if self.kg.get_skill(pid)]

        # Combine all required skills needing mastery
        all_required_nodes = []
        for node in missing_prereq_nodes:
            if node not in known_nodes and node not in all_required_nodes:
                all_required_nodes.append(node)
        for node in target_nodes:
            if node not in known_nodes and node not in all_required_nodes:
                all_required_nodes.append(node)

        # 4. Partition skills across a 3-Phase Progression:
        # Phase 1: Missing prerequisites + Beginner fundamental skills
        # Phase 2: Intermediate core skills + Hands-on framework skills
        # Phase 3: Advanced specializations + Capstone / MLOps / System design
        phase_1: List[SkillNode] = []
        phase_2: List[SkillNode] = []
        phase_3: List[SkillNode] = []

        for node in all_required_nodes:
            if node.level == "beginner" or node in missing_prereq_nodes:
                if node.level != "advanced":
                    phase_1.append(node)
                else:
                    phase_2.append(node)
            elif node.level == "intermediate":
                phase_2.append(node)
            else:
                phase_3.append(node)

        # Ensure balanced distribution across phases
        if not phase_1 and all_required_nodes:
            phase_1.append(all_required_nodes[0])
        if not phase_2:
            remaining = [n for n in all_required_nodes if n not in phase_1 and n not in phase_3]
            if remaining:
                phase_2.extend(remaining)
            elif phase_1 and len(phase_1) > 1:
                phase_2.append(phase_1.pop())

        # 5. Compute readiness metric
        total_skills_count = len(known_nodes) + len(all_required_nodes)
        readiness = int((len(known_nodes) / max(total_skills_count, 1)) * 100)

        # Estimate timeline in weeks
        weeks = 12
        if "6" in (timeline or ""):
            weeks = 24
        elif "1" in (timeline or "") and "year" in (timeline or "").lower():
            weeks = 52

        return SkillGapReport(
            learner_name=name,
            goal=goal,
            level=level,
            target_skills=target_nodes,
            known_skills=known_nodes,
            missing_prerequisites=missing_prereq_nodes,
            phase_1_skills=phase_1,
            phase_2_skills=phase_2,
            phase_3_skills=phase_3,
            readiness_percentage=readiness,
            estimated_weeks=weeks
        )

    def _fallback_target_nodes(self, goal: str, interests: List[str]) -> List[SkillNode]:
        """Provides default domain tracks if goal parsing yields sparse keywords."""
        goal_lower = (goal + " " + " ".join(interests)).lower()
        if any(w in goal_lower for w in ["ai", "machine learning", "data scientist", "deep learning"]):
            return [
                self.kg.get_skill("python"),
                self.kg.get_skill("pandas"),
                self.kg.get_skill("machine_learning"),
                self.kg.get_skill("deep_learning"),
                self.kg.get_skill("generative_ai")
            ]
        elif any(w in goal_lower for w in ["web", "frontend", "fullstack", "react", "backend"]):
            return [
                self.kg.get_skill("html_css"),
                self.kg.get_skill("javascript"),
                self.kg.get_skill("react"),
                self.kg.get_skill("nodejs"),
                self.kg.get_skill("nextjs")
            ]
        elif any(w in goal_lower for w in ["cloud", "devops", "aws", "docker", "kubernetes"]):
            return [
                self.kg.get_skill("linux_cli"),
                self.kg.get_skill("docker"),
                self.kg.get_skill("aws"),
                self.kg.get_skill("ci_cd"),
                self.kg.get_skill("kubernetes")
            ]
        elif any(w in goal_lower for w in ["cyber", "security", "hacking", "pentest"]):
            return [
                self.kg.get_skill("security_fundamentals"),
                self.kg.get_skill("network_security"),
                self.kg.get_skill("penetration_testing"),
                self.kg.get_skill("web_security")
            ]
        elif any(w in goal_lower for w in ["design", "ux", "ui", "figma"]):
            return [
                self.kg.get_skill("ux_fundamentals"),
                self.kg.get_skill("figma"),
                self.kg.get_skill("design_systems"),
                self.kg.get_skill("interaction_design")
            ]
        # General default: fullstack programming
        return [
            self.kg.get_skill("programming_basics"),
            self.kg.get_skill("javascript"),
            self.kg.get_skill("python"),
            self.kg.get_skill("react")
        ]


# Singleton
skill_gap_analyzer = SkillGapAnalyzer()
