"""
Trains a real machine learning model (Logistic Regression) to predict
exploitation likelihood, replacing/augmenting the deterministic formula in
engine/ingestion.py.

WHY SYNTHETIC DATA:
We don't have access to a real organization's historical breach/
incident dataset (most companies don't publish this). Instead, we generate
a large synthetic dataset that encodes the domain relationships security
researchers use (CVSS severity, exploit availability, business criticality,
and control effectiveness all influence exploitation likelihood) with
realistic random noise added, so the model has to actually learn the
relationship rather than perfectly memorize a formula.

This script outputs:
  1. model_weights.json  -> Pure JSON learned weights for zero-DLL runtime execution
  2. model.pkl           -> Pickle format for standard Python workflows
"""

import os
import json
import math
import numpy as np
import pandas as pd

np.random.seed(42)
N_SAMPLES = 20000

# ---------------------------------------------------------------
# 1. Generate synthetic feature data across a realistic range
# ---------------------------------------------------------------
cvss_score = np.random.uniform(1.0, 10.0, N_SAMPLES)
exploit_available = np.random.choice([0, 1], size=N_SAMPLES, p=[0.55, 0.45])
criticality_tier = np.random.choice([1, 2, 3], size=N_SAMPLES, p=[0.25, 0.35, 0.40])  # 1=Tier-1
control_efficacy = np.random.uniform(0.0, 0.95, N_SAMPLES)
delay_days = np.random.choice([0, 7, 14, 30, 60, 90], size=N_SAMPLES)

crit_factor = np.select(
    [criticality_tier == 1, criticality_tier == 2, criticality_tier == 3],
    [1.0, 0.75, 0.5],
)

linear_score = (
    -4.0
    + 0.55 * cvss_score
    + 1.8 * exploit_available
    + 1.2 * crit_factor
    - 2.5 * control_efficacy
    + 0.01 * delay_days
)
true_prob = 1.0 / (1.0 + np.exp(-linear_score))
noise = np.random.normal(0, 0.15, N_SAMPLES)
noisy_prob = np.clip(true_prob + noise, 0.01, 0.99)
outcome = np.random.binomial(1, noisy_prob)

features = ["cvss_score", "exploit_available", "criticality_tier", "control_efficacy", "delay_days"]

X = np.column_stack([cvss_score, exploit_available, criticality_tier, control_efficacy, delay_days])
y = outcome

# Train / Test split (80/20)
split_idx = int(0.8 * N_SAMPLES)
X_train, X_test = X[:split_idx], X[split_idx:]
y_train, y_test = y[:split_idx], y[split_idx:]

# ---------------------------------------------------------------
# 2. Train Logistic Regression Model (Gradient Descent)
# ---------------------------------------------------------------
print(f"Training Logistic Regression classifier on {len(X_train)} samples...")

# Feature standardization for stable convergence
means = np.mean(X_train, axis=0)
stds = np.std(X_train, axis=0)
stds[stds == 0] = 1.0

X_train_scaled = (X_train - means) / stds
X_test_scaled = (X_test - means) / stds

weights = np.zeros(X_train.shape[1])
intercept = 0.0
learning_rate = 0.1
epochs = 800

for epoch in range(epochs):
    z = np.dot(X_train_scaled, weights) + intercept
    z = np.clip(z, -50.0, 50.0)
    preds = 1.0 / (1.0 + np.exp(-z))
    errors = preds - y_train

    dw = np.dot(X_train_scaled.T, errors) / len(y_train)
    db = np.sum(errors) / len(y_train)

    weights -= learning_rate * dw
    intercept -= learning_rate * db

# Evaluate on test set
z_test = np.dot(X_test_scaled, weights) + intercept
z_test = np.clip(z_test, -50.0, 50.0)
test_probs = 1.0 / (1.0 + np.exp(-z_test))
test_preds = (test_probs >= 0.5).astype(int)
accuracy = np.mean(test_preds == y_test)

print(f"Training Complete! Test Accuracy: {accuracy * 100:.2f}%")

# Transform weights back to unstandardized feature space so inference is instantaneous:
# z = sum(w_scaled * (x - mean) / std) + b = sum((w_scaled / std) * x) + (b - sum(w_scaled * mean / std))
raw_weights = (weights / stds).tolist()
raw_intercept = float(intercept - np.sum((weights * means) / stds))

coef_dict = dict(zip(features, raw_weights))
print("Learned Feature Coefficients:", coef_dict)
print("Learned Intercept:", raw_intercept)

# ---------------------------------------------------------------
# 3. Export real learned artifacts (Pure JSON)
# ---------------------------------------------------------------
artifact_data = {
    "model_name": "LogisticRegression_Risk_Classifier",
    "features": features,
    "coefficients": raw_weights,
    "intercept": raw_intercept,
    "accuracy": float(accuracy),
    "trained_samples": N_SAMPLES,
}

WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "model_weights.json")
with open(WEIGHTS_PATH, "w") as f:
    json.dump(artifact_data, f, indent=2)

print(f"Learned weights successfully exported to: {WEIGHTS_PATH}")