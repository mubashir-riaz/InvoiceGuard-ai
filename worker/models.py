# Duplicated ORM models for Invoice and LineItem (same structure as backend).
# This allows the worker to read/write without importing the backend package.
import json
from sqlalchemy import BigInteger, Column, Integer, String, Date, Float, ForeignKey, Enum
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

class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(BigInteger, primary_key=True, index=True)
    client_id = Column(BigInteger, nullable=False)
    contract_number = Column(String(100), nullable=False, unique=True)
    rate_details = Column(String, nullable=True)
    
    @property
    def rate_details_dict(self):
        """Parse JSON string to dict"""
        if self.rate_details:
            return json.loads(self.rate_details)
        return {"base_rate": 0.0, "per_kg": 0.0}
    
class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(BigInteger, primary_key=True, index=True)
    client_id = Column(Integer, nullable=False)
    contract_id = Column(Integer, nullable=True)
    invoice_number = Column(String(100), nullable=False, unique=True)
    carrier = Column(String(100), nullable=False)
    invoice_date = Column(Date, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.UPLOADED)
    file_path = Column(String(500), nullable=True)
    discrepancies = relationship("Discrepancy", back_populates="invoice")
    line_items = relationship("LineItem", back_populates="invoice")

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