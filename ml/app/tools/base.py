"""
base.py — Tool Definition and Base Schema for Agent Tool Calling
"""

from typing import Dict, Any, Callable, Optional
from dataclasses import dataclass


@dataclass
class Tool:
    name: str
    description: str
    parameters: Dict[str, Any]
    func: Callable[..., Any]

    def execute(self, **kwargs) -> Any:
        return self.func(**kwargs)

    def to_schema(self) -> Dict[str, Any]:
        """Returns standard OpenAI / Ollama compatible JSON schema tool definition."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }
