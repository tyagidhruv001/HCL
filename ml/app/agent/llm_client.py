"""
llm_client.py — Pluggable LLM Provider for LearnAI Agent
Supports local Ollama models (Qwen, Gemma, Llama, DeepSeek) with fallback to Gemini API or local reasoning.
"""

import json
import logging
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Unified LLM Client supporting tool-calling across Ollama (Local) and Gemini (Cloud).
    """

    def __init__(self):
        self.ollama_url = settings.ollama_base_url.rstrip("/")
        self.ollama_model = settings.ollama_model
        self.gemini_key = settings.gemini_api_key
        self.gemini_model = settings.gemini_model

    def chat_with_tools(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        system_prompt: str,
        custom_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a single chat step with tools.
        Returns:
            {
                "content": str,
                "tool_calls": List[{"name": str, "arguments": dict}],
                "provider": str ("ollama", "gemini", or "builtin_engine")
            }
        """
        # 1. Try Local Ollama first
        try:
            ollama_resp = self._call_ollama(messages, tools, system_prompt)
            if ollama_resp:
                return ollama_resp
        except Exception as e:
            logger.info(f"Ollama local service unreachable ({e}). Checking cloud fallback...")

        # 2. Try Gemini API fallback if key available
        key_to_use = custom_api_key or self.gemini_key
        if key_to_use:
            try:
                gemini_resp = self._call_gemini(messages, tools, system_prompt, key_to_use)
                if gemini_resp:
                    return gemini_resp
            except Exception as e:
                logger.warning(f"Gemini API fallback error: {e}")

        # 3. Built-in Deterministic Agent Engine (ensures 100% uptime with zero external dependencies)
        return self._call_builtin_engine(messages, tools)

    def _call_ollama(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        system_prompt: str
    ) -> Optional[Dict[str, Any]]:
        """Calls local Ollama chat endpoint with function calling."""
        payload = {
            "model": self.ollama_model,
            "messages": [{"role": "system", "content": system_prompt}] + messages,
            "tools": tools,
            "stream": False
        }

        timeout_config = httpx.Timeout(10.0, connect=0.5)
        with httpx.Client(timeout=timeout_config) as client:
            resp = client.post(f"{self.ollama_url}/api/chat", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                msg = data.get("message", {})
                tool_calls = []

                if "tool_calls" in msg:
                    for tc in msg["tool_calls"]:
                        fn = tc.get("function", {})
                        args = fn.get("arguments", {})
                        if isinstance(args, str):
                            try:
                                args = json.loads(args)
                            except Exception:
                                pass
                        tool_calls.append({
                            "name": fn.get("name"),
                            "arguments": args
                        })

                return {
                    "content": msg.get("content", ""),
                    "tool_calls": tool_calls,
                    "provider": f"ollama:{self.ollama_model}"
                }
        return None

    def _call_gemini(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        system_prompt: str,
        api_key: str
    ) -> Optional[Dict[str, Any]]:
        """Calls Gemini API with function declaration formatting."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={api_key}"

        # Convert tool schemas to Gemini functionDeclarations format
        function_declarations = []
        for t in tools:
            fn = t.get("function", {})
            function_declarations.append({
                "name": fn.get("name"),
                "description": fn.get("description"),
                "parameters": fn.get("parameters")
            })

        # Format conversation history
        contents = []
        for m in messages:
            role = "model" if m.get("role") in ["assistant", "model"] else "user"
            content_text = m.get("content") or ""
            if content_text:
                contents.append({
                    "role": role,
                    "parts": [{"text": str(content_text)}]
                })

        payload = {
            "contents": contents,
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "tools": [{"functionDeclarations": function_declarations}] if function_declarations else []
        }

        with httpx.Client(timeout=12.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidate = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0]
                
                # Check for function call
                tool_calls = []
                if "functionCall" in candidate:
                    fc = candidate["functionCall"]
                    tool_calls.append({
                        "name": fc.get("name"),
                        "arguments": fc.get("args", {})
                    })

                return {
                    "content": candidate.get("text", ""),
                    "tool_calls": tool_calls,
                    "provider": f"gemini:{self.gemini_model}"
                }
        return None

    def _call_builtin_engine(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Deterministic intent-matching engine that evaluates math expressions and emits tool calls based on user request keywords.
        Ensures the agent functions smoothly during offline testing or local development without Ollama or API keys.
        """
        import re
        import math

        last_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_msg = str(m.get("content", "")).strip()
                break

        lower_msg = last_msg.lower()

        # 1. Math / Arithmetic evaluation (e.g., 4+5, 10 * 25, sqrt(16), 100/4)
        math_candidate = re.sub(r'^(calculate|what is|compute|solve|eval)\s+', '', lower_msg).rstrip('?=').strip()
        math_cleaned = math_candidate.replace('x', '*').replace('^', '**').replace('×', '*').replace('÷', '/')
        if re.match(r'^[\d\s\+\-\*\/\%\(\)\.\*\*]+$', math_cleaned) and any(c.isdigit() for c in math_cleaned):
            try:
                allowed_math = {k: v for k, v in math.__dict__.items() if not k.startswith("__")}
                result = eval(math_cleaned, {"__builtins__": {}}, allowed_math)
                return {
                    "content": f"🧮 **Calculation:**\n\n`{last_msg}` = **{result}**",
                    "tool_calls": [],
                    "provider": "builtin_rule_engine"
                }
            except Exception:
                pass

        # 2. Greetings
        if lower_msg in ["hi", "hello", "hey", "hola", "sup", "greetings", "good morning", "good evening"]:
            return {
                "content": "Hello! 👋 I'm **LearnAI**, your personal AI learning advisor.\n\nI can help you build custom roadmaps, explain concepts, recommend top-rated courses, find tutorial videos, or plan your daily study time.\n\nWhat would you like to learn today?",
                "tool_calls": [],
                "provider": "builtin_rule_engine"
            }

        # 3. Capabilities / Help
        if any(w in lower_msg for w in ["who are you", "what can you do", "help me", "what are your features"]):
            return {
                "content": (
                    "### 🤖 How I Can Assist Your Learning:\n\n"
                    "- 📚 **Course Search:** *\"Recommend beginner courses for Python & Data Science\"*\n"
                    "- 📹 **Video Tutorials:** *\"Find a YouTube tutorial explaining React Hooks\"*\n"
                    "- ⏱️ **Daily Study Plan:** *\"I have 2 hours today, what should I study?\"*\n"
                    "- 💡 **Concept Explanations:** *\"Explain binary search trees and time complexity\"*\n"
                    "- 🗺️ **Roadmap Navigation:** *\"Show my current roadmap\"*\n"
                    "- 🧮 **Math & Calculations:** Ask arithmetic questions directly\n\n"
                    "💡 *Tip: Add your Gemini API key in **API Settings** (⚙️ in the sidebar) to unlock full open-ended conversational reasoning!*"
                ),
                "tool_calls": [],
                "provider": "builtin_rule_engine"
            }

        tool_calls = []

        # Intent: YouTube video query
        if any(w in lower_msg for w in ["youtube", "video", "watch", "tutorial video"]):
            cleaned = re.sub(r'\b(find|me|a|good|video|explaining|watch|tutorial|youtube|about|on)\b', '', lower_msg, flags=re.IGNORECASE)
            query = " ".join(cleaned.split()).strip()
            tool_calls.append({"name": "search_youtube", "arguments": {"query": query or "Java Multithreading"}})

        # Intent: Web search query
        elif any(w in lower_msg for w in ["search web", "google", "documentation", "article", "read about"]):
            cleaned = re.sub(r'\b(search|web|google|find|documentation|for|article|articles|read|about)\b', '', lower_msg, flags=re.IGNORECASE)
            query = " ".join(cleaned.split()).strip()
            tool_calls.append({"name": "search_web", "arguments": {"query": query or "React architecture"}})

        # Intent: Daily study plan / time constraint
        elif any(w in lower_msg for w in ["hour", "hours", "today", "schedule", "daily plan", "how much time"]):
            hours_match = re.search(r"(\d+(?:\.\d+)?)", lower_msg)
            hours = float(hours_match.group(1)) if hours_match else 2.0
            tool_calls.append({"name": "create_daily_plan", "arguments": {"available_hours": hours}})

        # Intent: Explain a concept
        elif any(w in lower_msg for w in ["explain", "what is", "how does", "understand", "difference between"]):
            topic = lower_msg.replace("explain", "").replace("what is", "").replace("to me", "").strip()
            tool_calls.append({"name": "explain_topic", "arguments": {"topic": topic or "algorithms"}})

        # Intent: Search Courses
        elif any(w in lower_msg for w in ["course", "recommend course", "find course", "learn", "study"]):
            tool_calls.append({"name": "search_courses", "arguments": {"query": lower_msg}})

        # Intent: Progress / Streak check
        elif any(w in lower_msg for w in ["progress", "streak", "completed", "how am i doing"]):
            tool_calls.append({"name": "get_user_progress", "arguments": {}})

        # Intent: Roadmap check
        elif any(w in lower_msg for w in ["roadmap", "path", "curriculum", "milestone"]):
            tool_calls.append({"name": "get_current_roadmap", "arguments": {}})

        # Intent: Fallback topic lookup if programming keywords mentioned
        elif any(kw in lower_msg for kw in ["python", "javascript", "react", "java", "sql", "html", "css", "docker", "algorithm", "git", "api"]):
            tool_calls.append({"name": "explain_topic", "arguments": {"topic": lower_msg}})

        return {
            "content": "",
            "tool_calls": tool_calls,
            "provider": "builtin_rule_engine"
        }


# Singleton
llm_client = LLMClient()
