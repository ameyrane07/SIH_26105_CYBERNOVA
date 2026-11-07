import pandas as pd
from celery_worker import celery_app
from engine.simulator import run_monte_carlo_var
from engine.topology import AttackTopologyEngine

@celery_app.task(bind=True, name="tasks.run_monte_carlo_task")
def run_monte_carlo_task(self, allocations_data: list):
    """Executes 10,000 iterations of OpenFAIR Monte Carlo simulation asynchronously."""
    self.update_state(state="PROGRESS", meta={"status": "Crunching 10,000 Monte Carlo runs..."})
    df_allocated = pd.DataFrame(allocations_data)
    sim_results = run_monte_carlo_var(df_allocated)
    return sim_results

@celery_app.task(bind=True, name="tasks.build_topology_task")
def build_topology_task(self, records: list):
    """Executes NetworkX graph traversal and blast radius propagation asynchronously."""
    self.update_state(state="PROGRESS", meta={"status": "Traversing attack paths..."})
    engine = AttackTopologyEngine()
    topology_data = engine.build_enterprise_topology(records)
    return topology_data