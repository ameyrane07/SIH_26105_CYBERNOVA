from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


class Asset(Base):
    """
    Persistent enterprise asset inventory. One row per asset, updated
    in place as continuous telemetry, scan feeds, or EPSS scores arrive.
    """
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, default="default_org", index=True, nullable=False)
    name = Column(String, unique=True, index=True, nullable=False)

    # Technical Vulnerability Telemetry
    cve_id = Column(String, nullable=True)  # e.g., "CVE-2024-3094"
    cvss_score = Column(Float, nullable=False)
    epss_score = Column(Float, default=0.0, nullable=True)  # Live FIRST.org EPSS (0.0 to 1.0)
    exploit_available = Column(String, nullable=False)  # "Yes" / "No"
    mitre_tactic = Column(String, default="Initial Access", nullable=True)

    # Financial & Operational Metrics
    asset_value_inr = Column(Float, nullable=False)
    mitigation_cost_inr = Column(Float, nullable=False)
    engineering_hours = Column(Float, default=16.0, nullable=True)  # Secondary labor constraint
    business_criticality = Column(String, nullable=False)  # "Tier-1", "Tier-2", "Tier-3"
    control_efficacy = Column(Float, nullable=False)

    # Topology & Lateral Movement Modeling
    network_tier = Column(String, default="Application", nullable=False)  # "Edge / DMZ", "Application", "Data / Core", "Management / IAM"
    blast_radius_multiplier = Column(Float, default=1.0, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    snapshots = relationship("AssetSnapshot", back_populates="asset")
    outbound_edges = relationship("NetworkEdge", foreign_keys="NetworkEdge.source_id", back_populates="source_asset")
    inbound_edges = relationship("NetworkEdge", foreign_keys="NetworkEdge.target_id", back_populates="target_asset")


class NetworkEdge(Base):
    """
    Network connection or trust relationship between assets.
    Enables NetworkX graph construction, attack path chaining, and lateral movement analysis.
    """
    __tablename__ = "network_edges"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, default="default_org", index=True, nullable=False)

    source_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    target_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    protocol = Column(String, default="HTTPS/REST", nullable=False)
    weight = Column(Float, default=1.0, nullable=False)

    source_asset = relationship("Asset", foreign_keys=[source_id], back_populates="outbound_edges")
    target_asset = relationship("Asset", foreign_keys=[target_id], back_populates="inbound_edges")


class Scan(Base):
    """
    One row per optimization run (a 'scan'). Stores optimization parameters,
    budget allocations, Monte Carlo results, and statutory compliance scores.
    """
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, default="default_org", index=True, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # What-If & Operational Constraints
    budget = Column(Float, nullable=False)
    labor_hours_cap = Column(Float, default=500.0, nullable=True)  # Labor capacity limit
    delay_days = Column(Integer, default=0)
    mfa_boost = Column(Boolean, default=False)
    edr_active = Column(Boolean, default=True)
    pam_active = Column(Boolean, default=False)

    # Optimization Execution Summaries
    spent = Column(Float, nullable=False)
    hours_utilized = Column(Float, default=0.0, nullable=True)
    saved = Column(Float, nullable=False)
    residual = Column(Float, nullable=False)

    # Stochastic Value at Risk (Monte Carlo)
    expected_loss = Column(Float, nullable=True)
    var_95 = Column(Float, nullable=True)
    var_99 = Column(Float, nullable=True)

    # Statutory Regulatory Readiness Scores
    compliance_score = Column(Integer, nullable=True)  # Overall composite score
    compliance_rbi = Column(Integer, nullable=True)    # RBI CSCRF Readiness %
    compliance_dpdp = Column(Integer, nullable=True)   # DPDP Act 2023 %
    compliance_sebi = Column(Integer, nullable=True)   # SEBI CSCRF %

    snapshots = relationship("AssetSnapshot", back_populates="scan")


class AssetSnapshot(Base):
    """
    Per-asset result for a given scan run — decomposes the OpenFAIR loss
    and stores funded/deferred state computed by the Knapsack solver.
    """
    __tablename__ = "asset_snapshots"

    id = Column(Integer, primary_key=True, index=True)

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False)

    # Actuarial Risk Metrics
    pre_ale = Column(Float, nullable=False)
    post_ale = Column(Float, nullable=False)
    ale_saved = Column(Float, nullable=False)
    rosi_pct = Column(Float, nullable=False)

    # OpenFAIR Loss Magnitude Decomposition (Matching the Modal breakdown)
    downtime_loss = Column(Float, default=0.0, nullable=True)
    statutory_fine = Column(Float, default=0.0, nullable=True)
    incident_response_cost = Column(Float, default=0.0, nullable=True)

    # Knapsack Solver Allocation Status
    funded = Column(Boolean, default=False)
    allocation_order = Column(Integer, nullable=True)

    asset = relationship("Asset", back_populates="snapshots")
    scan = relationship("Scan", back_populates="snapshots")