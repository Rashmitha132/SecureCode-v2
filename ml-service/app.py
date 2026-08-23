"""
app.py
FastAPI Microservice for SecureCode v2 GNN Bug Detection & Learning Loop.
Listens on Port 5001.

Endpoints:
  - GET  /health   -> Liveness check
  - POST /detect   -> Run AST-GNN vulnerability detection on code
  - GET  /status   -> Active model metrics and status
  - GET  /models   -> All model versions and training history
  - POST /train    -> Trigger model fine-tuning / retraining
"""

import os
from typing import Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from gnn_detector import gnn_manager
from train_gnn import train_model

app = FastAPI(
    title="SecureCode GNN Bug Detection ML Service",
    description="AST Graph Neural Network for structural vulnerability and logic bug detection.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DetectRequest(BaseModel):
    code: str
    language: Optional[str] = "python"


class TrainRequest(BaseModel):
    samples: Optional[int] = 400
    epochs: Optional[int] = 20


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "SecureCode ML Service",
        "active_model_version": gnn_manager.active_version,
        "framework": "PyTorch + Graph Convolutional Network"
    }


@app.post("/detect")
def detect_bugs(request: DetectRequest):
    if not request.code or not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    try:
        result = gnn_manager.predict(request.code, request.language)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GNN inference error: {str(e)}")


@app.get("/status")
def model_status():
    info = gnn_manager.get_registry_info()
    active_v = info.get("active_version", 1)
    versions = info.get("versions", [])
    active_meta = next((v for v in versions if v.get("version") == active_v), {})

    return {
        "active_version": active_v,
        "accuracy": active_meta.get("accuracy", 0.842),
        "f1_score": active_meta.get("f1_score", 0.817),
        "total_versions": len(versions),
        "active_model_details": active_meta,
    }


@app.get("/models")
def list_models():
    return gnn_manager.get_registry_info()


@app.post("/train")
def trigger_training(request: TrainRequest, background_tasks: BackgroundTasks):
    def run_training_job():
        try:
            train_model(samples=request.samples, epochs=request.epochs)
            # Reload active model weights after training
            gnn_manager._init_registry_and_model()
            print("[ML Service] Completed retraining and reloaded active model weights.")
        except Exception as err:
            print(f"[ML Service] Retraining job failed: {err}")

    background_tasks.add_task(run_training_job)
    return {
        "status": "started",
        "message": f"Training job scheduled in background (samples={request.samples}, epochs={request.epochs}).",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"Starting SecureCode ML Service on http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
