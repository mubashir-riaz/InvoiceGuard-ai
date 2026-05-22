# backend/app/models/invoice.py
# Represents an uploaded freight invoice PDF and its processing status.
from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.models.base import Base

class InvoiceStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    EXTRACTED = "extracted"
    AUDITED = "audited"
    DISPUTED = "disputed"
    ERROR = "error"

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)
    invoice_number = Column(String(100), nullable=False, unique=True)
    carrier = Column(String(100), nullable=False)
    invoice_date = Column(Date, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.UPLOADED)
    file_path = Column(String(500), nullable=True)  # path to uploaded PDF

    client = relationship("Client", back_populates="invoices")
    contract = relationship("Contract", back_populates="invoices")
    line_items = relationship("LineItem", back_populates="invoice")