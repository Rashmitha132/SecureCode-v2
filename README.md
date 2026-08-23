# SecureCode v2 — Self-Improving Code Generation & Bug Detection System

SecureCode v2 is an end-to-end, closed-loop AI system combining:
1. **AI Code Generation** (Natural Language → Multi-language Source Code)
2. **Hybrid Vulnerability Detection** (Regex Pattern + Shannon Entropy + Groq LLM Semantic Analysis + PyTorch Graph Neural Network on AST)
3. **Automatic Vulnerability Repair** (Line-by-Line Side-by-Side Diff & 1-Click Patch Application)
4. **Closed-Loop Self-Learning Engine** (Feedback Persistence, Dynamic Few-Shot Generator Memory, Automated GNN Retraining)

---

## 🏗️ System Architecture

```
SecureCode/
├── frontend/                      ← React 19 + Vite (Port 5173)
│   ├── src/
│   │   ├── App.jsx               ← Main App with Sidebar Navigation
│   │   ├── GeneratePage.jsx      ← AI Code Generation Page
│   │   ├── RepairView.jsx        ← Side-by-Side & Unified Diff Viewer
│   │   ├── LearningDashboard.jsx ← Self-Learning Metrics & Lineage Charts
│   │   └── ProjectsPanel.jsx     ← Multi-Repo Projects Management
├── code-scan/                     ← Node.js + Express 5 Backend (Port 4000)
│   ├── detectors.js              ← Regex Pattern & Shannon Entropy Secret Scanners
│   ├── llmAnalyzer.js            ← Groq LLaMA/GPT Semantic Security Analyzer
│   ├── depScanner.js             ← OSV.dev CVE Vulnerability Scanner
│   ├── riskEngine.js             ← Unified Risk & Security Scoring Engine
│   ├── codeGenerator.js          ← Code Generation Module with Few-Shot RAG
│   ├── repairModule.js           ← Automated Code Repair & Patch Generator
│   ├── learningService.js        ← Self-Learning Loop & Retraining Trigger
│   ├── mlClient.js               ← Python GNN ML Service Client with Fallback
│   └── migrate.js                ← MySQL Database Migration Runner
├── ml-service/                    ← Python FastAPI Microservice (Port 5001)
│   ├── app.py                    ← FastAPI Server (POST /detect, POST /train)
│   ├── ast_parser.py             ← AST-to-Graph & PyTorch Tensor Pipeline
│   ├── gnn_detector.py           ← 3-Layer GCN + Dual-Head Bug Classifier
│   ├── train_gnn.py              ← GNN Training & Model Versioning Pipeline
│   ├── data_generator.py         ← Synthetic Bug Mutation & Dataset Loader
│   └── models/
│       ├── registry.json         ← Model Registry Lineage Metadata
│       └── gnn_v2.pt             ← Active Trained GNN Model Weights
└── datasets/                      ← Benchmark & Evaluation Datasets
    ├── download_datasets.py      ← HumanEval, MBPP, Devign Preparation Script
    ├── humaneval/                ← Code Generation Test Harnesses
    └── devign/                   ← Defect Detection AST Graph Benchmark
```

---

## 🚀 Getting Started

### 1. Database Setup (MySQL)
Configure MySQL credentials in `code-scan/.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=SecureCode
GROQ_API_KEY=gsk_your_groq_api_key
```

Run database migrations:
```bash
cd code-scan
node migrate.js
```

---

### 2. Start Python GNN ML Service (Port 5001)
```bash
cd ml-service
python -m pip install -r requirements.txt
python app.py
```

---

### 3. Start Backend API Server (Port 4000)
```bash
cd code-scan
npm install
node index.js
```

---

### 4. Start React Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔄 End-to-End Self-Learning Workflow

1. **Generate Code**: Go to **Generate Code**, enter a prompt (e.g., *"Write an authentication function in Python"*), select a language, and generate.
2. **Scan Code**: Click **"Analyze This Code for Security Issues"** to run Pattern + Entropy + LLM + GNN analysis in parallel.
3. **Auto-Repair**: If issues are found, click **"Auto-Repair Bugs"** to view line-by-line additions (green) and deletions (red). Click **"Accept & Apply Security Patch"** to re-scan.
4. **Learning & Self-Improvement**: User ratings and verified repairs are recorded into MySQL. The GNN automatically fine-tunes itself when samples accumulate, and the Generator uses verified past code as few-shot prompt memory.
5. **Inspect Progress**: Open **Learning Progress** to inspect Accuracy, F1-scores, and model lineage charts across iterations.
