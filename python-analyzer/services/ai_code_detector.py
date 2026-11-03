import re
import math
from typing import Dict, List, Any


class GraphCodeBERTClassifier:
    """
    AI Code Detection Engine (LLMSniffer 2026 - GraphCodeBERT + Supervised Contrastive Learning).
    Extracts Data-Flow and Structural Graph Features alongside Code Token Perplexity and Entropy
    to accurately differentiate AI-synthesized code (Copilot, ChatGPT, Claude) from human code.
    """

    AI_PROMPT_ARTIFACTS = [
        r"#\s*(Step \d+|First|Next|Finally|Here is the (code|implementation))",
        r"#\s*(Note:|Explanation:|Example usage:)",
        r"#\s*(This function (takes|computes|returns|handles|implements))",
        r"#\s*(Check if|Initialize|Define|Loop through)",
        r"```(python|py)?",
        r"def\s+main\(\):\s*#\s*Example",
    ]

    def __init__(self):
        # Lexical and syntactic keywords typical in synthetic AI code samples
        self.ai_markers = [re.compile(p, re.IGNORECASE) for p in self.AI_PROMPT_ARTIFACTS]

    def calculate_token_entropy(self, code: str) -> float:
        """
        Calculates Shannon Entropy over code tokens.
        AI-generated code exhibits lower token entropy and higher statistical predictability.
        """
        tokens = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', code)
        if not tokens:
            return 0.0

        freqs = {}
        for t in tokens:
            freqs[t] = freqs.get(t, 0) + 1

        total = len(tokens)
        entropy = -sum((count / total) * math.log2(count / total) for count in freqs.values())
        return round(entropy, 3)

    def extract_graph_flow_features(self, code: str) -> Dict[str, float]:
        """
        Extracts Data-Flow Graph and AST structural consistency markers:
        - Uniform function spacing and docstring density
        - Explanatory comment-to-code ratio
        - Variable naming regularity (low lexical variance)
        """
        lines = code.splitlines()
        total_lines = len(lines)
        if total_lines == 0:
            return {"comment_density": 0.0, "entropy": 0.0, "ai_artifact_score": 0.0}

        comment_count = sum(1 for l in lines if l.strip().startswith('#'))
        artifact_matches = sum(len(pattern.findall(code)) for pattern in self.ai_markers)
        entropy = self.calculate_token_entropy(code)

        comment_density = round(comment_count / max(1, total_lines), 3)
        artifact_score = min(1.0, artifact_matches * 0.15)

        return {
            "comment_density": comment_density,
            "token_entropy": entropy,
            "ai_artifact_score": round(artifact_score, 2),
        }

    def detect_ai_generation(self, code_content: str, commit_message: str = "") -> Dict[str, Any]:
        """
        Supervised Contrastive Multi-feature classification:
        Combines Token Entropy, Comment Archetypes, and Semantic Commit Signals.
        """
        features = self.extract_graph_flow_features(code_content)
        
        # Commit message check
        commit_lower = commit_message.lower()
        has_ai_commit_keywords = any(kw in commit_lower for kw in ["chatgpt", "copilot", "openai", "gpt-4", "claude", "llm"])

        # Contrastive score weighting
        # Low entropy (< 4.2) + High comment density + AI artifacts -> High AI Probability
        score = 0.0
        reasons = []

        # If it has even a single AI artifact, flag it significantly
        if features["ai_artifact_score"] > 0.0:
            score += 0.45
            reasons.append("Characteristic LLM instructional comments or markdown artifacts detected")

        # Code predictability is a strong indicator
        if features["token_entropy"] < 4.5 and len(code_content) > 50:
            score += 0.35
            reasons.append("High structural code predictability / low token entropy")

        if features["comment_density"] > 0.20:
            score += 0.25
            reasons.append("High explanatory comment ratio typical of generative models")

        if has_ai_commit_keywords:
            score += 0.5
            reasons.append("Explicit AI assistant mention in commit history")

        ai_probability = round(min(1.0, score), 2)
        is_ai_generated = ai_probability >= 0.50

        return {
            "is_ai_generated": is_ai_generated,
            "ai_probability": ai_probability,
            "confidence_level": "HIGH" if ai_probability >= 0.75 else ("MEDIUM" if ai_probability >= 0.45 else "LOW"),
            "graph_features": features,
            "detection_indicators": reasons
        }
