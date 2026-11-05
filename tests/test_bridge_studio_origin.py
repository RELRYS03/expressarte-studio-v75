import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from blender_bridge import Handler


class StudioOriginTests(unittest.TestCase):
    def allowed(self, origin, host="127.0.0.1:8766"):
        handler = object.__new__(Handler)
        handler.headers = {"Origin": origin, "Host": host}
        return handler._origin_ok()

    def test_published_studio_can_use_local_bridge(self):
        self.assertTrue(self.allowed("https://expressarte-studio-teste.relrys17.workers.dev"))

    def test_other_websites_cannot_use_bridge(self):
        self.assertFalse(self.allowed("https://attacker.example"))
        self.assertFalse(self.allowed("https://expressarte-studio-teste.relrys17.workers.dev.attacker.example"))

    def test_remote_host_header_is_still_rejected(self):
        self.assertFalse(self.allowed("https://expressarte-studio-teste.relrys17.workers.dev", "attacker.example:8766"))


if __name__ == "__main__":
    unittest.main()
