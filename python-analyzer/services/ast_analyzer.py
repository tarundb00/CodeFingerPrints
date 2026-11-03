import ast
from typing import Dict, List, Any


class ASTCodeAnalyzer:
    """
    Code Structure Analysis using AST Parsing + Call Graph Analysis (ICCSIE 2024).
    Extracts function definitions, cyclomatic complexity, call graphs, and dependency metrics.
    """

    def analyze_file_structure(self, file_path: str, code_content: str) -> Dict[str, Any]:
        """Parses python source code and extracts functions, classes, and call relationships."""
        try:
            tree = ast.parse(code_content)
        except SyntaxError:
            return {
                "file_path": file_path,
                "syntax_valid": False,
                "functions": [],
                "classes": [],
                "call_graph": {},
                "metrics": {"loc": len(code_content.splitlines()), "complexity": 1}
            }

        functions = []
        classes = []
        call_graph: Dict[str, List[str]] = {}

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                fn_name = node.name
                calls = self._extract_function_calls(node)
                complexity = self._calculate_cyclomatic_complexity(node)
                docstring = ast.get_docstring(node)

                func_info = {
                    "name": fn_name,
                    "lineno": node.lineno,
                    "end_lineno": getattr(node, "end_lineno", node.lineno),
                    "args": [arg.arg for arg in node.args.args],
                    "calls": calls,
                    "cyclomatic_complexity": complexity,
                    "has_docstring": docstring is not None,
                    "loc": getattr(node, "end_lineno", node.lineno) - node.lineno + 1
                }
                functions.append(func_info)
                call_graph[fn_name] = calls

            elif isinstance(node, ast.ClassDef):
                methods = [n.name for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
                classes.append({
                    "name": node.name,
                    "lineno": node.lineno,
                    "methods": methods
                })

        return {
            "file_path": file_path,
            "syntax_valid": True,
            "functions": functions,
            "classes": classes,
            "call_graph": call_graph,
            "metrics": {
                "loc": len(code_content.splitlines()),
                "total_functions": len(functions),
                "total_classes": len(classes),
                "avg_complexity": round(sum(f["cyclomatic_complexity"] for f in functions) / max(1, len(functions)), 2)
            }
        }

    def _extract_function_calls(self, fn_node: ast.AST) -> List[str]:
        """Extracts list of function/method names invoked inside a function body."""
        calls = []
        for n in ast.walk(fn_node):
            if isinstance(n, ast.Call):
                if isinstance(n.func, ast.Name):
                    calls.append(n.func.id)
                elif isinstance(n.func, ast.Attribute):
                    calls.append(n.func.attr)
        return list(set(calls))

    def _calculate_cyclomatic_complexity(self, fn_node: ast.AST) -> int:
        """Calculates McCabe Cyclomatic Complexity of a function."""
        complexity = 1
        for n in ast.walk(fn_node):
            if isinstance(n, (ast.If, ast.While, ast.For, ast.AsyncFor, ast.ExceptHandler, ast.With, ast.AsyncWith)):
                complexity += 1
            elif isinstance(n, ast.BoolOp):
                complexity += len(n.values) - 1
        return complexity
