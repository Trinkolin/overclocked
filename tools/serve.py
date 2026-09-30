# The local server for playtests (python tools/serve.py): like `python -m http.server 8080`, but it tells browsers
# not to keep the game's files, so a phone always gets the latest version (they used to keep an old one).
import functools
import http.server
import os

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
http.server.ThreadingHTTPServer(('', 8080), functools.partial(NoCache, directory=root)).serve_forever()
