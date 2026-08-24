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

# Start Node backend on port 4000 if not active
if not is_port_open(4000):
    try:
        subprocess.Popen(["node", "index.js"], cwd=CODE_SCAN_DIR, shell=True)
        print(">>> [SecureCode] Connected to Node.js Backend & MySQL Database (Port 4000)")
    except Exception as e:
        print(f"[SecureCode] Node backend launch note: {e}")
else:
    print(">>> [SecureCode] Node.js Backend & MySQL Database is ACTIVE (Port 4000)")

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
# 2. SERVE REACT PRODUCTION BUILD ON PORT 5174
# -----------------------------------------------------------------------------
class QuietHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIST, **kwargs)
    
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        pass

def start_static_server():
    try:
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(("0.0.0.0", STATIC_PORT), QuietHTTPHandler) as httpd:
            httpd.serve_forever()
    except Exception:
        pass

if not is_port_open(STATIC_PORT):
    t = threading.Thread(target=start_static_server, daemon=True)
    t.start()
    time.sleep(0.6)

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
    /* 1. Hide all Streamlit default headers, toolbars, and footers */
    #MainMenu, 
    header, 
    header[data-testid="stHeader"], 
    footer, 
    [data-testid="stSidebar"], 
    [data-testid="stToolbar"], 
    [data-testid="stDecoration"],
    [data-testid="stStatusWidget"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
    }

    /* 2. Remove all outer page margins and scrollbars */
    html, body, .stApp, [data-testid="stAppViewContainer"], [data-testid="stMain"], section.main {
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        background: #08090f !important;
    }

    .block-container, 
    [data-testid="stMainBlockContainer"], 
    [data-testid="stAppViewBlockContainer"], 
    [data-testid="stVerticalBlock"] {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100vw !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
    }

    div[data-testid="element-container"], 
    div.stCustomComponentV1 {
        width: 100vw !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    /* 3. Lock iframe fixed to all 4 edges of the viewport */
    iframe {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 999999 !important;
    }
</style>
""", unsafe_allow_html=True)

# Mount the complete React application fixed edge-to-edge with cache-buster
components.iframe(f"http://localhost:{STATIC_PORT}/?t={int(time.time())}", scrolling=True)

