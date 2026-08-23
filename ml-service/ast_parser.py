"""
ast_parser.py
Phase 2 AST-to-Graph Parser for SecureCode v2 GNN Bug Detector.

Converts Python and JavaScript source code into graph representations:
- Nodes represent AST constructs (e.g. FunctionDef, Call, If, Assign, BinOp, Name, etc.)
- Edges represent both structural (parent -> child) and control/data flow (next statement, var usage)
- Generates node feature vectors and adjacency matrices compatible with PyTorch Graph Neural Networks.
"""

import ast
import re
import networkx as nx
import numpy as np
import torch

# Standard 50-node-type vocabulary covering key AST concepts across Python and JavaScript
AST_NODE_TYPES = [
    # Declarations & Structure
    "Module", "FunctionDef", "AsyncFunctionDef", "ClassDef", "Return", "Delete",
    # Assignments & Variables
    "Assign", "AugAssign", "AnnAssign", "Name", "Constant", "Attribute", "Subscript", "Starred",
    # Control Flow
    "For", "AsyncFor", "While", "If", "With", "AsyncWith", "Try", "ExceptHandler", "Raise",
    "Assert", "Break", "Continue", "Pass",
    # Expressions & Operations
    "Expr", "UnaryOp", "BinOp", "BoolOp", "Compare", "Call", "keyword", "IfExp", "Dict", "Set",
    "List", "Tuple", "Slice", "FormattedValue", "JoinedStr", "Lambda", "Yield", "YieldFrom",
    # Operators
    "Add", "Sub", "Mult", "Div", "Mod", "Eq", "NotEq", "Lt", "Gt", "In", "NotIn", "Is", "IsNot",
    "And", "Or", "Not",
    # JavaScript / Fallback specific constructs
    "VarDecl", "LetDecl", "ConstDecl", "ArrowFunc", "TryCatch", "ImportDecl", "ExportDecl", "GenericNode"
]

NODE_TYPE_TO_IDX = {t: i for i, t in enumerate(AST_NODE_TYPES)}
FEATURE_DIM = len(AST_NODE_TYPES) + 5  # 50 one-hot types + 5 numerical features (depth, child_count, is_call, is_branch, line_norm)


