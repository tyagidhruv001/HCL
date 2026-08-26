"""
quiz_generator.py — LearnAI Adaptive Skill & Milestone Quiz Generator
Produces calibrated active-recall assessment quizzes across technical competencies.
Supports both local deterministic topic banks and Gemini LLM dynamic generation.
"""

import json
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from app.config import settings

logger = logging.getLogger(__name__)

# Curated High-Quality Question Bank across core domains
QUESTION_BANK: Dict[str, List[Dict[str, Any]]] = {
    "python": [
        {
            "id": 1,
            "question": "What is the difference between a Python list and a tuple?",
            "options": [
                "Lists are mutable while tuples are immutable",
                "Tuples can only store integers while lists store any type",
                "Lists use parentheses () while tuples use square brackets []",
                "Tuples are always slower than lists"
            ],
            "correct_index": 0,
            "explanation": "In Python, lists are mutable (can be modified in-place using append, pop, etc.), whereas tuples are immutable and fixed once created."
        },
        {
            "id": 2,
            "question": "What is the time complexity of looking up a key in a standard Python dictionary (dict)?",
            "options": ["O(n)", "O(log n)", "O(1) on average", "O(n^2)"],
            "correct_index": 2,
            "explanation": "Python dictionaries use hash tables under the hood, yielding O(1) average-case time complexity for key lookups."
        },
        {
            "id": 3,
            "question": "Which built-in function returns an iterator that produces successive items from an iterable without loading all into memory?",
            "options": ["list()", "generator with yield", "range_all()", "collect()"],
            "correct_index": 1,
            "explanation": "Generators (functions with the yield statement) compute values on demand (lazy evaluation), saving memory."
        }
    ],
    "javascript": [
        {
            "id": 1,
            "question": "What does the Event Loop do in JavaScript?",
            "options": [
                "It executes synchronous blocking operations across multiple threads",
                "It monitors the Call Stack and Task Queue, pushing callback tasks onto the stack when empty",
                "It recompiles JavaScript code into bytecode",
                "It acts as a garbage collector exclusively"
            ],
            "correct_index": 1,
            "explanation": "The Event Loop continuously checks if the Call Stack is empty; if so, it dequeues pending messages from the Microtask/Task queues."
        },
        {
            "id": 2,
            "question": "What is the primary difference between `==` and `===` in JavaScript?",
            "options": [
                "`==` checks equality with type coercion, while `===` checks strict equality without type coercion",
                "`===` converts both operands to strings first",
                "`==` is deprecated in modern ES6+",
                "`===` is only for comparing numbers"
            ],
            "correct_index": 0,
            "explanation": "`==` performs type coercion before comparison, whereas `===` (strict equality) requires both value and type to match."
        },
        {
            "id": 3,
            "question": "What is a JavaScript Closure?",
            "options": [
                "A syntax error when a bracket is unclosed",
                "A function bundled together with references to its lexical environment",
                "A method used to immediately terminate execution",
                "A special object for async promises"
            ],
            "correct_index": 1,
            "explanation": "A closure gives a function access to its outer scope even after the outer function has finished executing."
        }
    ],
    "react": [
        {
            "id": 1,
            "question": "Why should you never mutate state directly in React (e.g. `state.count = 5`)?",
            "options": [
                "Direct mutation will throw an immediate syntax error",
                "React relies on shallow reference comparison to detect state changes and trigger re-renders",
                "Direct mutation deletes component props",
                "It converts state into a global variable"
            ],
            "correct_index": 1,
            "explanation": "React checks object identity to trigger efficient reconciliation. Mutating state directly prevents React from detecting changes."
        },
        {
            "id": 2,
            "question": "What is the main purpose of the `useEffect` hook's dependency array?",
            "options": [
                "To declare global styles for the component",
                "To specify which values trigger the effect callback when they change between renders",
                "To define prop types for validation",
                "To make the component render asynchronously on a web worker"
            ],
            "correct_index": 1,
            "explanation": "The dependency array tells React to re-run the effect only when specified values change. An empty array `[]` runs only on mount/unmount."
        },
        {
            "id": 3,
            "question": "When should you use `useMemo` in a React application?",
            "options": [
                "For every single function and variable declaration",
                "To cache the result of an expensive calculation between renders unless dependencies change",
                "To replace Redux state management completely",
                "To bind events to DOM nodes"
            ],
            "correct_index": 1,
            "explanation": "`useMemo` memoizes the result of computationally expensive calculations, skipping recomputation if dependencies remain unchanged."
        }
    ],
    "machine_learning": [
        {
            "id": 1,
            "question": "What is the purpose of splitting data into Training, Validation, and Test sets?",
            "options": [
                "To increase the total number of samples",
                "To train the model, tune hyperparameters without data leakage, and evaluate unbiased generalization",
                "To remove missing values automatically",
                "To reduce computation time to zero"
            ],
            "correct_index": 1,
            "explanation": "Training fits weights, Validation tunes hyperparameters/architecture, and the Test set provides an unbiased final evaluation on unseen data."
        },
        {
            "id": 2,
            "question": "What is the 'Overfitting' phenomenon in Machine Learning?",
            "options": [
                "When the model performs poorly on training data and test data",
                "When the model memorizes training noise and fails to generalize to new unseen data",
                "When the dataset is too small to compute gradients",
                "When hyperparameters are set to default values"
            ],
            "correct_index": 1,
            "explanation": "Overfitting happens when a model captures noise and idiosyncrasies in the training data (low training error, high test error)."
        },
        {
            "id": 3,
            "question": "What is the primary difference between Supervised and Unsupervised Learning?",
            "options": [
                "Supervised uses labeled target outcomes; Unsupervised discovers inherent patterns in unlabeled data",
                "Unsupervised learning requires GPU clusters whereas supervised runs on CPUs",
                "Supervised learning only works on images",
                "There is no difference"
            ],
            "correct_index": 0,
            "explanation": "Supervised algorithms learn a mapping from input X to known ground-truth Y, whereas unsupervised algorithms discover clusters/structure without labels."
        }
    ],
    "sql": [
        {
            "id": 1,
            "question": "What is the difference between `WHERE` and `HAVING` clauses in SQL?",
            "options": [
                "`WHERE` filters rows before grouping/aggregation; `HAVING` filters grouped records after aggregation",
                "`HAVING` is faster than `WHERE` in all cases",
                "`WHERE` can only be used with primary keys",
                "`HAVING` is only supported in MySQL"
            ],
            "correct_index": 0,
            "explanation": "`WHERE` filters individual rows before `GROUP BY`, whereas `HAVING` filters aggregated group results (e.g. `HAVING COUNT(*) > 5`)."
        },
        {
            "id": 2,
            "question": "Which SQL JOIN returns all rows from the left table and matched rows from the right table?",
            "options": ["INNER JOIN", "LEFT JOIN (or LEFT OUTER JOIN)", "CROSS JOIN", "FULL OUTER JOIN"],
            "correct_index": 1,
            "explanation": "A `LEFT JOIN` preserves all records from the left table, filling in `NULL` for right-table columns if no match is found."
        }
    ],
    "cloud_devops": [
        {
            "id": 1,
            "question": "What is a primary advantage of Docker containerization over traditional Virtual Machines (VMs)?",
            "options": [
                "Containers bundle a full guest OS kernel, making them heavier but safer",
                "Containers share the host OS kernel, resulting in lightweight, fast-starting isolated processes",
                "Containers do not require CPU or memory allocation",
                "Containers only run on Linux servers"
            ],
            "correct_index": 1,
            "explanation": "Containers share the host kernel while isolating user space, making them orders of magnitude lighter and faster to boot than hypervisor VMs."
        },
        {
            "id": 2,
            "question": "What does CI/CD stand for in modern DevOps?",
            "options": [
                "Continuous Integration and Continuous Delivery / Deployment",
                "Cloud Infrastructure and Container Design",
                "Central Intelligence and Command Dispatch",
                "Compute Instance and Cluster Distribution"
            ],
            "correct_index": 0,
            "explanation": "CI/CD automates the building, testing, and deployment lifecycle of applications to accelerate reliable releases."
        }
    ],
    "cybersecurity": [
        {
            "id": 1,
            "question": "What are the three pillars of the CIA Triad in information security?",
            "options": [
                "Confidentiality, Integrity, and Availability",
                "Control, Identification, and Authentication",
                "Cryptography, Isolation, and Auditing",
                "Cloud, Infrastructure, and Access"
            ],
            "correct_index": 0,
            "explanation": "The CIA triad defines the core goals of information security: Confidentiality (privacy), Integrity (accuracy/tamper-proofing), and Availability (accessibility)."
        },
        {
            "id": 2,
            "question": "How can web applications prevent SQL Injection (SQLi) attacks?",
            "options": [
                "By using parameterized queries / prepared statements instead of raw string concatenation",
                "By using HTTPS certificates only",
                "By increasing database memory limits",
                "By obfuscating client-side JavaScript"
            ],
            "correct_index": 0,
            "explanation": "Parameterized queries treat user input strictly as data parameters rather than executable SQL code."
        }
    ]
}


