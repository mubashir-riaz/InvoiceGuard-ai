# A single chargeable line from an invoice (tracking number, weight, charge, etc.).
from sqlalchemy import BigInteger, Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(BigInteger, primary_key=True, index=True) 
    invoice_id = Column(BigInteger, ForeignKey("invoices.id"), nullable=False) 
    tracking_number = Column(String(100), nullable=True)
    description = Column(String(500), nullable=True)
    weight_kg = Column(Float, nullable=True)
    charged_amount = Column(Float, nullable=True)

    invoice = relationship("Invoice", back_populates="line_items")