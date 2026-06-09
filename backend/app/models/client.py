# SQLAlchemy ORM model for a shipping client (e.g., an e‑commerce brand).
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base  # we'll create a shared Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)

    contracts = relationship("Contract", back_populates="client")
    invoices = relationship("Invoice", back_populates="client")