"""Serves the render page and saves the PNGs it posts back. Local only."""
import base64, json, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'out')


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_POST(self):
        n = int(self.headers['Content-Length'])
        body = json.loads(self.rfile.read(n))
        for idx, data in body.items():
            png = base64.b64decode(data.split(',', 1)[1])
            with open(os.path.join(OUT, f'{int(idx):04d}.png'), 'wb') as f:
                f.write(png)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *a):
        pass


ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