class ASTGraphBuilder:
    def __init__(self):
        self.type_to_idx = NODE_TYPE_TO_IDX
        self.feature_dim = FEATURE_DIM

    def parse_python(self, code: str) -> nx.DiGraph:
        """Parses Python source code into a NetworkX DiGraph using the built-in ast module."""
        G = nx.DiGraph()
        try:
            tree = ast.parse(code)
        except SyntaxError:
            # Fall back to token-based graph on syntax error
            return self._parse_generic(code, "python")

        node_counter = 0

        def traverse(node, parent_id=None, depth=0):
            nonlocal node_counter
            current_id = node_counter
            node_counter += 1

            node_type = type(node).__name__
            line = getattr(node, "lineno", 0)

            # Node features
            G.add_node(
                current_id,
                type=node_type,
                depth=depth,
                line=line,
                name=getattr(node, "name", getattr(node, "id", getattr(node, "attr", ""))),
            )

            if parent_id is not None:
                # Structural edge: Parent -> Child
                G.add_edge(parent_id, current_id, relation="child")

            # Traverse child AST nodes
            children = []
            for field, value in ast.iter_fields(node):
                if isinstance(value, list):
                    for item in value:
                        if isinstance(item, ast.AST):
                            child_id = traverse(item, current_id, depth + 1)
                            children.append(child_id)
                elif isinstance(value, ast.AST):
                    child_id = traverse(value, current_id, depth + 1)
                    children.append(child_id)

            # Sequential control flow edges among siblings
            for i in range(len(children) - 1):
                G.add_edge(children[i], children[i + 1], relation="next_statement")

            return current_id

        traverse(tree)
        return G

    def parse_javascript(self, code: str) -> nx.DiGraph:
        """
        Parses JavaScript/TypeScript source code into an AST graph using structural regex tokenization.
        Extracts functions, conditionals, loops, assignments, and call graphs.
        """
        G = nx.DiGraph()
        lines = code.split("\n")
        
        G.add_node(0, type="Module", depth=0, line=1, name="root")
        current_parent = 0
        node_id = 1
        
        scope_stack = [(0, 0)]  # (node_id, indent_or_brace_level)
        
        for line_num, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith("//") or stripped.startswith("/*"):
                continue
            
            # Determine depth from leading whitespace / indentation
            indent = len(line) - len(line.lstrip())
            depth = max(1, indent // 2)

            node_type = "Expr"
            name = ""
            
            # Identify constructs
            if re.search(r"\bfunction\b|\=\>|\bdef\b", stripped):
                node_type = "FunctionDef"
                match = re.search(r"function\s+([a-zA-Z0-9_$]+)", stripped)
                name = match.group(1) if match else "anonymous"
            elif re.search(r"\bif\b|\belse\b|\bswitch\b", stripped):
                node_type = "If"
            elif re.search(r"\bfor\b|\bwhile\b|\bdo\b", stripped):
                node_type = "For"
            elif re.search(r"\btry\b|\bcatch\b|\bfinally\b", stripped):
                node_type = "Try"
            elif re.search(r"\breturn\b", stripped):
                node_type = "Return"
            elif re.search(r"\bconst\b|\blet\b|\bvar\b|\=", stripped):
                node_type = "Assign"
            elif re.search(r"[a-zA-Z0-9_$]+\s*\(", stripped):
                node_type = "Call"
                match = re.search(r"([a-zA-Z0-9_$]+)\s*\(", stripped)
                name = match.group(1) if match else ""
            else:
                node_type = "GenericNode"

            # Attach to appropriate parent
            parent_id = 0
            while len(scope_stack) > 1 and scope_stack[-1][1] >= depth:
                scope_stack.pop()
            parent_id = scope_stack[-1][0]

            G.add_node(node_id, type=node_type, depth=depth, line=line_num, name=name)
            G.add_edge(parent_id, node_id, relation="child")

            # If opening block, push to scope stack
            if "{" in stripped or stripped.endswith(":"):
                scope_stack.append((node_id, depth))

            node_id += 1

        return G

    def _parse_generic(self, code: str, language: str) -> nx.DiGraph:
        """Generic statement-level graph fallback."""
        G = nx.DiGraph()
        G.add_node(0, type="Module", depth=0, line=1, name="root")
        lines = [l.strip() for l in code.split("\n") if l.strip()]
        for i, line in enumerate(lines, start=1):
            node_type = "Call" if "(" in line else "Assign" if "=" in line else "Expr"
            G.add_node(i, type=node_type, depth=1, line=i, name=line[:20])
            G.add_edge(0, i, relation="child")
            if i > 1:
                G.add_edge(i - 1, i, relation="next_statement")
        return G

    def code_to_graph(self, code: str, language: str = "python") -> nx.DiGraph:
        """Converts code string to NetworkX AST DiGraph based on language."""
        lang = (language or "python").lower()
        if lang in ["python", "py"]:
            return self.parse_python(code)
        elif lang in ["javascript", "typescript", "js", "ts"]:
            return self.parse_javascript(code)
        else:
            return self._parse_generic(code, lang)

    def graph_to_tensors(self, G: nx.DiGraph):
        """
        Converts NetworkX AST graph into PyTorch tensors for GNN input:
        - x: [num_nodes, feature_dim] float tensor
        - edge_index: [2, num_edges] long tensor
        - adj: [num_nodes, num_nodes] normalized adjacency matrix
        """
        num_nodes = max(1, len(G.nodes))
        features = np.zeros((num_nodes, self.feature_dim), dtype=np.float32)

        nodes = sorted(list(G.nodes))
        node_map = {n: i for i, n in enumerate(nodes)}

        max_line = max([G.nodes[n].get("line", 1) for n in nodes] or [1])

        for node in nodes:
            idx = node_map[node]
            node_data = G.nodes[node]
            node_type = node_data.get("type", "GenericNode")
            depth = node_data.get("depth", 0)
            line = node_data.get("line", 0)

            # One-hot encoding for type
            type_idx = self.type_to_idx.get(node_type, self.type_to_idx["GenericNode"])
            features[idx, type_idx] = 1.0

            # Additional structural features
            features[idx, len(self.type_to_idx) + 0] = min(1.0, depth / 20.0)
            features[idx, len(self.type_to_idx) + 1] = min(1.0, len(list(G.successors(node))) / 10.0)
            features[idx, len(self.type_to_idx) + 2] = 1.0 if node_type == "Call" else 0.0
            features[idx, len(self.type_to_idx) + 3] = 1.0 if node_type in ["If", "For", "While", "Try"] else 0.0
            features[idx, len(self.type_to_idx) + 4] = (line / max_line) if max_line > 0 else 0.0

        # Construct Edge Index
        edges = list(G.edges())
        if edges:
            src = [node_map[u] for u, v in edges]
            dst = [node_map[v] for u, v in edges]
            # Bi-directional / undirected edges for better message passing
            edge_src = src + dst
            edge_dst = dst + src
            edge_index = torch.tensor([edge_src, edge_dst], dtype=torch.long)
        else:
            # Self-loops for empty graphs
            edge_index = torch.tensor([[0], [0]], dtype=torch.long)

        x = torch.tensor(features, dtype=torch.float32)

        # Build normalized adjacency A_hat = D^-0.5 * (A + I) * D^-0.5
        adj_dense = torch.eye(num_nodes, dtype=torch.float32)
        if edges:
            for u, v in edges:
                adj_dense[node_map[u], node_map[v]] = 1.0
                adj_dense[node_map[v], node_map[u]] = 1.0
        
        deg = torch.sum(adj_dense, dim=1)
        deg_inv_sqrt = torch.pow(deg.clamp(min=1e-5), -0.5)
        deg_mat = torch.diag(deg_inv_sqrt)
        norm_adj = deg_mat @ adj_dense @ deg_mat

        return {
            "x": x,
            "edge_index": edge_index,
            "norm_adj": norm_adj,
            "num_nodes": num_nodes,
            "num_edges": len(edges),
        }


# Singleton instance
parser = ASTGraphBuilder()