class QuizGenerator:
    """
    Generates tailored skill assessment quizzes with multiple choice options and educational feedback.
    """

    def __init__(self):
        self.question_bank = QUESTION_BANK

    def generate_quiz_for_topic(
        self,
        topic: str,
        difficulty: str = "beginner",
        num_questions: int = 3
    ) -> Dict[str, Any]:
        """
        Generates a 3-4 question quiz for a given topic or milestone.
        """
        normalized_topic = self._normalize_topic(topic)
        questions = self.question_bank.get(normalized_topic, [])

        if not questions:
            # Fallback to general programming questions if specific domain is missing
            questions = self.question_bank.get("python", [])

        selected = questions[:num_questions]

        return {
            "topic": topic,
            "normalized_category": normalized_topic,
            "difficulty": difficulty,
            "total_questions": len(selected),
            "questions": selected
        }

    def _normalize_topic(self, topic: str) -> str:
        t = (topic or "").lower()
        if any(w in t for w in ["react", "frontend", "next", "vue", "jsx"]):
            return "react"
        if any(w in t for w in ["js", "javascript", "typescript", "es6", "node"]):
            return "javascript"
        if any(w in t for w in ["ml", "machine learning", "deep learning", "ai", "pandas", "data science"]):
            return "machine_learning"
        if any(w in t for w in ["sql", "database", "postgres", "rdbms"]):
            return "sql"
        if any(w in t for w in ["docker", "k8s", "kubernetes", "cloud", "aws", "devops", "linux"]):
            return "cloud_devops"
        if any(w in t for w in ["security", "cyber", "owasp", "hack", "penetration"]):
            return "cybersecurity"
        return "python"


quiz_generator = QuizGenerator()
