"""
orchestrator.py — LearnAI Agent Orchestrator & Multi-Turn Tool Execution Loop
Manages conversational reasoning, tool calling, action authorization proposals, and response synthesis.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from app.tools.registry import tool_registry
from app.agent.llm_client import llm_client
from app.models.schemas import AgentChatOutput

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are LearnAI's Autonomous Learning Agent.
You assist learners with personalized guidance, tailored study schedules, course recommendations, and roadmap navigation.

You have access to a rich suite of tools:
- search_youtube: Searches video tutorials (cached)
- search_web: Finds educational documentation and articles (cached)
- search_courses: Queries verified LearnAI course catalog
- get_user_profile: Retrieves learner background and goals
- get_user_progress: Checks completed courses and streaks
- get_current_roadmap: Inspects active 3-phase curriculum
- generate_roadmap: Synthesizes new learning paths via ML
- create_daily_plan: Builds time-boxed study schedules
- explain_topic: Delivers structured pedagogical topic breakdowns
- propose_roadmap_action: Proposes adding/removing roadmap items (requires backend validation)

Instructions:
1. Always use tools to retrieve authoritative data rather than guessing or hallucinating facts.
2. Present answers in a clear, encouraging, mentor-like tone with markdown formatting.
3. If proposing roadmap changes, use propose_roadmap_action so the Spring Boot backend can authorize it.
"""


