# Duplicated ORM models for Invoice and LineItem (same structure as backend).
# This allows the worker to read/write without importing the backend package.
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship, declarative_base
import enum

Base = declarative_base()

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
    client_id = Column(Integer, nullable=False)
    contract_id = Column(Integer, nullable=True)
    invoice_number = Column(String(100), nullable=False, unique=True)
    carrier = Column(String(100), nullable=False)
    invoice_date = Column(Date, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.UPLOADED)
    file_path = Column(String(500), nullable=True)

    line_items = relationship("LineItem", back_populates="invoice")

class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    tracking_number = Column(String(100), nullable=True)
    description = Column(String(500), nullable=True)
    weight_kg = Column(Float, nullable=True)
    charged_amount = Column(Float, nullable=True)

    invoice = relationship("Invoice", back_populates="line_items")