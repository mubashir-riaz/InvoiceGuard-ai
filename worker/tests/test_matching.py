import unittest
import sys
import os

# Add worker folder to sys.path so tasks can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tasks.matching import calculate_expected


class TestCalculateExpected(unittest.TestCase):
    """Unit tests for calculate_expected rate auditing logic."""

    def test_base_rate_only(self):
        rates = {"base_rate": 25.0, "per_kg": 0.0}
        self.assertEqual(calculate_expected(rates, 10.0), 25.0)

    def test_base_and_weight_rate(self):
        rates = {"base_rate": 15.0, "per_kg": 2.5}
        # 15.0 + 2.5 * 4.0 = 25.0
        self.assertEqual(calculate_expected(rates, 4.0), 25.0)

    def test_missing_weight_returns_zero(self):
        rates = {"base_rate": 15.0, "per_kg": 2.5}
        self.assertEqual(calculate_expected(rates, None), 0.0)

    def test_zero_weight(self):
        rates = {"base_rate": 12.0, "per_kg": 3.0}
        self.assertEqual(calculate_expected(rates, 0.0), 12.0)

    def test_fractional_weight_precision(self):
        rates = {"base_rate": 10.50, "per_kg": 1.75}
        # 10.50 + 1.75 * 2.5 = 10.50 + 4.375 = 14.875
        self.assertAlmostEqual(calculate_expected(rates, 2.5), 14.875, places=3)

    def test_empty_rate_details(self):
        rates = {}
        self.assertEqual(calculate_expected(rates, 5.0), 0.0)


class TestDiscrepancyThreshold(unittest.TestCase):
    """Unit tests for discrepancy detection threshold logic."""

    def test_threshold_under_one_cent_is_ignored(self):
        expected = 100.00
        charged = 100.005
        diff = round(charged - expected, 2)
        has_discrepancy = abs(diff) > 0.01
        self.assertFalse(has_discrepancy)

    def test_overcharge_detected(self):
        expected = 50.00
        charged = 75.00
        diff = round(charged - expected, 2)
        self.assertTrue(abs(diff) > 0.01)
        self.assertEqual(diff, 25.00)

    def test_undercharge_detected(self):
        expected = 60.00
        charged = 45.00
        diff = round(charged - expected, 2)
        self.assertTrue(abs(diff) > 0.01)
        self.assertEqual(diff, -15.00)


if __name__ == "__main__":
    unittest.main()
