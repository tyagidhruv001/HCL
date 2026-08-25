"""
registry.py — Tool Registry and Dispatcher for LearnAI Agent
Registers tools, exports standard JSON schemas, and dispatches calls safely.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from app.tools.base import Tool
from app.tools.external_tools import search_youtube, search_web
from app.tools.domain_tools import (
    search_courses,
    get_user_profile,
    get_user_progress,
    get_current_roadmap,
    generate_roadmap,
    create_daily_plan,
    explain_topic,
    propose_roadmap_action,
)

logger = logging.getLogger(__name__)


class ToolRegistry:
    """
    Central repository of all tools exposed to the agent.
    """

    def __init__(self):
        self._tools: Dict[str, Tool] = {}
        self._register_default_tools()

    def register(self, tool: Tool):
        self._tools[tool.name] = tool
        logger.info(f"Registered tool: {tool.name}")

    def get_tool(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def get_all_schemas(self) -> List[Dict[str, Any]]:
        """Returns JSON schema definitions for all registered tools."""
        return [tool.to_schema() for tool in self._tools.values()]

    def execute_tool(self, name: str, arguments: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Any:
        tool = self.get_tool(name)
        if not tool:
            return {"error": f"Tool '{name}' not found."}

        try:
            # Inject context (like auth_header or user_id) if tool accepts it
            call_args = dict(arguments)
            if context:
                if "auth_header" in context and "auth_header" not in call_args:
                    call_args["auth_header"] = context.get("auth_header")
                if "user_id" in context and "user_id" not in call_args:
                    call_args["user_id"] = context.get("user_id")

            # Filter arguments to match function signature
            import inspect
            sig = inspect.signature(tool.func)
            valid_args = {k: v for k, v in call_args.items() if k in sig.parameters}

            logger.info(f"Executing tool: {name} with args: {valid_args}")
            return tool.func(**valid_args)
        except Exception as e:
            logger.error(f"Error executing tool '{name}': {e}")
            return {"error": str(e)}

    def _register_default_tools(self):
        # 1. YouTube Search Tool
        self.register(Tool(
            name="search_youtube",
            description="Searches YouTube for high-quality educational video tutorials, full courses, and crash courses.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search keywords, e.g. 'Java multithreading beginner tutorial'"},
                    "max_results": {"type": "integer", "description": "Maximum video results (default 4)", "default": 4}
                },
                "required": ["query"]
            },
            func=search_youtube
        ))

        # 2. Web Search Tool
        self.register(Tool(
            name="search_web",
            description="Performs an educational web search for documentation, articles, guides, and tutorials.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query keywords, e.g. 'Next.js App Router server actions'"},
                    "max_results": {"type": "integer", "description": "Maximum article results (default 4)", "default": 4}
                },
                "required": ["query"]
            },
            func=search_web
        ))

        # 3. Search Courses Tool
        self.register(Tool(
            name="search_courses",
            description="Searches the verified LearnAI course catalog by keyword, domain (web, data, ai, cloud, cyber, design), or level.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Optional keyword to search in title, tags, or description"},
                    "domain": {"type": "string", "description": "Target domain: web, data, ai, cloud, cyber, design, or all", "default": "all"},
                    "level": {"type": "string", "description": "Difficulty: beginner, intermediate, advanced, or all", "default": "all"},
                    "limit": {"type": "integer", "description": "Max results to return", "default": 5}
                }
            },
            func=search_courses
        ))

        # 4. User Profile Tool
        self.register(Tool(
            name="get_user_profile",
            description="Retrieves the learner's profile, including their primary goal, current experience level, and domain interests.",
            parameters={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "Optional user ID"}
                }
            },
            func=get_user_profile
        ))

        # 5. User Progress Tool
        self.register(Tool(
            name="get_user_progress",
            description="Retrieves the learner's active progress: completed course IDs, bookmarked courses, and study streak.",
            parameters={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "Optional user ID"}
                }
            },
            func=get_user_progress
        ))

        # 6. Current Roadmap Tool
        self.register(Tool(
            name="get_current_roadmap",
            description="Fetches the learner's active 3-phase curriculum, showing assigned courses, milestones, and status.",
            parameters={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "Optional user ID"}
                }
            },
            func=get_current_roadmap
        ))

        # 7. Generate Roadmap Tool
        self.register(Tool(
            name="generate_roadmap",
            description="Uses the ML Recommendation Engine and Knowledge Graph to generate a structured 3-phase learning path.",
            parameters={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Learner name"},
                    "goal": {"type": "string", "description": "Primary learning goal, e.g. 'Become an AI Engineer'"},
                    "level": {"type": "string", "description": "Experience level (beginner, intermediate, advanced)", "default": "beginner"},
                    "interests": {"type": "array", "items": {"type": "string"}, "description": "List of domain interests"},
                    "timeline": {"type": "string", "description": "Target timeline, e.g. '3 months'", "default": "3 months"}
                },
                "required": ["name", "goal"]
            },
            func=generate_roadmap
        ))

        # 8. Create Daily Study Plan Tool
        self.register(Tool(
            name="create_daily_plan",
            description="Creates a customized, time-boxed study schedule based on the learner's available hours for today.",
            parameters={
                "type": "object",
                "properties": {
                    "available_hours": {"type": "number", "description": "Hours available to study today, e.g. 1.5, 2, or 3"},
                    "current_focus": {"type": "string", "description": "The specific subject or topic to focus on today"}
                },
                "required": ["available_hours"]
            },
            func=create_daily_plan
        ))

        # 9. Explain Topic Tool
        self.register(Tool(
            name="explain_topic",
            description="Provides a structured pedagogical explanation of a computer science topic with prerequisites and analogies.",
            parameters={
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "The topic or concept to explain, e.g. 'recursion', 'transformers'"},
                    "user_level": {"type": "string", "description": "Learner level: beginner, intermediate, or advanced", "default": "beginner"}
                },
                "required": ["topic"]
            },
            func=explain_topic
        ))

        # 10. Propose Roadmap Action Tool
        self.register(Tool(
            name="propose_roadmap_action",
            description="Proposes adding or removing a course from the learner's roadmap. Requires Spring Boot backend validation.",
            parameters={
                "type": "object",
                "properties": {
                    "action": {"type": "string", "description": "Action type: ADD_COURSE or REMOVE_COURSE", "enum": ["ADD_COURSE", "REMOVE_COURSE"]},
                    "course_id": {"type": "string", "description": "The course ID (e.g. 'a02', 'w03')"},
                    "reason": {"type": "string", "description": "Explanation of why this change is recommended"},
                    "phase_id": {"type": "integer", "description": "Target phase (1, 2, or 3)", "default": 2}
                },
                "required": ["action", "course_id", "reason"]
            },
            func=propose_roadmap_action
        ))


# Global registry singleton
tool_registry = ToolRegistry()
