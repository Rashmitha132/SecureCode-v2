"""
streamlit_app.py
SecureCode v2 — Complete AI Code Security Platform
Embedded full-stack production application for Streamlit deployment.
"""

import os
import sys
import time
import subprocess
import threading
import http.server
import socketserver
import urllib.request
import streamlit as st
import streamlit.components.v1 as components

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
CODE_SCAN_DIR = os.path.join(BASE_DIR, "code-scan")
ML_SERVICE_DIR = os.path.join(BASE_DIR, "ml-service")
STATIC_PORT = 5174

# Sync Streamlit Cloud secrets into environment if configured
try:
    for key, value in st.secrets.items():
        if key not in os.environ:
            os.environ[key] = str(value)
except Exception:
    pass

# Ensure frontend dist is built
if not os.path.exists(FRONTEND_DIST) or not os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
    try:
        subprocess.run(["npm", "run", "build"], cwd=os.path.join(BASE_DIR, "frontend"), shell=True)
    except Exception as e:
        print(f"[SecureCode] Frontend build note: {e}")

import socket

# -----------------------------------------------------------------------------
# 1. AUTO-START BACKEND SERVICES IN BACKGROUND
# -----------------------------------------------------------------------------
def is_port_open(port):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            return s.connect_ex(("127.0.0.1", port)) == 0
    except Exception:
        return False

# Start Backend on port 4000 if not active
if not is_port_open(4000):
    started = False
    try:
        subprocess.Popen(["node", "index.js"], cwd=CODE_SCAN_DIR, shell=True)
        time.sleep(0.6)
        if is_port_open(4000):
            started = True
            print(">>> [SecureCode] Connected to Node.js Backend & MySQL Database (Port 4000)")
    except Exception:
        pass

    if not started and not is_port_open(4000):
        try:
            subprocess.Popen([sys.executable, "app.py"], cwd=ML_SERVICE_DIR, shell=True)
            print(">>> [SecureCode] Connected to Unified Python AI Backend (Port 4000)")
        except Exception as e:
            print(f"[SecureCode] Python backend launch note: {e}")
else:
    print(">>> [SecureCode] Backend Service is ACTIVE (Port 4000)")

# Start ML service on port 5001 if not active
if not is_port_open(5001):
    try:
        subprocess.Popen([sys.executable, "app.py"], cwd=ML_SERVICE_DIR, shell=True)
        print(">>> [SecureCode] Connected to PyTorch GNN ML Service (Port 5001)")
    except Exception as e:
        print(f"[SecureCode] ML Service launch note: {e}")
else:
    print(">>> [SecureCode] PyTorch GNN ML Service is ACTIVE (Port 5001)")

# -----------------------------------------------------------------------------
# 2. STANDALONE PRODUCTION BUNDLE INLINER
# -----------------------------------------------------------------------------
def get_inlined_react_html():
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    css_code = ""
    js_code = ""
    if os.path.exists(assets_dir):
        for f in os.listdir(assets_dir):
            full_p = os.path.join(assets_dir, f)
            if f.endswith(".css"):
                with open(full_p, "r", encoding="utf-8") as file:
                    css_code += file.read() + "\n"
            elif f.endswith(".js"):
                with open(full_p, "r", encoding="utf-8") as file:
                    js_code += file.read() + "\n"

    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SecureCode — AI Code Security</title>
    <style>
      {css_code}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      {js_code}
    </script>
  </body>
</html>"""

# -----------------------------------------------------------------------------
# 3. STREAMLIT EMBEDDED VIEWPORT (100% EXACT REACT DESIGN)
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="SecureCode — AI Code Security",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
    /* 1. Hide Streamlit Header, Footer, Toolbar, Crown Badge, ViewerBadges, and Running Status */
    header, 
    footer, 
    #MainMenu, 
    [data-testid="stHeader"], 
    [data-testid="stSidebar"], 
    [data-testid="collapsedControl"], 
    [data-testid="stToolbar"], 
    [data-testid="stDecoration"],
    [data-testid="stStatusWidget"],
    [data-testid="stViewerBadge"],
    [data-testid="manage-app-button"],
    [data-testid="stConnectionStatus"],
    .viewerBadge,
    .stDeployButton,
    .stActionButton,
    div[class*="viewerBadge"],
    div[class*="manage-app"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
        pointer-events: none !important;
    }

    /* 2. Remove all outer page margins and scrollbars */
    html, body, .stApp, [data-testid="stAppViewContainer"], [data-testid="stMain"], section.main {
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        overflow-y: hidden !important;
        width: 100% !important;
        height: 100vh !important;
        max-width: 100% !important;
        max-height: 100vh !important;
        background: #08090f !important;
    }

    .block-container, 
    [data-testid="stMainBlockContainer"], 
    [data-testid="stAppViewBlockContainer"], 
    [data-testid="stVerticalBlock"] {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        height: 100vh !important;
        overflow: hidden !important;
    }

    div[data-testid="element-container"], 
    div.stCustomComponentV1 {
        width: 100% !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
    }

    /* 3. Lock iframe and content fixed to all 4 edges of the viewport */
    iframe,
    div.stCustomComponentV1 iframe {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 999999 !important;
    }
</style>
""", unsafe_allow_html=True)

# Mount the complete React application directly inside Streamlit with zero outer iframe scrollbar
components.html(get_inlined_react_html(), height=1000, scrolling=False)