class AgentOrchestrator:
    """
    Coordinates multi-turn reasoning loops between the LLM and the tool execution registry.
    """

    def __init__(self, registry=tool_registry, client=llm_client):
        self.registry = registry
        self.client = client

    def run_agent_loop(
        self,
        user_message: str,
        history: Optional[List[Dict[str, str]]] = None,
        context: Optional[Dict[str, Any]] = None,
        api_key: Optional[str] = None,
        max_turns: int = 4
    ) -> AgentChatOutput:
        history = history or []
        context = context or {}

        # Prepare messages
        messages: List[Dict[str, Any]] = []
        for h in history:
            role = "assistant" if h.get("role") in ["assistant", "model", "bot"] else "user"
            messages.append({"role": role, "content": h.get("content", "")})

        messages.append({"role": "user", "content": user_message})

        tools_schemas = self.registry.get_all_schemas()
        executed_tools: List[Dict[str, Any]] = []
        tool_results_summary = []
        intent = "GENERAL_QUERY"

        for turn in range(max_turns):
            step_result = self.client.chat_with_tools(
                messages=messages,
                tools=tools_schemas,
                system_prompt=SYSTEM_PROMPT,
                custom_api_key=api_key
            )

            tool_calls = step_result.get("tool_calls", [])
            content = step_result.get("content", "")

            # If no tools called, we have our final text
            if not tool_calls:
                if content:
                    return AgentChatOutput(
                        response=content,
                        intent=intent,
                        tools_called=[t.get("name") for t in executed_tools]
                    )
                break

            # Execute tool calls
            for tc in tool_calls:
                tool_name = tc.get("name")
                tool_args = tc.get("arguments", {})
                executed_tools.append({"name": tool_name, "args": tool_args})

                logger.info(f"[TURN {turn + 1}] Executing tool '{tool_name}' with args {tool_args}")
                output = self.registry.execute_tool(tool_name, tool_args, context=context)
                tool_results_summary.append({"tool": tool_name, "result": output})

                # Append tool result to messages
                messages.append({
                    "role": "tool",
                    "name": tool_name,
                    "content": json.dumps(output) if isinstance(output, (dict, list)) else str(output)
                })

                if tool_name == "create_daily_plan":
                    intent = "DAILY_PLAN"
                elif tool_name in ["search_youtube", "search_web"]:
                    intent = "SEARCH_EXTERNAL"
                elif tool_name == "search_courses":
                    intent = "SEARCH_COURSES"
                elif tool_name in ["get_user_progress", "get_current_roadmap"]:
                    intent = "CHECK_PROGRESS"

            # If builtin provider, synthesize results immediately after tool execution
            if step_result.get("provider", "").startswith("builtin"):
                break

            # If LLM gave non-empty content along with tools, we can finish
            if content:
                return AgentChatOutput(
                    response=content,
                    intent=intent,
                    tools_called=[t.get("name") for t in executed_tools]
                )

        # Fallback synthesizer: formats rich markdown from the executed tool results
        synthesized_text = self._synthesize_tool_results(user_message, tool_results_summary)

        return AgentChatOutput(
            response=synthesized_text,
            intent=intent,
            tools_called=[t.get("name") for t in executed_tools]
        )

    def _synthesize_tool_results(
        self,
        user_message: str,
        tool_results: List[Dict[str, Any]]
    ) -> str:
        """Synthesizes human-friendly markdown response when LLM output is empty."""
        if not tool_results:
            return (
                "I'm here to guide your learning journey! You can ask me to find specific tutorials, "
                "schedule your study time for today, recommend courses, or review your current roadmap."
            )

        blocks = []

        for item in tool_results:
            tool = item.get("tool")
            res = item.get("result", {})

            if tool == "search_youtube":
                videos = res.get("videos", [])
                blocks.append(f"### 📹 Recommended Video Tutorials for *\"{res.get('query')}\"*")
                for v in videos:
                    blocks.append(
                        f"- **[{v.get('title')}]({v.get('url')})** ({v.get('duration')})\n"
                        f"  *Channel: {v.get('channel')}* • {v.get('description')}"
                    )

            elif tool == "search_web":
                articles = res.get("articles", [])
                blocks.append(f"### 🌐 Educational References for *\"{res.get('query')}\"*")
                for a in articles:
                    blocks.append(
                        f"- **[{a.get('title')}]({a.get('url')})** — *{a.get('source')}*\n"
                        f"  {a.get('snippet')}"
                    )

            elif tool == "create_daily_plan":
                blocks.append(f"### ⏱️ Personalized Study Plan ({res.get('available_hours')} Hours Today)")
                blocks.append(f"**Recommended Focus:** {res.get('recommended_focus')}\n")
                for i, b in enumerate(res.get("schedule", []), 1):
                    blocks.append(f"**Step {i} ({b.get('duration_minutes')} min):** {b.get('activity')}")
                blocks.append(f"\n💡 *Tip: {res.get('tip')}*")

            elif tool == "search_courses":
                courses = res.get("courses", [])
                blocks.append(f"### 📚 Recommended Courses ({len(courses)} found)")
                for c in courses:
                    blocks.append(
                        f"- **{c.get('title')}** ({c.get('provider')}) — ⭐ {c.get('rating')} ({c.get('level').title()})\n"
                        f"  {c.get('description')}\n"
                        f"  *Key skills: {', '.join(c.get('skills', []))}*"
                    )

            elif tool == "explain_topic":
                blocks.append(f"### 💡 Understanding **{res.get('matched_concept')}**")
                blocks.append(f"{res.get('overview')}\n")
                blocks.append(f"🔍 **Analogy:** {res.get('analogy')}\n")
                blocks.append("**Key Takeaways:**")
                for tk in res.get("key_takeaways", []):
                    blocks.append(f"- {tk}")

            elif tool == "get_user_progress":
                blocks.append(
                    f"### 📊 Your Learning Progress\n"
                    f"- **Current Streak:** 🔥 {res.get('streak', 0)} days\n"
                    f"- **Completion:** {res.get('completionPercentage', 0)}%\n"
                    f"- **Completed Courses:** {len(res.get('completedCourseIds', []))}"
                )

            elif tool == "get_current_roadmap":
                blocks.append(
                    f"### 🗺️ Active Learning Roadmap: **{res.get('title', 'My Curriculum')}**\n"
                    f"{res.get('description', '')}"
                )

            elif tool == "generate_quiz":
                questions = res.get("questions", [])
                blocks.append(f"### 🧪 Interactive Skill Assessment: **{res.get('topic', '').title()}**")
                blocks.append(f"*Difficulty: {res.get('difficulty', 'beginner').title()} • Total Questions: {len(questions)}*\n")
                for i, q in enumerate(questions, 1):
                    blocks.append(f"**Q{i}: {q.get('question')}**")
                    for opt_idx, opt in enumerate(q.get("options", [])):
                        letter = chr(65 + opt_idx)
                        blocks.append(f"  {letter}) {opt}")
                    blocks.append(f"  *(Correct: {chr(65 + q.get('correct_index', 0))}) — {q.get('explanation')}*\n")

            elif tool == "get_skill_tree":
                nodes = res.get("nodes", [])
                blocks.append(f"### 🕸️ Prerequisite Knowledge Graph Topology ({len(nodes)} Competency Nodes)")
                for n in nodes[:8]:
                    prereqs = ", ".join(n.get("prerequisites", [])) or "None (Foundation)"
                    blocks.append(f"- **{n.get('name')}** (`{n.get('level')}`): Prerequisites: *{prereqs}*")
                blocks.append("\n*Navigate to the **Skill Graph** in the app to view the interactive visual DAG!*")

        return "\n\n".join(blocks)


# Singleton
agent_orchestrator = AgentOrchestrator()
