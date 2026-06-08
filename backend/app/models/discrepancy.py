# backend/app/models/discrepancy.py
# Records an overcharge or undercharge detected during audit.
from sqlalchemy import BigInteger, Column, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class Discrepancy(Base):
    __tablename__ = "discrepancies"

    id = Column(BigInteger, primary_key=True, index=True)
    invoice_id = Column(BigInteger, ForeignKey("invoices.id"), nullable=False)
    line_item_id = Column(BigInteger, ForeignKey("line_items.id"), nullable=True)
    expected_amount = Column(Float, nullable=False)
    charged_amount = Column(Float, nullable=False)
    difference = Column(Float, nullable=False)               # positive = overcharge, negative = undercharge
    reason = Column(String(500), nullable=True)              # e.g. "Weight surcharge mismatch"

    invoice = relationship("Invoice", back_populates="discrepancies")
    line_item = relationship("LineItem")    