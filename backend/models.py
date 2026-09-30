from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


class Asset(Base):
    """
    Persistent asset inventory. One row per asset, updated in place
    as new findings arrive — this is what makes the platform
    "continuous" rather than a one-shot CSV snapshot.
    """
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    cvss_score = Column(Float, nullable=False)
    asset_value_inr = Column(Float, nullable=False)
    mitigation_cost_inr = Column(Float, nullable=False)
    exploit_available = Column(String, nullable=False)  # "Yes" / "No"
    business_criticality = Column(String, nullable=False)  # "Tier-1" / "Tier-2" / "Tier-3"
    control_efficacy = Column(Float, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    snapshots = relationship("AssetSnapshot", back_populates="asset")


class Scan(Base):
    """
    One row per optimization run (a 'scan'). Stores the budget and
    what-if parameters used, plus the resulting summary metrics —
    this is what enables Risk Trend Analysis over time, named
    explicitly in the official SIH26105 brief.
    """
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    budget = Column(Float, nullable=False)
    delay_days = Column(Integer, default=0)
    mfa_boost = Column(Boolean, default=False)

    spent = Column(Float, nullable=False)
    saved = Column(Float, nullable=False)
    residual = Column(Float, nullable=False)

    expected_loss = Column(Float, nullable=True)
    var_95 = Column(Float, nullable=True)
    var_99 = Column(Float, nullable=True)

    compliance_score = Column(Integer, nullable=True)

    snapshots = relationship("AssetSnapshot", back_populates="scan")


class AssetSnapshot(Base):
    """
    Per-asset result for a given scan — the computed risk figures
    (ALE saved, ROSI, funded/deferred) at that point in time. Links
    an Asset to the Scan it was evaluated in, so history is queryable
    both by asset and by scan.
    """
    __tablename__ = "asset_snapshots"

    id = Column(Integer, primary_key=True, index=True)

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False)

    pre_ale = Column(Float, nullable=False)
    post_ale = Column(Float, nullable=False)
    ale_saved = Column(Float, nullable=False)
    rosi_pct = Column(Float, nullable=False)
    funded = Column(Boolean, default=False)

    asset = relationship("Asset", back_populates="snapshots")
    scan = relationship("Scan", back_populates="snapshots")