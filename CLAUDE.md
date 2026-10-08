# The Lion, Earls Colne: website and newsletter

Client project for Craig's pub (The Lion, High Street, Earls Colne CO6 2PA). Static site plus a weekly email newsletter. Mock-up stage: nothing is deployed or sent yet. Background, decisions and open items are in memory (`lion-earls-colne-site`); don't repeat them here.

## Run it

- Preview the site: `python3 -m http.server 8765` from this folder, then open http://localhost:8765 (the menu panel loads JSON, so opening the file directly won't work).
- Menu extractor tests: `tools/.venv/bin/python -m unittest discover -s tools -v`
- Newsletter preview: `python3 tools/render_newsletter.py --content tools/samples/newsletter-sample.json --sample --out newsletter/preview.html`
- Add a menu: `tools/.venv/bin/python tools/extract_menu.py MENU.pdf --expect-venue Lion --merge data/menu.json`

## Rules for this project

1. **Lion only.** The Chapel Inn shares the sending mailbox (the Chapel office mailbox). Never put Chapel menus, offers or events on the Lion's site or newsletter. Keep `--expect-venue Lion` on every extractor run.
2. **Nothing goes out without Kev's go-ahead in the last message:** no deploys, no publishing, no email or newsletter sends, no changes to Craig's DNS or Microsoft 365.
3. **Never guess Lion facts.** Hours, prices, phone, booking link, history and dates come from the Lion's own material or a cited source. Anything unconfirmed gets a visible `TODO` (red text) and is listed in memory. The old "since 1678" claim is unverified: leave it out.
4. **Keep it a mock-up until told otherwise:** the page carries `noindex` and `robots.txt` disallows everything. Remove both only when the site goes live.
5. **Email must not depend on images.** The newsletter uses a live-text masthead and web-safe fonts (Georgia/Arial), light cream background. No dark newsletter, no image logo (it failed to load in Apple Mail).
6. **One source of truth per thing:** menus in `data/menu.json`; hours, events, contact details in `js/data.js`. Don't copy them into other files.
7. **Remove `demo-weekend-specials` from `data/menu.json` before anyone outside sees the site:** it is the Chapel's menu, there only to show the layout.
8. **No em dashes in copy.** Write British.

## Layout

- `index.html`, `css/`, `js/`, `images/`: the site (`js/data.js` holds the editable facts)
- `data/menu.json`: menus; past-dated ones hide themselves; `data/history/` is local backups, not committed
- `tools/extract_menu.py`, `tools/render_newsletter.py`, `tools/samples/`: pipeline pieces and test data
- `newsletter/`: generated previews, not committed

## Git

Own private repo (`KevSinfield/lion-earls-colne`). This folder is listed in `~/Dev/.gitignore`, so the dev-sync job does not track it. Commit and push from here. Co-Authored-By trailer on commits.
