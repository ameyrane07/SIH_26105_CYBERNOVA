import os

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "cybernova_graph")

class GraphStore:
    def __init__(self):
        self.driver = None
        try:
            from neo4j import GraphDatabase
            self.driver = GraphDatabase.driver(
                NEO4J_URI,
                auth=(NEO4J_USER, NEO4J_PASSWORD),
                max_connection_lifetime=30 * 60,
                max_connection_pool_size=50
            )
            # Verify connectivity without crashing if offline
            self.driver.verify_connectivity()
            print("[Neo4j] Connected to graph database cluster.")
        except Exception:
            # Clean fallback: App continues using in-memory NetworkX
            self.driver = None
            print("[Neo4j] Instance offline. Using local in-memory NetworkX graph engine.")

    def close(self):
        if self.driver:
            self.driver.close()

    def sync_attack_topology(self, nodes: list, edges: list):
        """
        Persists lateral movement nodes and blast radius edges to Neo4j.
        """
        if not self.driver:
            return {"status": "skipped", "mode": "networkx_memory_only"}

        cypher_query = """
        UNWIND $nodes AS n
        MERGE (a:Asset {id: n.id})
        SET a.label = n.label,
            a.tier = n.tier,
            a.risk_score = n.risk_score,
            a.is_crown_jewel = n.is_crown_jewel
        WITH true AS pass
        UNWIND $edges AS e
        MATCH (src:Asset {id: e.source})
        MATCH (dst:Asset {id: e.target})
        MERGE (src)-[r:CAN_PIVOT_TO]->(dst)
        SET r.weight = e.weight,
            r.attack_vector = e.vector
        """
        try:
            with self.driver.session() as session:
                session.run(cypher_query, nodes=nodes, edges=edges)
            return {"status": "success", "nodes_synced": len(nodes), "edges_synced": len(edges)}
        except Exception as e:
            return {"status": "error", "message": str(e)}

# Export single instance
graph_db = GraphStore()