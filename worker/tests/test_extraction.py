import unittest
import sys
import os

# Add worker folder to sys.path so tasks can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tasks.extraction import extract_line_items_from_text


class TestExtractLineItemsFromText(unittest.TestCase):
    """Unit tests for deterministic text parser in extraction task."""

    def test_block_format_extraction(self):
        sample_text = """
        INVOICE #: INV-CLEAN-001
        Date: 2025-06-15
        Carrier: FedEx Express
        Client: TechGear Inc.

        SHIPMENT DETAILS:
        ----------------------------------------
        Item 1: Tracking # FX100123456
        Description: Laptops - 5 units
        Weight: 12.5 kg
        Charged Amount: $35.00

        Item 2: Tracking # FX100789012
        Description: Monitors - 3 units
        Weight: 18.0 kg
        Charged Amount: $46.00

        Item 3: Tracking # FX100345678
        Description: Keyboards - 20 units
        Weight: 8.0 kg
        Charged Amount: $26.00
        ----------------------------------------
        TOTAL CHARGED: $107.00
        """
        items = extract_line_items_from_text(sample_text)
        self.assertEqual(len(items), 3)

        self.assertEqual(items[0]["tracking_number"], "FX100123456")
        self.assertEqual(items[0]["description"], "Laptops - 5 units")
        self.assertEqual(items[0]["weight_kg"], 12.5)
        self.assertEqual(items[0]["charged_amount"], 35.00)

        self.assertEqual(items[1]["tracking_number"], "FX100789012")
        self.assertEqual(items[1]["description"], "Monitors - 3 units")
        self.assertEqual(items[1]["weight_kg"], 18.0)
        self.assertEqual(items[1]["charged_amount"], 46.00)

        self.assertEqual(items[2]["tracking_number"], "FX100345678")
        self.assertEqual(items[2]["description"], "Keyboards - 20 units")
        self.assertEqual(items[2]["weight_kg"], 8.0)
        self.assertEqual(items[2]["charged_amount"], 26.00)

    def test_multiline_wrapped_table_extraction(self):
        sample_text = """
        Tracking # Description Weight Charged
        Amount
        DH456789123 Industrial Machinery - 2 crates 250.0
        kg $1,875.00
        DH456789456 Electronic Components - 10
        pallets 85.5 kg $750.00
        DH456789789 Textile Samples - 1 box 3.0 kg $95.00
        DH456789012 Medical Equipment - 5 cases 45.0 kg $520.00
        DH456789345 Automotive Parts - 8 boxes 120.0
        kg $1,100.00
        TOTAL CHARGED: $4,340.00
        """
        items = extract_line_items_from_text(sample_text)
        self.assertEqual(len(items), 5)

        self.assertEqual(items[0]["tracking_number"], "DH456789123")
        self.assertEqual(items[0]["description"], "Industrial Machinery - 2 crates")
        self.assertEqual(items[0]["weight_kg"], 250.0)
        self.assertEqual(items[0]["charged_amount"], 1875.00)

        self.assertEqual(items[1]["tracking_number"], "DH456789456")
        self.assertEqual(items[1]["description"], "Electronic Components - 10 pallets")
        self.assertEqual(items[1]["weight_kg"], 85.5)
        self.assertEqual(items[1]["charged_amount"], 750.00)

        self.assertEqual(items[2]["tracking_number"], "DH456789789")
        self.assertEqual(items[2]["description"], "Textile Samples - 1 box")
        self.assertEqual(items[2]["weight_kg"], 3.0)
        self.assertEqual(items[2]["charged_amount"], 95.00)

        self.assertEqual(items[3]["tracking_number"], "DH456789012")
        self.assertEqual(items[3]["description"], "Medical Equipment - 5 cases")
        self.assertEqual(items[3]["weight_kg"], 45.0)
        self.assertEqual(items[3]["charged_amount"], 520.00)

        self.assertEqual(items[4]["tracking_number"], "DH456789345")
        self.assertEqual(items[4]["description"], "Automotive Parts - 8 boxes")
        self.assertEqual(items[4]["weight_kg"], 120.0)
        self.assertEqual(items[4]["charged_amount"], 1100.00)

    def test_pipe_delimited_table_extraction(self):
        sample_text = """
        TRACKING NO | ITEM / DESCRIPTION | WT (KG) | CHARGED RATE
        FX990111222 | Heavy Generator Unit | 320.5 | $2,450.00
        FX990333444 | Circuit Boards Pack | 14.0 | $85.50
        FX990555666 | Industrial Cables Reel | 65.0 | $310.00
        TOTAL: $2,845.50
        """
        items = extract_line_items_from_text(sample_text)
        self.assertEqual(len(items), 3)

        self.assertEqual(items[0]["tracking_number"], "FX990111222")
        self.assertEqual(items[0]["description"], "Heavy Generator Unit")
        self.assertEqual(items[0]["weight_kg"], 320.5)
        self.assertEqual(items[0]["charged_amount"], 2450.00)

    def test_ignore_zero_charge_and_payment_terms(self):
        sample_text = """
        INVOICE #: INV-CONTAINER-2026
        Bill of Lading: BOL-987654
        Payment Terms: Net 30 Days

        CONTAINER # | DESCRIPTION | WEIGHT | CHARGE
        MAEU2298471 | Payment Terms Net 30 Days | 30 kg | $0.00
        MSKU1234567 | 20ft Container - Electronics | 18,000 kg | $3,200.00
        BOL-987654  | Bill of Lading Reference | 0 kg | $0.00
        MSKU7654321 | 40ft Container - Apparel | 22,500 kg | $4,850.00
        TOTAL: $8,050.00
        """
        items = extract_line_items_from_text(sample_text)
        self.assertEqual(len(items), 2)

        self.assertEqual(items[0]["tracking_number"], "MSKU1234567")
        self.assertEqual(items[0]["description"], "20ft Container - Electronics")
        self.assertEqual(items[0]["weight_kg"], 18000.0)
        self.assertEqual(items[0]["charged_amount"], 3200.00)

        self.assertEqual(items[1]["tracking_number"], "MSKU7654321")
        self.assertEqual(items[1]["description"], "40ft Container - Apparel")
        self.assertEqual(items[1]["weight_kg"], 22500.0)
        self.assertEqual(items[1]["charged_amount"], 4850.00)

    def test_sanitize_weight_and_amount(self):
        from tasks.extraction import sanitize_weight, sanitize_amount, sanitize_and_filter_line_items
        
        # Test weight comma stripping & sanity
        self.assertEqual(sanitize_weight("18,000 kg"), 18000.0)
        self.assertEqual(sanitize_weight("24,500"), 24500.0)
        self.assertEqual(sanitize_weight("250.5 kg"), 250.5)
        self.assertEqual(sanitize_weight(18000), 18000.0)
        self.assertIsNone(sanitize_weight(None))
        self.assertIsNone(sanitize_weight(""))

        # Test amount sanitization
        self.assertEqual(sanitize_amount("$3,200.00"), 3200.0)
        self.assertEqual(sanitize_amount("1,875.00"), 1875.0)
        self.assertIsNone(sanitize_amount("$0.00"))
        self.assertIsNone(sanitize_amount(0))

        # Test defensive post-processing filter on raw LLM JSON output
        raw_llm_items = [
            {"tracking_number": "MAEU2298471", "description": "Payment Terms Net 30 Days", "weight_kg": "30 kg", "charged_amount": "$0.00"},
            {"tracking_number": "MSKU1234567", "description": "20ft Container - Electronics", "weight_kg": "18,000 kg", "charged_amount": "$3,200.00"},
            {"tracking_number": "BOL-987654", "description": "Bill of Lading Reference", "weight_kg": "0 kg", "charged_amount": 0},
            {"tracking_number": "MSKU7654321", "description": "40ft Container - Apparel", "weight_kg": "24,500.5 kg", "charged_amount": "4,850.00"},
        ]
        filtered = sanitize_and_filter_line_items(raw_llm_items)
        self.assertEqual(len(filtered), 2)
        self.assertEqual(filtered[0]["tracking_number"], "MSKU1234567")
        self.assertEqual(filtered[0]["weight_kg"], 18000.0)
        self.assertEqual(filtered[0]["charged_amount"], 3200.0)

        self.assertEqual(filtered[1]["tracking_number"], "MSKU7654321")
        self.assertEqual(filtered[1]["weight_kg"], 24500.5)
        self.assertEqual(filtered[1]["charged_amount"], 4850.0)

    def test_empty_text_returns_empty_list(self):
        self.assertEqual(extract_line_items_from_text(""), [])
        self.assertEqual(extract_line_items_from_text("   "), [])


if __name__ == "__main__":
    unittest.main()
