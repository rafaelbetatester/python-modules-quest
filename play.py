"""Launch the offline Modules & Packages browser quiz (standard library only)."""

import argparse
import functools
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
FILES = {
    "/", "/index.html", "/style.css", "/app.js", "/engine.js",
    "/questions.json", "/engine.test.js", "/renderer.js", "/renderer.test.js",
    "/campaign.js", "/world.js", "/campaign.test.js",
}


class QuizHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path not in FILES:
            self.send_error(404, "Not a quiz resource")
            return
        super().do_GET()

    def do_HEAD(self):
        if urlsplit(self.path).path not in FILES:
            self.send_error(404, "Not a quiz resource")
            return
        super().do_HEAD()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data:; connect-src 'self'; script-src 'self'; "
            "style-src 'self'; base-uri 'none'; frame-ancestors 'none'",
        )
        super().end_headers()

    def guess_type(self, path):
        if str(path).endswith(".js"):
            return "text/javascript"
        return super().guess_type(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765, help="Local port (default: 8765)")
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser")
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error("--port must be between 0 and 65535")
    handler = functools.partial(QuizHandler, directory=str(ROOT))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError as error:
        parser.exit(1, f"Could not start the quiz: {error}\nTry --port 8766.\n")
    with server:
        url = f"http://127.0.0.1:{server.server_port}"
        print(f"\nModules & Packages Quest: {url}", flush=True)
        print("Keep this terminal open. Press Ctrl+C to stop.\n", flush=True)
        if not args.no_browser and not webbrowser.open(url):
            print("Browser did not open automatically. Open the URL above.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nQuiz stopped. Browser progress is kept for your next visit.")


if __name__ == "__main__":
    main()
