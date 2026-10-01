import networkx as nx
from typing import List, Dict, Any

class AttackTopologyEngine:
    def __init__(self):
        self.graph = nx.DiGraph()

    def build_enterprise_topology(self, assets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Builds a directed enterprise attack graph connecting assets based on
        infrastructure tiers (DMZ, Application, Core Data, Identity).
        Computes blast radius and lateral movement vulnerability chains.
        """
        self.graph.clear()
        
        tier_map = {
            "Edge / DMZ": [],
            "Application": [],
            "Data / Core": [],
            "Management / IAM": []
        }

        for idx, asset in enumerate(assets):
            # Extract names & IDs supporting all DataFrame column variations
            name = (
                asset.get("Asset") or 
                asset.get("asset_name") or 
                asset.get("name") or 
                asset.get("Asset_ID") or 
                f"Asset-{idx+1}"
            )
            asset_id = str(asset.get("id") or name or f"node_{idx}")
            
            crit_raw = asset.get("Business_Criticality") or asset.get("criticality") or "Tier-2"
            crit_str = str(crit_raw).lower()
            is_tier1 = "tier-1" in crit_str or "tier 1" in crit_str or crit_raw == 1 or crit_raw == "1"

            ale = float(
                asset.get("ALE_Saved") or 
                asset.get("ale_saved") or 
                asset.get("pre_ale") or 
                asset.get("ale") or 
                0.0
            )
            cvss = float(
                asset.get("CVSS_Score") or 
                asset.get("cvss_score") or 
                asset.get("cvss") or 
                5.0
            )
            is_funded = bool(
                asset.get("Funded_By_Budget") or 
                asset.get("funded") or 
                asset.get("is_funded") or 
                False
            )
            vulnerability = str(
                asset.get("Vulnerability") or 
                asset.get("vulnerability") or 
                asset.get("cve_id") or 
                "Standard Vulnerability"
            )

            # Classify into architectural tiers
            name_lower = str(name).lower()
            if any(k in name_lower for k in ["gateway", "dmz", "portal", "web", "public", "api", "edge", "vpn"]):
                tier = "Edge / DMZ"
            elif any(k in name_lower for k in ["db", "database", "core", "oracle", "postgres", "sql", "vault", "ledger"]):
                tier = "Data / Core"
            elif any(k in name_lower for k in ["ad", "auth", "iam", "ldap", "controller", "pam", "domain", "keycloak"]):
                tier = "Management / IAM"
            else:
                tier = "Application"

            tier_map[tier].append(asset_id)

            self.graph.add_node(
                asset_id,
                name=name,
                tier=tier,
                criticality=1 if is_tier1 else 2,
                ale=ale,
                is_tier1=is_tier1,
                is_funded=is_funded,
                cvss=cvss,
                vulnerability=vulnerability
            )

        # Establish directed attack paths:
        # 1. Edge / DMZ -> Application
        for edge_id in tier_map["Edge / DMZ"]:
            for app_id in tier_map["Application"]:
                self.graph.add_edge(edge_id, app_id, protocol="HTTPS/REST", weight=1.0)

        # 2. Application -> Core Data
        for app_id in tier_map["Application"]:
            for db_id in tier_map["Data / Core"]:
                self.graph.add_edge(app_id, db_id, protocol="SQL/gRPC", weight=1.5)

        # 3. Direct Edge -> Core Data fallback if no application nodes
        if not tier_map["Application"]:
            for edge_id in tier_map["Edge / DMZ"]:
                for db_id in tier_map["Data / Core"]:
                    self.graph.add_edge(edge_id, db_id, protocol="Direct/Ingress", weight=2.0)

        # 4. Management / IAM governs all tiers
        for iam_id in tier_map["Management / IAM"]:
            for target_id in list(self.graph.nodes):
                if target_id != iam_id:
                    self.graph.add_edge(iam_id, target_id, protocol="Kerberos/SSH", weight=0.5)

        return self.calculate_metrics()

    def calculate_metrics(self) -> Dict[str, Any]:
        """Calculates blast radius, high-risk pivot paths, and formatted nodes/edges for the UI."""
        nodes_payload = []
        edges_payload = []

        tier1_targets = [n for n, d in self.graph.nodes(data=True) if d.get("is_tier1")]

        for node_id, data in self.graph.nodes(data=True):
            descendants = nx.descendants(self.graph, node_id)
            blast_radius_ale = sum(self.graph.nodes[d].get("ale", 0.0) for d in descendants)

            can_pivot_to_tier1 = any(t1 in descendants for t1 in tier1_targets)

            nodes_payload.append({
                "id": node_id,
                "name": data["name"],
                "tier": data["tier"],
                "criticality": data["criticality"],
                "ale": data["ale"],
                "cvss": data["cvss"],
                "vulnerability": data["vulnerability"],
                "is_tier1": data["is_tier1"],
                "is_funded": data["is_funded"],
                "blast_radius_count": len(descendants),
                "blast_radius_ale": round(blast_radius_ale, 2),
                "can_pivot_to_tier1": can_pivot_to_tier1
            })

        for u, v, data in self.graph.edges(data=True):
            edges_payload.append({
                "source": self.graph.nodes[u]["name"],
                "target": self.graph.nodes[v]["name"],
                "protocol": data.get("protocol", "TCP"),
                "is_critical_path": bool(self.graph.nodes[u].get("is_tier1") or self.graph.nodes[v].get("is_tier1"))
            })

        return {
            "nodes": nodes_payload,
            "edges": edges_payload,
            "total_nodes": len(nodes_payload),
            "total_edges": len(edges_payload),
            "critical_chokepoints": [
                n["name"] for n in nodes_payload if n["blast_radius_count"] >= 1 and not n["is_funded"]
            ]
        }