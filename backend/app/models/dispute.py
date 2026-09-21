# Stores generated dispute emails for overcharged invoices and lifecycle events.
from sqlalchemy import BigInteger, Column, String, ForeignKey, Enum, Text, Float, Date, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.models.base import Base

class DisputeStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACCEPTED = "ACCEPTED"
    PARTIALLY_APPROVED = "PARTIALLY_APPROVED"
    REJECTED = "REJECTED"
    REFUNDED = "REFUNDED"
    ESCALATED = "ESCALATED"
    EXPIRED = "EXPIRED"

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(BigInteger, primary_key=True, index=True)
    invoice_id = Column(BigInteger, ForeignKey("invoices.id"), nullable=False)
    discrepancy_id = Column(BigInteger, ForeignKey("discrepancies.id"), nullable=True)
    carrier = Column(String(100), nullable=False)
    draft_body = Column(Text, nullable=True)          # the generated email text
    status = Column(Enum(DisputeStatus, name="disputestatus"), default=DisputeStatus.DRAFT)

    # Tracking & Resolution Fields
    claimed_amount = Column(Float, nullable=True, default=0.0)
    recovered_amount = Column(Float, nullable=True, default=0.0)
    response_date = Column(Date, nullable=True)
    carrier_response = Column(Text, nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    escalated = Column(Boolean, default=False, nullable=False)
    follow_up_date = Column(Date, nullable=True)

    invoice = relationship("Invoice", back_populates="disputes")
    discrepancy = relationship("Discrepancy")
    events = relationship("DisputeEvent", back_populates="dispute", cascade="all, delete-orphan", order_by="DisputeEvent.created_at.asc()")

class DisputeEvent(Base):
    __tablename__ = "dispute_events"

    id = Column(BigInteger, primary_key=True, index=True)
    dispute_id = Column(BigInteger, ForeignKey("disputes.id"), nullable=False)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    dispute = relationship("Dispute", back_populates="events")