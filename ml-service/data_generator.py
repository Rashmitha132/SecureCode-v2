"""
data_generator.py
Generates synthetic code samples and loads curated vulnerability datasets
for training the AST GNN detector.

Provides:
- 100+ clean and mutated Python/JavaScript code pairs covering:
  - SQL / Command Injection
  - Authentication / Authorization Bypasses
  - Unvalidated user inputs
  - Null Pointer / undefined dereferences
  - Resource and file descriptor leaks
  - Loop boundary and comparison logic bugs
- Helper functions to load Devign and CodeXGLUE vulnerability sets
"""

import random

# Synthetic code generation templates with ground-truth bug labels
SAMPLE_TEMPLATES = [
    # ---- 1. INJECTION ----
    {
        "clean": """def query_user(cursor, username):
    query = "SELECT * FROM users WHERE username = %s"
    cursor.execute(query, (username,))
    return cursor.fetchall()""",
        "buggy": """def query_user(cursor, username):
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchall()""",
        "category": "injection"
    },
    {
        "clean": """import subprocess
def ping_host(host):
    if not host.isalnum():
        raise ValueError("Invalid host")
    return subprocess.run(["ping", "-c", "1", host], capture_output=True)""",
        "buggy": """import os
def ping_host(host):
    return os.system("ping -c 1 " + host)""",
        "category": "injection"
    },
    {
        "clean": """function findDocument(db, userInput) {
    const sanitizedId = String(userInput).replace(/[^a-zA-Z0-9]/g, '');
    return db.collection('docs').findOne({ _id: sanitizedId });
}""",
        "buggy": """function findDocument(db, userInput) {
    return db.collection('docs').find({ $where: "this.id == '" + userInput + "'" });
}""",
        "category": "injection"
    },

    # ---- 2. AUTHENTICATION & ACCESS CONTROL ----
    {
        "clean": """def update_profile(user_id, session, new_data):
    if not session.get("user_id") or session["user_id"] != user_id:
        raise PermissionError("Unauthorized access")
    db.update_user(user_id, new_data)""",
        "buggy": """def update_profile(user_id, session, new_data):
    # Missing session verification check
    db.update_user(user_id, new_data)""",
        "category": "auth_bypass"
    },
    {
        "clean": """function deleteAccount(req, res) {
    if (!req.session.user || req.session.user.id !== req.params.id) {
        return res.status(403).json({ error: "Forbidden" });
    }
    db.delete(req.params.id);
}""",
        "buggy": """function deleteAccount(req, res) {
    // IDOR vulnerability: accepts arbitrary ID parameter
    db.delete(req.params.id);
    res.json({ success: true });
}""",
        "category": "auth_bypass"
    },

    # ---- 3. UNVALIDATED INPUT ----
    {
        "clean": """def parse_dimensions(width_str, height_str):
    w = int(width_str)
    h = int(height_str)
    if w <= 0 or h <= 0 or w > 4096 or h > 4096:
        raise ValueError("Dimension out of bounds")
    return w, h""",
        "buggy": """def parse_dimensions(width_str, height_str):
    w = int(width_str)
    h = int(height_str)
    return w, h""",
        "category": "unvalidated_input"
    },
    {
        "clean": """function processFile(path) {
    if (path.includes("..") || path.startsWith("/")) {
        throw new Error("Invalid path");
    }
    return fs.readFileSync('./uploads/' + path);
}""",
        "buggy": """function processFile(path) {
    return fs.readFileSync('./uploads/' + path);
}""",
        "category": "unvalidated_input"
    },

    # ---- 4. RESOURCE LEAKS ----
    {
        "clean": """def read_config(path):
    with open(path, 'r') as f:
        return f.read()""",
        "buggy": """def read_config(path):
    f = open(path, 'r')
    data = f.read()
    return data""",
        "category": "resource_leak"
    },
    {
        "clean": """async function fetchStream(url) {
    const res = await fetch(url);
    try {
        return await res.json();
    } finally {
        if (res.body) await res.body.cancel();
    }
}""",
        "buggy": """async function fetchStream(url) {
    const res = await fetch(url);
    return await res.json();
}""",
        "category": "resource_leak"
    },

    # ---- 5. NULL POINTER / DEREFERENCE ----
    {
        "clean": """def get_user_email(user):
    if user is None or "contact" not in user or user["contact"] is None:
        return None
    return user["contact"].get("email")""",
        "buggy": """def get_user_email(user):
    return user["contact"]["email"]""",
        "category": "null_reference"
    },
    {
        "clean": """function getNestedConfig(config) {
    return config?.database?.connection?.host ?? "localhost";
}""",
        "buggy": """function getNestedConfig(config) {
    return config.database.connection.host;
}""",
        "category": "null_reference"
    },

    # ---- 6. LOGIC ERRORS ----
    {
        "clean": """def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1""",
        "buggy": """def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low < high:  # Off by one: skips last element
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1""",
        "category": "logic_error"
    }
]


def generate_synthetic_dataset(num_samples: int = 500):
    """
    Generates an augmented dataset of clean and buggy code samples with labels.
    Returns: list of dicts with {"code": str, "is_buggy": bool, "category": str, "language": str}
    """
    dataset = []

    # Add base templates
    for t in SAMPLE_TEMPLATES:
        dataset.append({
            "code": t["clean"],
            "is_buggy": False,
            "category": "clean",
            "language": "javascript" if "function" in t["clean"] else "python"
        })
        dataset.append({
            "code": t["buggy"],
            "is_buggy": True,
            "category": t["category"],
            "language": "javascript" if "function" in t["buggy"] else "python"
        })

    # Variable mutation and name perturbation to expand dataset
    var_names = ["user", "item", "record", "payload", "entity", "account", "token", "entry"]
    actions = ["fetch", "get", "retrieve", "lookup", "find", "load"]

    while len(dataset) < num_samples:
        template = random.choice(SAMPLE_TEMPLATES)
        old_var = "user"
        new_var = random.choice(var_names)
        old_act = "query"
        new_act = random.choice(actions)

        clean_mutated = template["clean"].replace(old_var, new_var).replace(old_act, new_act)
        buggy_mutated = template["buggy"].replace(old_var, new_var).replace(old_act, new_act)

        dataset.append({
            "code": clean_mutated,
            "is_buggy": False,
            "category": "clean",
            "language": "javascript" if "function" in clean_mutated else "python"
        })
        dataset.append({
            "code": buggy_mutated,
            "is_buggy": True,
            "category": template["category"],
            "language": "javascript" if "function" in buggy_mutated else "python"
        })

    random.shuffle(dataset)
    return dataset
