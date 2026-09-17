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

    def test_empty_text_returns_empty_list(self):
        self.assertEqual(extract_line_items_from_text(""), [])
        self.assertEqual(extract_line_items_from_text("   "), [])


if __name__ == "__main__":
    unittest.main()
