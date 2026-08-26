"""
knowledge_graph.py — LearnAI Skill & Prerequisite Knowledge Graph
Models relationships between skills, prerequisites, domains, and dependency trees.
"""

from typing import Dict, List, Set, Optional
from dataclasses import dataclass, field


@dataclass
class SkillNode:
    id: str
    name: str
    domain: str
    level: str  # beginner, intermediate, advanced
    prerequisites: List[str] = field(default_factory=list)
    enables: List[str] = field(default_factory=list)
    synonyms: List[str] = field(default_factory=list)
    description: str = ""


class PrerequisiteKnowledgeGraph:
    """
    Directed Acyclic Graph (DAG) of technical competencies and prerequisites.
    Enables skill-gap analysis, dependency resolution, and logical ordering of courses.
    """

    def __init__(self):
        self.nodes: Dict[str, SkillNode] = {}
        self._build_default_graph()

    def add_skill(self, node: SkillNode):
        self.nodes[node.id.lower()] = node

    def get_skill(self, skill_id: str) -> Optional[SkillNode]:
        skill_id = skill_id.lower()
        if skill_id in self.nodes:
            return self.nodes[skill_id]
        # Search synonyms
        for node in self.nodes.values():
            if skill_id in [s.lower() for s in node.synonyms]:
                return node
        return None

    def match_skills_from_text(self, text: str) -> List[SkillNode]:
        """Identifies skills mentioned in free-form text (e.g. goals or interests)."""
        text_lower = text.lower()
        matched = []
        for node in self.nodes.values():
            if node.name.lower() in text_lower or node.id.lower() in text_lower:
                matched.append(node)
                continue
            for syn in node.synonyms:
                if syn.lower() in text_lower:
                    matched.append(node)
                    break
        return matched

    def get_all_prerequisites(self, skill_id: str, visited: Optional[Set[str]] = None) -> List[str]:
        """Recursively retrieves all direct and indirect prerequisites for a skill."""
        if visited is None:
            visited = set()

        node = self.get_skill(skill_id)
        if not node:
            return []

        all_prereqs = []
        for prereq in node.prerequisites:
            prereq_id = prereq.lower()
            if prereq_id not in visited:
                visited.add(prereq_id)
                all_prereqs.append(prereq_id)
                all_prereqs.extend(self.get_all_prerequisites(prereq_id, visited))

        return all_prereqs

    def find_missing_prerequisites(self, target_skill_ids: List[str], known_skill_ids: List[str]) -> List[str]:
        """
        Given a list of target skills and what the user already knows,
        returns all missing prerequisite skills in topological dependency order.
        """
        known_set = set(k.lower() for k in known_skill_ids)
        # Also expand known skills to match synonyms
        normalized_known = set()
        for k in known_set:
            node = self.get_skill(k)
            if node:
                normalized_known.add(node.id.lower())
            else:
                normalized_known.add(k)

        needed_prereqs = set()
        for target in target_skill_ids:
            target_node = self.get_skill(target)
            if not target_node:
                continue
            all_p = self.get_all_prerequisites(target_node.id)
            for p in all_p:
                if p not in normalized_known:
                    needed_prereqs.add(p)

        # Sort prerequisites so foundational ones come first
        return self.topological_sort(list(needed_prereqs))

    def topological_sort(self, skill_ids: List[str]) -> List[str]:
        """Sorts skill IDs in dependency order (prerequisites before dependent skills)."""
        skills_set = set(s.lower() for s in skill_ids)
        visited = set()
        temp_visited = set()
        order = []

        def visit(sid: str):
            if sid in temp_visited:
                return  # Cycle break
            if sid not in visited:
                temp_visited.add(sid)
                node = self.get_skill(sid)
                if node:
                    for prereq in node.prerequisites:
                        p_lower = prereq.lower()
                        if p_lower in skills_set:
                            visit(p_lower)
                temp_visited.remove(sid)
                visited.add(sid)
                order.append(sid)

        for sid in skill_ids:
            sid_lower = sid.lower()
            if sid_lower not in visited:
                visit(sid_lower)

        return order

    def _build_default_graph(self):
        """Constructs rich knowledge graph nodes across software domains."""
        skills = [
            # === FOUNDATIONS ===
            SkillNode("programming_basics", "Programming Basics", "core", "beginner",
                      enables=["python", "javascript", "linux_cli"],
                      synonyms=["coding basics", "computer science basics", "programming"]),
            SkillNode("git", "Git & Version Control", "core", "beginner",
                      prerequisites=["programming_basics"],
                      enables=["ci_cd"],
                      synonyms=["github", "version control"]),

            # === WEB DEVELOPMENT ===
            SkillNode("html_css", "HTML & CSS", "web", "beginner",
                      prerequisites=["programming_basics"],
                      enables=["javascript", "ui_design"],
                      synonyms=["html", "css", "html5", "css3", "web design"]),
            SkillNode("javascript", "JavaScript", "web", "beginner",
                      prerequisites=["programming_basics", "html_css"],
                      enables=["react", "nodejs", "typescript"],
                      synonyms=["js", "es6", "vanilla js"]),
            SkillNode("typescript", "TypeScript", "web", "intermediate",
                      prerequisites=["javascript"],
                      enables=["nextjs"],
                      synonyms=["ts", "static typing"]),
            SkillNode("react", "React.js", "web", "intermediate",
                      prerequisites=["javascript", "html_css"],
                      enables=["nextjs", "frontend_architecture"],
                      synonyms=["react", "reactjs", "jsx"]),
            SkillNode("nodejs", "Node.js & Express", "web", "intermediate",
                      prerequisites=["javascript"],
                      enables=["graphql", "fullstack"],
                      synonyms=["node", "express", "backend js"]),
            SkillNode("sql", "SQL & Relational Databases", "core", "beginner",
                      prerequisites=["programming_basics"],
                      enables=["postgresql", "database_design", "data_analysis"],
                      synonyms=["sql", "relational database", "queries"]),
            SkillNode("postgresql", "PostgreSQL & Database Design", "web", "intermediate",
                      prerequisites=["sql"],
                      enables=["backend_architecture"],
                      synonyms=["postgres", "rdbms"]),
            SkillNode("nextjs", "Next.js & SSR", "web", "advanced",
                      prerequisites=["react", "typescript"],
                      enables=["fullstack_production"],
                      synonyms=["next", "next.js", "server components"]),
            SkillNode("graphql", "GraphQL API Design", "web", "advanced",
                      prerequisites=["nodejs"],
                      synonyms=["graphql", "apollo"]),

            # === DATA SCIENCE ===
            SkillNode("python", "Python Programming", "data", "beginner",
                      prerequisites=["programming_basics"],
                      enables=["pandas", "machine_learning", "data_structures"],
                      synonyms=["python3", "py"]),
            SkillNode("pandas", "Data Analysis with Pandas & NumPy", "data", "beginner",
                      prerequisites=["python"],
                      enables=["data_visualization", "applied_statistics", "machine_learning"],
                      synonyms=["pandas", "numpy", "data wrangling", "eda"]),
            SkillNode("statistics", "Applied Statistics & Probability", "data", "intermediate",
                      prerequisites=["python"],
                      enables=["machine_learning", "ab_testing"],
                      synonyms=["stats", "probability", "statistical modeling"]),
            SkillNode("data_visualization", "Data Visualization", "data", "intermediate",
                      prerequisites=["pandas"],
                      enables=["data_storytelling"],
                      synonyms=["matplotlib", "seaborn", "plotly", "tableau"]),

            # === AI & MACHINE LEARNING ===
            SkillNode("machine_learning", "Machine Learning Fundamentals", "ai", "beginner",
                      prerequisites=["python", "pandas", "statistics"],
                      enables=["deep_learning", "scikit_learn", "nlp", "computer_vision"],
                      synonyms=["ml", "supervised learning", "classification", "regression"]),
            SkillNode("scikit_learn", "Practical ML & Scikit-Learn", "ai", "intermediate",
                      prerequisites=["machine_learning"],
                      enables=["feature_engineering", "mlops"],
                      synonyms=["sklearn", "xgboost", "model evaluation"]),
            SkillNode("deep_learning", "Deep Learning & Neural Networks", "ai", "intermediate",
                      prerequisites=["machine_learning"],
                      enables=["transformers", "computer_vision", "generative_ai"],
                      synonyms=["neural networks", "pytorch", "tensorflow", "dl"]),
            SkillNode("transformers", "NLP & Transformers", "ai", "advanced",
                      prerequisites=["deep_learning"],
                      enables=["generative_ai", "rag"],
                      synonyms=["nlp", "bert", "huggingface", "llm"]),
            SkillNode("generative_ai", "Generative AI & LLMs", "ai", "advanced",
                      prerequisites=["transformers"],
                      enables=["rag_architectures", "agentic_ai"],
                      synonyms=["genai", "prompt engineering", "fine-tuning", "llm"]),
            SkillNode("rag", "RAG & Vector Search", "ai", "advanced",
                      prerequisites=["generative_ai", "postgresql"],
                      enables=["agentic_ai"],
                      synonyms=["retrieval augmented generation", "vector db", "embeddings"]),
            SkillNode("mlops", "MLOps & Model Deployment", "ai", "advanced",
                      prerequisites=["scikit_learn", "docker"],
                      synonyms=["mlflow", "model serving", "pipeline orchestration"]),

            # === CLOUD & DEVOPS ===
            SkillNode("linux_cli", "Linux & Bash", "cloud", "beginner",
                      prerequisites=["programming_basics"],
                      enables=["docker", "network_security"],
                      synonyms=["linux", "bash", "shell", "terminal"]),
            SkillNode("docker", "Docker & Containers", "cloud", "intermediate",
                      prerequisites=["linux_cli"],
                      enables=["kubernetes", "ci_cd", "mlops"],
                      synonyms=["containers", "docker compose"]),
            SkillNode("kubernetes", "Kubernetes (K8s)", "cloud", "advanced",
                      prerequisites=["docker"],
                      synonyms=["k8s", "container orchestration"]),
            SkillNode("aws", "AWS Cloud Architecture", "cloud", "intermediate",
                      prerequisites=["linux_cli"],
                      enables=["terraform", "cloud_security"],
                      synonyms=["amazon web services", "ec2", "s3", "lambda"]),
            SkillNode("gcp", "Google Cloud Platform", "cloud", "intermediate",
                      prerequisites=["linux_cli"],
                      synonyms=["google cloud", "bigquery", "cloud run"]),
            SkillNode("ci_cd", "CI/CD & GitHub Actions", "cloud", "intermediate",
                      prerequisites=["git", "docker"],
                      synonyms=["continuous integration", "github actions", "devops"]),
            SkillNode("terraform", "Terraform (IaC)", "cloud", "advanced",
                      prerequisites=["aws"],
                      synonyms=["iac", "infrastructure as code"]),

            # === CYBERSECURITY ===
            SkillNode("security_fundamentals", "Security Fundamentals & CIA Triad", "cyber", "beginner",
                      enables=["network_security", "ethical_hacking"],
                      synonyms=["cyber security", "infosec", "cia triad"]),
            SkillNode("network_security", "Network Security & Protocols", "cyber", "intermediate",
                      prerequisites=["security_fundamentals", "linux_cli"],
                      enables=["penetration_testing"],
                      synonyms=["tcp/ip", "firewalls", "vpn"]),
            SkillNode("penetration_testing", "Ethical Hacking & Penetration Testing", "cyber", "intermediate",
                      prerequisites=["network_security"],
                      enables=["web_security"],
                      synonyms=["ethical hacking", "kali linux", "pentesting"]),
            SkillNode("web_security", "Web Application Security (OWASP)", "cyber", "advanced",
                      prerequisites=["penetration_testing", "javascript"],
                      synonyms=["owasp", "xss", "sqli", "burp suite"]),
            SkillNode("cloud_security", "Cloud Security & Zero Trust", "cyber", "advanced",
                      prerequisites=["security_fundamentals", "aws"],
                      synonyms=["zero trust", "iam security"]),

            # === UI/UX DESIGN ===
            SkillNode("ux_fundamentals", "UX Research & Wireframing", "design", "beginner",
                      enables=["figma", "interaction_design"],
                      synonyms=["ux", "user experience", "user research", "wireframing"]),
            SkillNode("figma", "Figma UI Design", "design", "beginner",
                      prerequisites=["ux_fundamentals"],
                      enables=["design_systems", "interaction_design"],
                      synonyms=["ui", "figma", "prototyping", "visual design"]),
            SkillNode("design_systems", "Design Systems & Component Libraries", "design", "intermediate",
                      prerequisites=["figma"],
                      enables=["product_design"],
                      synonyms=["tokens", "atomic design", "component library"]),
            SkillNode("interaction_design", "Interaction Design & Motion", "design", "intermediate",
                      prerequisites=["figma"],
                      synonyms=["microinteractions", "animation", "motion design"]),
            SkillNode("product_design", "Product Strategy & Leadership", "design", "advanced",
                      prerequisites=["design_systems", "ux_fundamentals"],
                      synonyms=["design strategy", "product design"]),
        ]

        for s in skills:
            self.add_skill(s)

    def export_graph(self) -> Dict[str, Any]:
        """Exports full graph topology for frontend interactive visualizers."""
        nodes = []
        edges = []
        for node in self.nodes.values():
            nodes.append({
                "id": node.id,
                "name": node.name,
                "domain": node.domain,
                "level": node.level,
                "prerequisites": node.prerequisites,
                "enables": node.enables,
                "description": node.description or f"Core competency for {node.name}"
            })
            for p in node.prerequisites:
                edges.append({"source": p, "target": node.id})

        return {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "nodes": nodes,
            "edges": edges
        }


# Global singleton instance
knowledge_graph = PrerequisiteKnowledgeGraph()
