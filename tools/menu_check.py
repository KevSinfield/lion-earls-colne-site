#!/usr/bin/env python3
"""Completeness check for menus: did we get EVERYTHING that is on the menu, and nothing else?

A menu on the site must match the menu the Lion gave us, word for word. This compares every
word printed on the source (a PDF, or a picture read with the Mac's built-in OCR) against every
word in our menu data, both ways:

  * a word on the source that is not in our data  = something was DROPPED
  * a word in our data that is not on the source  = something was INVENTED or mistyped

Both lists must be empty to pass. A second, separate check is the control total: count the
dishes on the printed menu yourself and pass --expect-dishes N. They have to agree.

    # a menu we only have as pictures (the Mac reads the text in them)
    tools/.venv/bin/python tools/menu_check.py --menu data/menu.json --id main-menu \\
        --image "lion small plates.jpg" --image "lion pub classics.jpg" --expect-dishes 27

    # a PDF
    tools/.venv/bin/python tools/menu_check.py --menu data/menu.json --id sunday-menu --pdf SUNDAY.pdf

extract_menu.py runs the same check automatically before it merges a PDF, and refuses if it fails.
Exit code 0 = pass, 1 = fail.
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Words that are the logo/header, or the vegetarian and vegan marks, not dishes.
HEADER_WORDS = {"the", "lion", "earls", "colne", "v", "ve", "vg", "gf", "df"}
# Extra words PDFs carry that the parser turns into dates and offers rather than keeping as text.
DATE_WORDS = {"january", "february", "march", "april", "may", "june", "july", "august", "september", "october",
              "november", "december", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov",
              "dec", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "mon", "tue",
              "wed", "thu", "fri", "sat", "sun", "am", "pm", "valid", "until", "from", "menu"}


def words(text, drop=()):
    """Lower-case words with accents, punctuation and symbols removed (& counts as 'and').
    Single letters are dropped: they are the v / ve marks and OCR specks, never a dish."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = text.lower().replace("&", " and ")
    return [w for w in re.findall(r"[a-z0-9]+", text) if w not in drop and not (len(w) == 1 and w.isalpha())]


def menu_lines(menu, include_extras=False):
    """The customer-facing menu text we hold, one string per line. By default just the sections (what is printed
    on a menu card); include_extras adds the title, offers, events and footnote (for PDFs, which carry them)."""
    out = [menu.get("intro") or ""]
    if include_extras:
        out.append(menu.get("title") or "")
    for s in menu.get("sections", []):
        out += [s.get("name") or "", s.get("note") or ""]
        for it in s.get("items", []):
            out += [it.get("label") or "", it.get("name") or "", it.get("description") or ""]
            if it.get("price") is not None:
                out.append(f"{it['price']:.2f}")
    if include_extras:
        for o in menu.get("offers", []):
            out += [o.get("title") or "", o.get("headline") or "", o.get("detail") or ""]
        for e in menu.get("events", []):
            out += [e.get("title") or "", e.get("note") or ""]
        out.append(menu.get("footnote") or "")
    return [ln for ln in out if ln.strip()]


def dish_counts(menu):
    return [(s["name"], len(s["items"])) for s in menu.get("sections", [])]


def _same(a, b):
    return a == b or (len(a) >= 4 and len(b) >= 4 and difflib.SequenceMatcher(None, a, b).ratio() >= 0.74)


def _found_in(run, stream):
    """Is this run of words somewhere in the menu, in order, with only small OCR-style spelling slips?"""
    k = len(run)
    return any(all(_same(run[j], stream[i + j]) for j in range(k)) for i in range(len(stream) - k + 1))


def check(sources, menu, lenient=False, expect_dishes=None, allow_source=(), include_extras=False, accept=()):
    """sources: one list of text lines per source (a picture, a page or a PDF). Two separate tests, both must pass:

    DROPPED  every line printed on a source must be found, in order, in our menu text.
    INVENTED every word in our menu must be printed somewhere on the sources.
    Plus the control total: the dish count must match the one you counted on the printed menu.
    Pictures are read by OCR, which slips on a letter now and then, so small spelling differences are tolerated in the
    two tests above. But every such word is then listed under "near" and a person must confirm it (accept=[...]),
    otherwise a one-letter typo in our own data would sail through."""
    drop = HEADER_WORDS | (DATE_WORDS if lenient else set())
    stream = [w for ln in menu_lines(menu, include_extras) for w in words(ln, drop)]
    allowed = [words(a, drop) for a in allow_source]

    venue = set(words(menu.get("venue") or "")) | {"coming", "up", "at"} if lenient else set()
    dropped = []
    for lines in sources:
        for ln in lines:
            # PDFs print "Corn Ribs 8.00" on one line; we hold the name and the price apart, so split them
            ln = re.sub(r"\s*£?\b(\d{1,3}\.\d{2})$", "", ln) if lenient else ln
            run = words(ln, drop)
            if lenient and all(w.isdigit() or w in venue or w in drop or w in {"and", "to", "every", "till"} for w in run):
                continue  # a line of only dates, times, numbers or the venue name: the importer turns those into data
            # the little v / ve diet marks next to a dish name are often read as stray 1-2 letter bits ("ne", "De")
            trimmed = run[:-1] if len(run) > 1 and len(run[-1]) <= 2 else run
            if not run or any(run == a for a in allowed) or _found_in(run, stream) or _found_in(trimmed, stream):
                continue
            dropped.append(ln)

    src = Counter()
    for lines in sources:
        src.update(w for ln in lines for w in words(ln, drop))
    for a in allowed:
        src.update(a)  # a known page title may be printed twice (e.g. the same pizza list on two pictures)
    mine = Counter(stream)
    extra = list((mine - src).elements())
    # near-identical words (OCR slips) cancel: treat a source word we could not place as matching our word
    missing_words = list((src - mine).elements())
    for m in list(missing_words):
        best = difflib.get_close_matches(m, extra, n=1, cutoff=0.8) if len(m) >= 4 else []
        if best:
            missing_words.remove(m)
            extra.remove(best[0])
    mlines = menu_lines(menu, include_extras)
    vocab = set(src)
    ok_words = {a.lower() for a in accept}
    near = sorted(w for w in set(stream) if w not in vocab and w not in ok_words and w not in {x for x, _ in [(e, 0) for e in extra]})

    def where(word):
        return [ln for ln in mlines if word in words(ln)][:3]
    r = {
        "dropped": dropped,
        "extra": [(w, where(w)) for w in sorted(set(extra))],
        "near": [(w, difflib.get_close_matches(w, vocab, n=1, cutoff=0.6)) for w in near],
        "sections": dish_counts(menu),
        "dishes": sum(n for _, n in dish_counts(menu)),
        "expect_dishes": expect_dishes,
    }
    r["count_ok"] = expect_dishes is None or expect_dishes == r["dishes"]
    r["ok"] = not r["dropped"] and not r["extra"] and not r["near"] and r["count_ok"]
    return r


