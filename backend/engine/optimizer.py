import pandas as pd
from ortools.linear_solver import pywraplp


def run_knapsack_optimizer(df: pd.DataFrame, budget_inr: float):
    """
    Solves the budget-constrained mitigation selection problem as a
    0/1 knapsack using a Mixed-Integer Linear Program (MILP), via
    Google OR-Tools' CBC solver.

    This replaces the earlier hand-rolled dynamic-programming knapsack.
    Same inputs, same outputs (df_res, spent, saved, residual) — the
    calling code in main.py does not need to change.

    Using a real MILP solver removes the earlier scaling/precision
    trade-off (previously costs and budget were divided by 10,000 to
    keep a DP table a manageable size). OR-Tools works directly in
    rupees and also scales more cleanly if additional constraints
    (e.g. per-category budget caps) are added later.
    """
    n = len(df)
    costs = df["Mitigation_Cost_INR"].astype(float).tolist()
    values = df["ALE_Saved"].astype(float).tolist()

    solver = pywraplp.Solver.CreateSolver("CBC")
    if solver is None:
        raise RuntimeError("Could not create OR-Tools CBC solver.")

    # One binary decision variable per asset: 1 = fund it, 0 = defer it.
    x = [solver.BoolVar(f"x_{i}") for i in range(n)]

    # Budget constraint: total spend across chosen assets must not exceed budget.
    solver.Add(solver.Sum(costs[i] * x[i] for i in range(n)) <= budget_inr)

    # Objective: maximize total ALE Saved across chosen assets.
    solver.Maximize(solver.Sum(values[i] * x[i] for i in range(n)))

    status = solver.Solve()

    df_res = df.copy()
    df_res["Funded_By_Budget"] = False

    if status in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        chosen = [i for i in range(n) if x[i].solution_value() > 0.5]
        df_res.loc[chosen, "Funded_By_Budget"] = True

    spent = df_res[df_res["Funded_By_Budget"]]["Mitigation_Cost_INR"].sum()
    saved = df_res[df_res["Funded_By_Budget"]]["ALE_Saved"].sum()
    residual = df_res["Pre_ALE"].sum() - saved

    return df_res, spent, saved, residual
