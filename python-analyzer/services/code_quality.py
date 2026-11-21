import math
import re
from collections import Counter, defaultdict
from pathlib import PurePosixPath

from tree_sitter import Language, Parser
import tree_sitter_java
import tree_sitter_javascript
import tree_sitter_typescript

from .ast_analyzer import ASTCodeAnalyzer


LANGUAGES = {
    '.java': tree_sitter_java.language, '.js': tree_sitter_javascript.language,
    '.jsx': tree_sitter_javascript.language, '.mjs': tree_sitter_javascript.language,
    '.cjs': tree_sitter_javascript.language, '.ts': tree_sitter_typescript.language_typescript,
    '.tsx': tree_sitter_typescript.language_tsx,
}
FUNCTIONS = {'function_declaration', 'generator_function_declaration', 'method_definition',
             'method_declaration', 'constructor_declaration', 'arrow_function', 'function_expression'}
CLASSES = {'class_declaration', 'interface_declaration', 'record_declaration', 'enum_declaration',
           'abstract_class_declaration'}
DECISIONS = {'if_statement', 'for_statement', 'enhanced_for_statement', 'for_in_statement',
             'while_statement', 'do_statement', 'catch_clause', 'switch_label', 'switch_case',
             'ternary_expression', '&&', '||', '??'}


def symbols_for(path, content):
    suffix = PurePosixPath(path).suffix.lower()
    if suffix == '.py':
        info = ASTCodeAnalyzer().analyze_file_structure(path, content)
        symbols = [{'kind': 'function', 'name': f['name'], 'start': f['lineno'],
                    'end': f['end_lineno'], 'complexity': f['cyclomatic_complexity']}
                   for f in info['functions']]
        symbols += [{'kind': 'class', 'name': c['name'], 'start': c['lineno'],
                     'end': c['end_lineno']} for c in info['classes']]
        return symbols, info['syntax_valid']
    if suffix not in LANGUAGES:
        return [], None
    source = content.encode()
    root = Parser(Language(LANGUAGES[suffix]())).parse(source).root_node
    result = []
    pending = [(root, None)]
    while pending:
        node, owner_function = pending.pop()
        if node.type in FUNCTIONS | CLASSES:
            name = node.child_by_field_name('name')
            if name is None and node.type in {'arrow_function', 'function_expression'} and node.parent:
                for field in ('name', 'key', 'left'):
                    name = node.parent.child_by_field_name(field)
                    if name is not None:
                        break
            if name:
                symbol = {'kind': 'class' if node.type in CLASSES else 'function',
                          'name': name.text.decode(), 'start': node.start_point.row + 1,
                          'end': node.end_point.row + 1}
                result.append(symbol)
                if symbol['kind'] == 'function':
                    symbol['complexity'] = 1
                    owner_function = symbol
        elif owner_function is not None and node.type in DECISIONS:
            owner_function['complexity'] += 1
        pending.extend((child, owner_function) for child in reversed(node.children))
    return result, not root.has_error


def analyze_sources(files, authors_by_sha):
    """Return current-line ownership and reproducible, file-located quality signals."""
    owners = defaultdict(list)
    reports = []
    identifiers = Counter()
    first_block, previous_match = {}, {}
    possible_unused = []
    for file in files:
        lines = file.content.splitlines()
        symbols, parsed = symbols_for(file.path, file.content)
        line_owners = [None] * len(lines)
        for start, end, sha in file.blame:
            author = authors_by_sha.get(sha)
            for i in range(start - 1, min(end, len(lines))):
                if lines[i].strip():
                    line_owners[i] = author
        for symbol in [{'kind': 'file', 'name': file.path, 'start': 1, 'end': len(lines)}, *symbols]:
            counts = Counter(a for a in line_owners[symbol['start'] - 1:symbol['end']] if a)
            for author, count in counts.items():
                owners[author].append({**symbol, 'path': file.path, 'lines': count,
                                       'share': round(100 * count / counts.total(), 1),
                                       'primary': count == max(counts.values())})
        findings = []
        report = {'path': file.path, 'maintainability': None, 'parsed': parsed, 'findings': findings}
        reports.append(report)
        if parsed is False:
            findings.append({'kind': 'Parse error', 'line': 1, 'detail': 'Check source syntax or parser support.'})
        if parsed is None:
            continue
        tokens = re.findall(r'[\w$]+|[^\s\w]', file.content)
        identifiers.update(tokens)
        code_lines = [(i, ' '.join(line.split())) for i, line in enumerate(lines, 1)
                      if len(line.strip()) >= 4 and not line.lstrip().startswith(('#', '//', '/*', '*'))]
        for index in range(len(code_lines) - 5):
            block = tuple(text for _, text in code_lines[index:index + 6])
            start = code_lines[index][0]
            previous = first_block.setdefault(block, (file.path, start, code_lines[index + 5][0]))
            if previous[0] == file.path and start <= previous[2]:
                continue
            pair = (file.path, previous[0])
            if start > previous_match.get(pair, 0):
                findings.append({'kind': 'Duplicate block', 'line': start,
                                 'detail': f'Six matching code lines at {previous[0]}:{previous[1]}.'})
                previous_match[pair] = code_lines[index + 5][0]
        complexity = 0
        for symbol in symbols:
            if symbol['kind'] != 'function':
                continue
            value = symbol['complexity']
            complexity += value
            name, line = symbol['name'], symbol['start']
            if value > 10:
                findings.append({'kind': 'Complex function', 'line': line,
                                 'detail': f'{name} has estimated cyclomatic complexity {value}.'})
            if symbol['end'] - line + 1 > 60:
                findings.append({'kind': 'Long function', 'line': line, 'detail': name})
            if not name.startswith('__') and name not in {'main', 'constructor', 'render'}:
                possible_unused.append((name, line, findings))
        if parsed and tokens:
            volume = max(1, len(tokens) * math.log2(max(2, len(set(tokens)))))
            loc = max(1, sum(bool(line.strip()) for line in lines))
            index = (171 - 5.2 * math.log(volume) - 0.23 * complexity - 16.2 * math.log(loc)) / 171
            report['maintainability'] = round(100 * max(0, min(1, index)), 1)
    for name, line, findings in possible_unused:
        if identifiers[name] == 1:
            findings.append({'kind': 'Possibly unused', 'line': line,
                             'detail': f'{name} appears only at its declaration in the analyzed source.'})
    return owners, reports
