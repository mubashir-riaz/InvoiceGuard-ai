# Duplicated ORM models for Invoice and LineItem (same structure as backend).
# This allows the worker to read/write without importing the backend package.
import json
from sqlalchemy import BigInteger, Column, Integer, String, Date, Float, ForeignKey, Enum, JSON,Text
from sqlalchemy.orm import relationship, declarative_base
import enum

Base = declarative_base()

class InvoiceStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    EXTRACTED = "EXTRACTED"
    AUDITED = "AUDITED"
    DISPUTED = "DISPUTED"
    ERROR = "ERROR"

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(BigInteger, primary_key=True, index=True)
    client_id = Column(BigInteger, ForeignKey("clients.id"), nullable=False)
    carrier = Column(String(100), nullable=False)
    rate_details = Column(JSON, nullable=False)
    effective_start = Column(Date, nullable=False)
    effective_end = Column(Date, nullable=False)
    
class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(BigInteger, primary_key=True, index=True)
    client_id = Column(BigInteger, nullable=False)
    contract_id = Column(BigInteger, nullable=True)
    invoice_number = Column(String(100), nullable=False, unique=True)
    carrier = Column(String(100), nullable=False)
    invoice_date = Column(Date, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(Enum(InvoiceStatus, name="invoicestatus"), default=InvoiceStatus.UPLOADED)
    file_path = Column(String(500), nullable=True)

    line_items = relationship("LineItem", back_populates="invoice")
    discrepancies = relationship("Discrepancy", back_populates="invoice")
    disputes = relationship("Dispute", back_populates="invoice")  
class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(BigInteger, primary_key=True, index=True)
    invoice_id = Column(BigInteger, ForeignKey("invoices.id"), nullable=False)
    tracking_number = Column(String(100), nullable=True)
    description = Column(String(500), nullable=True)
    weight_kg = Column(Float, nullable=True)
    charged_amount = Column(Float, nullable=True)

    invoice = relationship("Invoice", back_populates="line_items")

class Discrepancy(Base):
    __tablename__ = "discrepancies"

    id = Column(BigInteger, primary_key=True, index=True)
    invoice_id = Column(BigInteger, ForeignKey("invoices.id"), nullable=False)
    line_item_id = Column(BigInteger, ForeignKey("line_items.id"), nullable=True)
    expected_amount = Column(Float, nullable=False)
    charged_amount = Column(Float, nullable=False)
    difference = Column(Float, nullable=False)
    reason = Column(String(500), nullable=True)

    invoice = relationship("Invoice", back_populates="discrepancies")
    line_item = relationship("LineItem")

class DisputeStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(BigInteger, primary_key=True, index=True)
    invoice_id = Column(BigInteger, ForeignKey("invoices.id"), nullable=False)
    discrepancy_id = Column(BigInteger, ForeignKey("discrepancies.id"), nullable=True)
    carrier = Column(String(100), nullable=False)
    draft_body = Column(Text, nullable=True)
    status = Column(Enum(DisputeStatus, name="disputestatus"), default=DisputeStatus.DRAFT)

    invoice = relationship("Invoice", back_populates="disputes")
    discrepancy = relationship("Discrepancy")