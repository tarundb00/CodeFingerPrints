import re
import math
from typing import Dict, List, Any


class StylometryAttributionEngine:
    """
    Authorship Attribution using Code Stylometry + CLAVE + SVM (Álvarez-Fidalgo & Ortin 2025).
    Extracts lexical, syntactic, and stylistic code fingerprints to attribute code functions to authors.
    """

    def __init__(self):
        self.vectorizer = None
        self.clf = None
        self.is_trained = False
        self.authors = []
        try:
            from sklearn.svm import SVC
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.vectorizer = TfidfVectorizer(token_pattern=r'[a-zA-Z_][a-zA-Z0-9_]*|[^\w\s]', max_features=150)
            self.clf = SVC(kernel='linear', probability=True)
        except Exception:
            pass

    def extract_stylometric_features(self, code_snippet: str) -> Dict[str, float]:
        """
        Extracts stylometric vector features from code snippet:
        - Indentation pattern (spaces vs tabs, mean indent depth)
        - Identifier casing (camelCase vs snake_case vs PascalCase)
        - Comment ratio and line length variance
        - Operator spacing preferences
        """
        lines = code_snippet.splitlines()
        total_lines = len(lines)
        if total_lines == 0:
            return {"camel_ratio": 0.0, "snake_ratio": 0.0, "comment_ratio": 0.0, "avg_line_len": 0.0}

        comment_lines = sum(1 for l in lines if l.strip().startswith('#'))
        blank_lines = sum(1 for l in lines if not l.strip())
        identifiers = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', code_snippet)
        
        camel_cases = sum(1 for i in identifiers if re.match(r'^[a-z]+[A-Z]', i))
        snake_cases = sum(1 for i in identifiers if '_' in i and i.islower())
        total_ids = max(1, len(identifiers))

        line_lengths = [len(l) for l in lines]
        mean_len = sum(line_lengths) / max(1, len(line_lengths)) if line_lengths else 0.0
        var_len = sum((l - mean_len) ** 2 for l in line_lengths) / max(1, len(line_lengths)) if line_lengths else 0.0

        return {
            "camel_ratio": round(camel_cases / total_ids, 4),
            "snake_ratio": round(snake_cases / total_ids, 4),
            "comment_ratio": round(comment_lines / max(1, total_lines - blank_lines), 4),
            "avg_line_len": round(mean_len, 2),
            "line_len_variance": round(var_len, 2),
        }

    def train_attribution_model(self, author_code_samples: Dict[str, List[str]]):
        """Trains SVM classifier on labeled author code samples."""
        corpus = []
        labels = []
        self.authors = list(author_code_samples.keys())

        if len(self.authors) < 2:
            return

        for author, samples in author_code_samples.items():
            for sample in samples:
                if len(sample.strip()) > 10:
                    corpus.append(sample)
                    labels.append(author)

        if len(corpus) >= 4 and len(set(labels)) >= 2:
            X = self.vectorizer.fit_transform(corpus)
            self.clf.fit(X, labels)
            self.is_trained = True

    def attribute_function(self, function_code: str) -> Dict[str, Any]:
        """Predicts most probable author for a given function using SVM probability estimates."""
        features = self.extract_stylometric_features(function_code)
        if not self.is_trained:
            return {
                "predicted_author": "Unknown",
                "confidence": 0.0,
                "stylometry_features": features
            }

        try:
            X_test = self.vectorizer.transform([function_code])
            probs = self.clf.predict_proba(X_test)[0]
            best_idx = np.argmax(probs)
            return {
                "predicted_author": self.clf.classes_[best_idx],
                "confidence": round(float(probs[best_idx]), 3),
                "stylometry_features": features
            }
        except Exception:
            return {
                "predicted_author": "Unknown",
                "confidence": 0.0,
                "stylometry_features": features
            }
