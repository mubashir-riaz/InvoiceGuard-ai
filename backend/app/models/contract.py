# Stores the agreed freight contract with rate details (carrier, effective dates, JSON rates).
from sqlalchemy import Column, Integer, String, Date, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    carrier = Column(String(100), nullable=False)             # e.g., DHL, FedEx
    rate_details = Column(JSON, nullable=False)               # e.g., {"base_rate": 5.0, "per_kg": 2.0}
    effective_start = Column(Date, nullable=False)
    effective_end = Column(Date, nullable=False)

    client = relationship("Client", back_populates="contracts")
    invoices = relationship("Invoice", back_populates="contract")