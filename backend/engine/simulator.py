import numpy as np
import pandas as pd

def run_monte_carlo_var(df: pd.DataFrame, iterations: int = 10000):
    total_samples = np.zeros(iterations)

    for _, row in df.iterrows():
        p = float(row["Likelihood"])
        impact = float(row["Asset_Value_INR"])

    
        events = np.random.poisson(lam=p, size=iterations)

        min_loss = impact * 0.2
        mode_loss = impact * 0.6
        max_loss = impact * 1.5

        alpha = 1 + 4 * (mode_loss - min_loss) / (max_loss - min_loss)
        beta = 1 + 4 * (max_loss - mode_loss) / (max_loss - min_loss)

        loss_amounts = min_loss + np.random.beta(alpha, beta, size=iterations) * (max_loss - min_loss)
        total_samples += events * loss_amounts

    var_95 = float(np.percentile(total_samples, 95))
    var_99 = float(np.percentile(total_samples, 99))
    expected_loss = float(np.mean(total_samples))

    return {
        "expected_loss": round(expected_loss, 2),
        "var_95": round(var_95, 2),
        "var_99": round(var_99, 2),
    }