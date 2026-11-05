import base64
import unittest
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from expressinho_triposr_specs import decode_image, local_config

class TripoSRSpecsTests(unittest.TestCase):
    def test_png(self):
        raw=b"\x89PNG\r\n\x1a\n"+b"a"*32
        got,ext=decode_image({"mimeType":"image/png","imageBase64":base64.b64encode(raw).decode()})
        self.assertEqual(got,raw)
        self.assertEqual(ext,".png")

    def test_mismatched_file(self):
        with self.assertRaises(ValueError):
            decode_image({"mimeType":"image/jpeg","imageBase64":base64.b64encode(b"\x89PNG\r\n\x1a\n"+b"a"*32).decode()})

    def test_reject_other_keys(self):
        with self.assertRaises(ValueError):
            decode_image({"mimeType":"image/png","imageBase64":"abcd","command":"echo hello"})

    def test_reject_invalid_b64(self):
        with self.assertRaises(ValueError):
            decode_image({"mimeType":"image/png","imageBase64":"!"*20})

    def test_unconfigured(self):
        state=local_config({})
        self.assertFalse(state["configured"])

    def test_wrong_device(self):
        state=local_config({"EXPRESSARTE_TRIPOSR_DEVICE":"../../../etc/passwd"})
        self.assertFalse(state["configured"])

    def test_temp_paths(self):
        with TemporaryDirectory() as d:
            base=Path(d)
            (base/"run.py").write_text("# test\n")
            (base/"python.exe").write_text("")
            state=local_config({"EXPRESSARTE_TRIPOSR_DIR":str(base),"EXPRESSARTE_TRIPOSR_PYTHON":str(base/"python.exe")})
            self.assertTrue(state["configured"])
            self.assertEqual(state["device"],"cuda:0")

if __name__=="__main__":
    unittest.main()
