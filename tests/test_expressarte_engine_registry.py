import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from expressarte_engine_registry import choose_backend, image3d_execution_mode


class EngineRegistryTests(unittest.TestCase):
    def test_nvidia_selects_cuda(self):
        self.assertEqual(choose_backend(["NVIDIA GeForce RTX"]), "cuda")

    def test_amd_selects_directml(self):
        self.assertEqual(choose_backend(["AMD Radeon RX 580 2048SP"]), "directml")

    def test_intel_selects_directml(self):
        self.assertEqual(choose_backend(["Intel Arc"]), "directml")

    def test_unknown_selects_cpu(self):
        self.assertEqual(choose_backend([]), "cpu")

    def test_4gb_amd_recommends_remote_image3d(self):
        self.assertEqual(image3d_execution_mode("directml", 4), "remote-recommended")

    def test_6gb_cuda_is_only_candidate_not_guarantee(self):
        self.assertEqual(image3d_execution_mode("cuda", 6), "local-cuda-candidate")

    def test_cuda_below_threshold_recommends_remote(self):
        self.assertEqual(image3d_execution_mode("cuda", 4), "remote-recommended")


if __name__ == "__main__":
    unittest.main()
