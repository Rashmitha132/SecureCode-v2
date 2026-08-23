"""
train_gnn.py
Training pipeline for the AST GNN Bug Detector.

Usage:
    python train_gnn.py [--samples 600] [--epochs 30]
"""

import os
import json
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from datetime import datetime
from sklearn.metrics import accuracy_score, f1_score

from ast_parser import parser
from gnn_detector import ASTGNNClassifier, BUG_CATEGORIES
from data_generator import generate_synthetic_dataset

CATEGORY_TO_IDX = {cat: i for i, cat in enumerate(BUG_CATEGORIES)}


def prepare_graph_data(dataset):
    """Parses code samples into pre-computed tensors."""
    graph_samples = []
    for item in dataset:
        try:
            g = parser.code_to_graph(item["code"], item.get("language", "python"))
            tensors = parser.graph_to_tensors(g)
            
            binary_label = 1 if item["is_buggy"] else 0
            category_label = CATEGORY_TO_IDX.get(item.get("category", "clean"), 0)

            graph_samples.append({
                "x": tensors["x"],
                "norm_adj": tensors["norm_adj"],
                "binary_label": torch.tensor([binary_label], dtype=torch.long),
                "category_label": torch.tensor([category_label], dtype=torch.long),
            })
        except Exception as e:
            continue
    return graph_samples


def train_model(samples: int = 500, epochs: int = 25, lr: float = 0.003):
    print("=" * 60)
    print(f"[TRAIN] Starting GNN Bug Detector Training (Samples={samples}, Epochs={epochs})")
    print("=" * 60)

    # 1. Generate & parse dataset
    print("[DATA] Generating and parsing AST graph dataset...")
    raw_data = generate_synthetic_dataset(num_samples=samples)
    graph_data = prepare_graph_data(raw_data)
    
    split_idx = int(len(graph_data) * 0.8)
    train_data = graph_data[:split_idx]
    val_data = graph_data[split_idx:]
    print(f"[DATA] Prepared {len(train_data)} training and {len(val_data)} validation AST graphs.")

    # 2. Initialize Model & Optimizer
    model = ASTGNNClassifier()
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    criterion_binary = nn.CrossEntropyLoss()
    criterion_cat = nn.CrossEntropyLoss()

    best_val_f1 = 0.0
    best_state_dict = None
    best_metrics = {}

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0

        for sample in train_data:
            optimizer.zero_grad()
            bin_out, cat_out, _ = model(sample["x"], sample["norm_adj"])
            
            loss_bin = criterion_binary(bin_out, sample["binary_label"])
            loss_cat = criterion_cat(cat_out, sample["category_label"])
            loss = loss_bin + 0.5 * loss_cat

            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        scheduler.step()
        avg_train_loss = total_loss / len(train_data)

        # Validation phase
        model.eval()
        true_binary = []
        pred_binary = []

        with torch.no_grad():
            for sample in val_data:
                bin_out, _, _ = model(sample["x"], sample["norm_adj"])
                pred = torch.argmax(bin_out, dim=1).item()
                pred_binary.append(pred)
                true_binary.append(sample["binary_label"].item())

        val_acc = accuracy_score(true_binary, pred_binary)
        val_f1 = f1_score(true_binary, pred_binary, zero_division=0)

        if epoch % 5 == 0 or epoch == epochs or val_f1 > best_val_f1:
            print(f"Epoch [{epoch:02d}/{epochs:02d}] | Train Loss: {avg_train_loss:.4f} | Val Acc: {val_acc * 100:.1f}% | Val F1: {val_f1 * 100:.1f}%")

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_state_dict = model.state_dict().copy()
            best_metrics = {
                "accuracy": round(float(val_acc), 4),
                "f1_score": round(float(val_f1), 4),
                "trained_on": len(train_data),
            }

    # 3. Save Model & Update Registry
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    os.makedirs(models_dir, exist_ok=True)
    registry_path = os.path.join(models_dir, "registry.json")

    registry = {"active_version": 1, "versions": []}
    if os.path.exists(registry_path):
        try:
            with open(registry_path, "r") as f:
                registry = json.load(f)
        except Exception:
            pass

    next_version = len(registry.get("versions", [])) + 1
    model_filename = f"gnn_v{next_version}.pt"
    save_path = os.path.join(models_dir, model_filename)

    if best_state_dict is not None:
        torch.save(best_state_dict, save_path)
    else:
        torch.save(model.state_dict(), save_path)

    version_record = {
        "version": next_version,
        "accuracy": best_metrics.get("accuracy", round(val_acc, 4)),
        "f1_score": best_metrics.get("f1_score", round(val_f1, 4)),
        "trained_on": len(train_data),
        "path": model_filename,
        "created_at": datetime.now().isoformat(),
        "notes": f"Trained on {len(train_data)} AST graphs across {len(BUG_CATEGORIES)} vulnerability classes"
    }

    registry["active_version"] = next_version
    registry["versions"].append(version_record)

    with open(registry_path, "w") as f:
        json.dump(registry, f, indent=2)

    print("=" * 60)
    print(f"[COMPLETE] Training complete! Saved Model Version {next_version} ({model_filename})")
    print(f"[METRICS] Accuracy: {version_record['accuracy'] * 100:.1f}% | F1 Score: {version_record['f1_score'] * 100:.1f}%")
    print("=" * 60)
    return version_record


if __name__ == "__main__":
    parser_arg = argparse.ArgumentParser()
    parser_arg.add_argument("--samples", type=int, default=400)
    parser_arg.add_argument("--epochs", type=int, default=20)
    args = parser_arg.parse_args()

    train_model(samples=args.samples, epochs=args.epochs)
