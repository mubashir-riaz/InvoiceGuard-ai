# Stores generated dispute emails for overcharged invoices.
from sqlalchemy import BigInteger, Column, String, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
import enum
from app.models.base import Base

class DisputeStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(BigInteger, primary_key=True, index=True)
    invoice_id = Column(BigInteger, ForeignKey("invoices.id"), nullable=False)
    discrepancy_id = Column(BigInteger, ForeignKey("discrepancies.id"), nullable=True)
    carrier = Column(String(100), nullable=False)
    draft_body = Column(Text, nullable=True)          # the generated email text
    status = Column(Enum(DisputeStatus, name="disputestatus"), default=DisputeStatus.DRAFT)

    invoice = relationship("Invoice", back_populates="disputes")
    discrepancy = relationship("Discrepancy")