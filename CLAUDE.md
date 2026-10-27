# The Lion, Earls Colne: website and newsletter

Client project for Craig's pub (The Lion, High Street, Earls Colne CO6 2PA). Static site plus a weekly email newsletter. Mock-up stage: nothing is deployed or sent yet. Background, decisions and open items are in memory (`lion-earls-colne-site`); don't repeat them here.

## Run it

- Preview the site: serve this folder over http (the menu panel loads JSON, so opening the file directly won't work), e.g. `python3 -m http.server 8765`, then open http://localhost:8765. The plain Python server lets the browser cache old scripts; if a change doesn't show, serve with a no-cache header instead.
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
7. **No Chapel data in `data/menu.json`.** The demo tab of the Chapel's weekend specials was removed on 8 Oct 2026; don't add it back. Test with `tools/samples/` and a scratch copy of the menu file instead.
8. **All "Book a table" links go through Stampede, nothing else.** Use the Lion's own Stampede link (not the Chapel's) in `bookingUrl` in `js/data.js` and `VENUE["book"]` in `tools/render_newsletter.py`. Until it exists they point to the Find us section. Never a `tel:` link on a Book button. (A plain phone number as contact info is fine.) Waiting on the Stampede set-up.
9. **No em dashes in copy.** Write British.

## Layout

- `index.html`, `css/`, `js/`, `images/`: the site (`js/data.js` holds the editable facts)
- `js/bar.js`: the one solid sticky header bar used on every page (built into `<header id="chrome-head" data-active="...">`). About 100px on desktop, shrinks on scroll, slim 64px with a menu drawer on phones. Edit the nav links here, nowhere else. Added 27 Oct 2026 (private repo only until Kev says push it live).
- `data/menu.json`: menus; past-dated ones hide themselves; `data/history/` is local backups, not committed
- `menus.html`, `menu.html`, `whats-on.html`, `event.html` + `js/pages.js` + `css/pages.css`: mock-up of the menu picker and events pages (added 27 Oct 2026, private repo only, not on the public preview). They read `data/menu.json` plus **invented** `data/sample/*.json` (flagged SAMPLE). Add `?at=2026-10-30T18:00` to a URL to preview another date and time.
- `docs/stampede-questions.md`: question list for the Stampede meeting
- `tools/extract_menu.py`, `tools/render_newsletter.py`, `tools/samples/`: pipeline pieces and test data
- `newsletter/`: generated previews, not committed

## Git

Two repos, one folder:
- `origin` = private working repo (`KevSinfield/lion-earls-colne`). Normal commits and pushes go here.
- `public` = public copy (`KevSinfield/lion-earls-colne-site`), created 8 Oct 2026 from a history-free branch (`public-release`) so no old commits are exposed. Never push `main` itself to `public`. To update it, only when Kev says so: scan the tree for mailbox addresses and secrets, then make a commit of the current tree whose only parent is `public/main` (`git commit-tree <tree> -p public/main`) and push that as a normal fast-forward. If GitHub's Pages deploy fails with a 500, request a fresh build (`gh api -X POST repos/KevSinfield/lion-earls-colne-site/pages/builds`) rather than waiting.

GitHub Pages is on for the public repo (turned on 8 Oct 2026): https://kevsinfield.github.io/lion-earls-colne-site/ (serves branch `main` of `public`, so it only changes when `public` is updated). It is a mock-up and `noindex`.

This folder is listed in `~/Dev/.gitignore`, so the dev-sync job does not track it. Co-Authored-By trailer on commits. No force-pushes without Kev's say-so (the auto classifier blocks them).
