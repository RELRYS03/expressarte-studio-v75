import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from expressinho_prepare_specs import validate_spec

class PrepareSpecTests(unittest.TestCase):
    def test_flatten(self):
        self.assertEqual(validate_spec({"operation":"flatten_bottom","cutMm":2})["cutMm"],2.0)

    def test_decimate(self):
        self.assertEqual(validate_spec({"operation":"decimate","targetFaces":50000})["targetFaces"],50000)

    def test_unknown_operation(self):
        with self.assertRaises(ValueError): validate_spec({"operation":"run_python","script":"x"})

    def test_reject_extra_keys(self):
        with self.assertRaises(ValueError): validate_spec({"operation":"decimate","targetFaces":50000,"script":"hi"})

    def test_invalid_number(self):
        for value in [True, "2", math.inf, math.nan, -1, 100]:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    validate_spec({"operation":"flatten_bottom","cutMm":value})

    def test_target_boundaries(self):
        for value in [0, True, 999, 500001, 4.5]:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    validate_spec({"operation":"decimate","targetFaces":value})

if __name__ == "__main__":
    unittest.main()