def report(r):
    lines = []
    lines.append("Dishes by section: " + ", ".join(f"{n} {s}" for s, n in r["sections"]) + f"  (total {r['dishes']})")
    if r["expect_dishes"] is not None:
        lines.append(f"Control total: you said {r['expect_dishes']}, we hold {r['dishes']}: "
                     + ("MATCH" if r["count_ok"] else "MISMATCH"))
    else:
        lines.append("Control total: not given. Count the dishes on the printed menu and re-run with --expect-dishes N.")
    if r["dropped"]:
        lines.append("\nPRINTED ON THE SOURCE BUT NOT FOUND IN OUR MENU (dropped?):")
        for ln in r["dropped"]:
            lines.append(f"  {ln}")
    if r["extra"]:
        lines.append("\nIN OUR MENU BUT NOT ON THE SOURCE (invented or mistyped?):")
        for w, ctx in r["extra"]:
            lines.append(f"  '{w}'  <- " + " | ".join(ctx))
    if r["near"]:
        lines.append("\nSPELT DIFFERENTLY ON THE SOURCE (a person must confirm each against the printed menu):")
        for w, src_w in r["near"]:
            lines.append(f"  ours '{w}'  vs source '{src_w[0] if src_w else '?'}'  -> if ours is right, re-run with --accept {w}")
    lines.append("\nRESULT: " + ("PASS. Nothing dropped, nothing invented." if r["ok"] else "FAIL. Do not publish until this is fixed."))
    return "\n".join(lines)


def ocr(image):
    """Read the text in a picture with macOS Vision. Compiles the little Swift helper once. The picture is
    enlarged first: at its normal size the OCR skips some small lines (it missed a whole dish description once)."""
    binary = HERE / ".ocr_image"
    if not binary.exists():
        subprocess.run(["swiftc", "-O", str(HERE / "ocr_image.swift"), "-o", str(binary)], check=True)
    with tempfile.TemporaryDirectory() as tmp:
        big = Path(tmp) / "big.jpg"
        subprocess.run(["sips", "-Z", "2400", str(image), "--out", str(big)], check=True, capture_output=True)
        out = subprocess.run([str(binary), str(big)], check=True, capture_output=True, text=True).stdout
    return [ln.strip() for ln in out.splitlines() if ln.strip()]


def pdf_lines(path):
    from pypdf import PdfReader
    raw = "\n".join(p.extract_text() or "" for p in PdfReader(str(path)).pages)
    return [re.sub(r"\s+", " ", ln).strip() for ln in raw.splitlines() if ln.strip()]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--menu", type=Path, required=True, help="the menu JSON file, e.g. data/menu.json")
    ap.add_argument("--id", required=True, help="which menu in that file")
    ap.add_argument("--image", action="append", default=[], type=Path, help="a picture of the menu (repeat for more)")
    ap.add_argument("--pdf", action="append", default=[], type=Path)
    ap.add_argument("--allow-source", action="append", default=[], help="a source line we deliberately don't copy, e.g. a page title")
    ap.add_argument("--accept", action="append", default=[], help="a word you have checked against the printed menu that OCR read differently")
    ap.add_argument("--expect-dishes", type=int, help="control total: how many dishes YOU count on the printed menu")
    args = ap.parse_args(argv)
    menus = {m["id"]: m for m in json.loads(args.menu.read_text())["menus"]}
    if args.id not in menus:
        print(f"No menu '{args.id}' in {args.menu}", file=sys.stderr)
        return 1
    sources = [ocr(i) for i in args.image] + [pdf_lines(p) for p in args.pdf]
    if not sources:
        print("Give at least one --image or --pdf to check against.", file=sys.stderr)
        return 1
    r = check(sources, menus[args.id], expect_dishes=args.expect_dishes, allow_source=args.allow_source, accept=args.accept)
    print(report(r))
    return 0 if r["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
