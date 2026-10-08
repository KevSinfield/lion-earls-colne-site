# The Lion, Earls Colne: website mock-up

Static site (HTML, CSS, JS). No build step.

- `index.html`, `css/`, `js/`, `images/`: the site
- `js/data.js`: opening hours, weekly events, contact details
- `data/menu.json`: menus (written by `tools/extract_menu.py`; menus past their end date hide themselves)
- `tools/`: menu PDF extractor and tests

Preview locally: `python3 -m http.server 8765`, then open http://localhost:8765

Menu extractor (needs a virtualenv with `pypdf`):
`tools/.venv/bin/python tools/extract_menu.py MENU.pdf --expect-venue Lion --merge data/menu.json`

This is a mock-up. Anything marked TODO still needs the Lion to confirm it. The page is set to `noindex`; remove that tag when it goes live.
