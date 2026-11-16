import json
import functools
import threading
import unittest
import subprocess
import sys
import re
import tempfile
from collections import Counter
from pathlib import Path
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from play import QuizHandler


ROOT = Path(__file__).resolve().parent


class QuestionTests(unittest.TestCase):
    def test_exactly_133_complete_unique_questions(self):
        path = ROOT / "questions.json"
        self.assertTrue(path.exists(), "The question bank has not been built")
        questions = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(len(questions), 133)
        self.assertEqual(len({q[1] for q in questions}), 133)
        for topic, prompt, options, answer, hint, explanation in questions:
            self.assertTrue(topic and prompt and hint and explanation)
            self.assertEqual(len(options), 4)
            self.assertEqual(len(set(options)), 4)
            self.assertIs(type(answer), int)
            self.assertIn(answer, range(4))
        self.assertEqual(
            set(q[0] for q in questions),
            {"Imports", "Modules", "Packages", "Math", "Random", "Platform", "pip"},
        )

    def test_browser_files_exist(self):
        for name in ("index.html", "style.css", "app.js", "engine.js", "renderer.js", "campaign.js", "world.js"):
            self.assertTrue((ROOT / name).is_file(), f"Missing browser file: {name}")

    def test_launcher_exists(self):
        self.assertTrue((ROOT / "play.py").is_file(), "Missing Python launcher")

    def test_course_aligned_topic_distribution(self):
        questions = json.loads((ROOT / "questions.json").read_text(encoding="utf-8"))
        self.assertEqual(Counter(q[0] for q in questions[:100]), {
            "Imports": 20, "Modules": 14, "Packages": 10, "Math": 18,
            "Random": 12, "Platform": 10, "pip": 16,
        })

    def test_code_heavy_bank_covers_missing_course_topics(self):
        questions = json.loads((ROOT / "questions.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(sum("\n" in q[1] for q in questions), 45)
        content = json.dumps(questions).lower()
        for term in (
            "shebang", "zip", "log2", "log10", "exp(", "processor",
            "python_version_tuple", "aliased", "cheese shop", "pip search",
        ):
            self.assertIn(term, content, f"Missing course topic: {term}")
        self.assertIn("retired", content, "Historical pip search needs a caveat")

    def test_new_bank_uses_separate_progress_and_asset_versions(self):
        app = (ROOT / "app.js").read_text(encoding="utf-8")
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('const KEY = "python-modules-quest-v4"', app)
        self.assertIn('questions.json?v=4', app)
        self.assertIn('app.js?v=4', html)
        self.assertIn('renderer.js?v=4', app)
        self.assertIn('id="world"', html)
        self.assertIn('id="challenge-list"', html)
        self.assertIn('id="question-body"', html)

    def test_completion_and_each_chapter_have_additional_practice(self):
        questions = json.loads((ROOT / "questions.json").read_text(encoding="utf-8"))
        self.assertEqual(len(questions[100:118]), 18)
        self.assertEqual(Counter(q[0] for q in questions[118:122]), {"Imports": 4})
        self.assertEqual(Counter(q[0] for q in questions[122:126]), {
            "Math": 1, "Random": 1, "Platform": 2,
        })
        self.assertEqual(Counter(q[0] for q in questions[126:129]), {
            "Modules": 2, "Packages": 1,
        })
        self.assertEqual(Counter(q[0] for q in questions[129:133]), {"pip": 4})

    def test_deterministic_code_question_answers_in_fresh_interpreters(self):
        questions = json.loads((ROOT / "questions.json").read_text(encoding="utf-8"))
        checked = 0
        for topic, prompt, options, answer, hint, explanation in questions:
            if not prompt.startswith("What is printed?\n"):
                continue
            code = prompt.split("\n", 1)[1]
            with self.subTest(prompt=prompt):
                result = subprocess.run(
                    [sys.executable, "-I", "-c", code],
                    capture_output=True, text=True, timeout=5, check=False,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout.strip(), options[answer])
            checked += 1
        self.assertGreaterEqual(checked, 40, "Need at least 40 runtime-checked examples")

    def test_multifile_module_outputs_in_isolated_directories(self):
        questions = json.loads((ROOT / "questions.json").read_text(encoding="utf-8"))
        checked = 0
        for topic, prompt, options, answer, hint, explanation in questions:
            headers = list(re.finditer(r"(?m)^([a-z_]+\.py):\n", prompt))
            if not headers:
                continue
            with self.subTest(prompt=prompt), tempfile.TemporaryDirectory() as folder:
                for index, header in enumerate(headers):
                    end = headers[index + 1].start() if index + 1 < len(headers) else len(prompt)
                    (Path(folder) / header[1]).write_text(
                        prompt[header.end():end].strip() + "\n", encoding="utf-8",
                    )
                entry = str(Path(folder) / headers[-1][1])
                code = (
                    f"import sys, runpy; sys.path.insert(0, {folder!r}); "
                    f"runpy.run_path({entry!r}, run_name='__main__')"
                )
                result = subprocess.run(
                    [sys.executable, "-I", "-c", code],
                    capture_output=True, text=True, timeout=5, check=False,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout.strip(), options[answer])
            checked += 1
        self.assertGreaterEqual(checked, 2)


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(
            ("127.0.0.1", 0), functools.partial(QuizHandler, directory=str(ROOT))
        )
        cls.thread = threading.Thread(target=cls.server.serve_forever)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_serves_quiz_and_json(self):
        with urlopen(self.url, timeout=5) as response:
            self.assertIn(b"Modules &amp; Packages", response.read())
            self.assertEqual(response.headers["Cache-Control"], "no-store")
        with urlopen(self.url + "/questions.json", timeout=5) as response:
            self.assertEqual(len(json.load(response)), 133)

    def test_javascript_mime_type(self):
        with urlopen(self.url + "/engine.js", timeout=5) as response:
            self.assertEqual(response.headers.get_content_type(), "text/javascript")

    def test_adventure_resources_are_served(self):
        for asset in ("campaign.js", "world.js", "campaign.test.js"):
            with urlopen(self.url + "/" + asset, timeout=5) as response:
                self.assertEqual(response.headers.get_content_type(), "text/javascript")

    def test_does_not_expose_source_or_parent_directories(self):
        for path in ("/play.py", "/README.txt", "/../", "/%2e%2e/", "/missing"):
            with self.assertRaises(HTTPError) as caught:
                urlopen(self.url + path, timeout=5)
            self.assertEqual(caught.exception.code, 404)
            caught.exception.close()

    def test_head_matches_get_restrictions(self):
        with urlopen(Request(self.url + "/engine.js", method="HEAD"), timeout=5) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.read(), b"")
        with self.assertRaises(HTTPError) as caught:
            urlopen(Request(self.url + "/play.py", method="HEAD"), timeout=5)
        self.assertEqual(caught.exception.code, 404)
        caught.exception.close()


if __name__ == "__main__":
    unittest.main()
