#!/usr/bin/env python3
"""Turn a menu PDF into clean JSON for the Lion site.

    tools/.venv/bin/python tools/extract_menu.py MENU.pdf --expect-venue Lion --merge data/menu.json

Reads the PDF's real text (the menus are made in Chrome, so the text is embedded),
splits it into sections, dishes, prices, offers and events, works out the dates the
menu is valid for, and upserts it into the site's menu file. Nothing is published
anywhere: it only edits the local JSON file, and keeps a backup of the old one.
"""
import argparse
import datetime as dt
import json
import re
import shutil
import sys
from pathlib import Path

from pypdf import PdfReader

import menu_check

MONTHS = ["january", "february", "march", "april", "may", "june", "july",
          "august", "september", "october", "november", "december"]
MONTH_RE = "|".join(m.capitalize() for m in MONTHS) + "|" + "|".join(m[:3].capitalize() for m in MONTHS)
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
TAGS = {"V": "vegetarian", "VG": "vegan", "VE": "vegan", "GF": "gluten free", "DF": "dairy free", "N": "contains nuts"}

PRICE_RE = re.compile(r"^(?P<name>.+?)\s+£?(?P<price>\d{1,3}\.\d{2})$")
TIME_RE = (r"\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm)(?:\s*(?:to|-|–)\s*\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm))?")


class MenuError(Exception):
    pass


def month_num(name):
    return [m[:3] for m in MONTHS].index(name[:3].lower()) + 1


def is_caps(line):
    letters = [c for c in line if c.isalpha()]
    return len(letters) >= 3 and all(c.isupper() for c in letters)


def sentence(text):
    text = re.sub(r"\s+", " ", text.strip()).lower()
    return text[:1].upper() + text[1:]


def read_lines(pdf_path):
    reader = PdfReader(str(pdf_path))
    raw = "\n".join(page.extract_text() or "" for page in reader.pages)
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in raw.splitlines()]
    lines = [ln for ln in lines if ln]
    if len(" ".join(lines)) < 80:
        raise MenuError("This PDF has almost no readable text. It may be a scan or a picture. "
                        "Ask for the original PDF, not a photo or screenshot.")
    return lines


def parse_validity(text):
    """Return (from, to) ISO dates found in a line like '2–4 October 2026'."""
    t = text.replace("–", "-").replace("—", "-")
    m = re.search(rf"(\d{{1,2}})\s+({MONTH_RE})\s*(?:to|-)\s*(\d{{1,2}})\s+({MONTH_RE})\s+(\d{{4}})", t)
    if m:
        y = int(m[5])
        return dt.date(y, month_num(m[2]), int(m[1])), dt.date(y, month_num(m[4]), int(m[3]))
    m = re.search(rf"(\d{{1,2}})\s*(?:to|-)\s*(\d{{1,2}})\s+({MONTH_RE})\s+(\d{{4}})", t)
    if m:
        y, mo = int(m[4]), month_num(m[3])
        return dt.date(y, mo, int(m[1])), dt.date(y, mo, int(m[2]))
    m = re.search(rf"(\d{{1,2}})\s+({MONTH_RE})\s+(\d{{4}})", t)
    if m:
        d = dt.date(int(m[3]), month_num(m[2]), int(m[1]))
        return d, d
    return None, None


def split_tags(name):
    tags = []
    words = name.split()
    while len(words) > 1 and words[-1].upper().strip("()") in TAGS:
        tags.insert(0, TAGS[words.pop().upper().strip("()")])
    return " ".join(words), tags


def parse_event(line, year):
    # Dated: "Sun 4 OctSunday Quiz · 7.30pm" (the PDF glues the month to the title)
    m = re.match(rf"^({'|'.join(d[:3] for d in DAYS)})[a-z]*\s+(\d{{1,2}})\s*({MONTH_RE})\s*(.+)$", line)
    if m:
        date = dt.date(year, month_num(m[3]), int(m[2])).isoformat()
        rest = m[4]
        tm = re.search(rf"\s*·\s*({TIME_RE})\s*$", rest)
        time = tm[1] if tm else None
        title = rest[:tm.start()] if tm else rest
        return {"title": title.strip(), "date": date, "recurs": None, "time": time, "note": None}
    # Weekly: "Every Sunday · 12pm to 4pm Sunday Roasts · the best in Essex..."
    m = re.match(r"^Every\s+(" + "|".join(DAYS) + r")\s*·\s*(.+)$", line)
    if m:
        parts = [p.strip() for p in m[2].split("·")]
        tm = re.match(rf"^({TIME_RE})\s*(.*)$", parts[0])
        time, title = (tm[1], tm[2]) if tm else (None, parts[0])
        return {"title": title.strip() or None, "date": None, "recurs": m[1], "time": time,
                "note": " · ".join(parts[1:]) or None}
    return None


def parse(lines, venue_hint=None):
    warnings = []

    # ---- header: venue words, then the all-caps menu title, then a dated subtitle
    date_idx = next((i for i, ln in enumerate(lines) if re.search(r"\b20\d\d\b", ln)), None)
    if date_idx is None:
        raise MenuError("Couldn't find a date on the menu (for example '2-4 October 2026'). "
                        "Specials need dates so they can expire.")
    head = lines[:date_idx]
    caps_head = [ln for ln in head if is_caps(ln)]
    if not caps_head:
        raise MenuError("Couldn't find the menu title (for example 'WEEKEND SPECIALS').")
    title_line = caps_head[-1]
    venue_words = [ln for ln in head if ln is not title_line and is_caps(ln)]
    venue = " ".join(venue_words).title().replace("The Chapel", "The Chapel")
    subtitle = lines[date_idx]
    valid_from, valid_to = parse_validity(subtitle)
    if not valid_from:
        warnings.append("Couldn't read the valid dates, so this menu will not expire by itself.")
    year = (valid_from or dt.date.today()).year

    # ---- find the end of the dish area: offer box, events block or footer
    def offer_at(i):
        return is_caps(lines[i]) and i + 1 < len(lines) and lines[i + 1].startswith("£")

    start = date_idx + 1
    end = len(lines)
    for i in range(start, len(lines)):
        if offer_at(i) or re.match(r"^coming up", lines[i], re.I):
            end = i
            break
    body = lines[start:end]

    # ---- dishes
    sections, intro, section, item, label = [], [], None, None, None

    def next_is_dish(i):
        if i + 1 >= len(body):
            return False
        return bool(PRICE_RE.match(body[i + 1])) or (is_caps(body[i + 1]) and not PRICE_RE.match(body[i + 1]))

    for i, ln in enumerate(body):
        pm = PRICE_RE.match(ln)
        if pm:
            name, tags = split_tags(pm["name"])
            item = {"name": name, "price": float(pm["price"]), "description": "", "tags": tags, "label": label}
            label = None
            if section is None:
                section = {"name": "Menu", "items": []}
                sections.append(section)
            section["items"].append(item)
        elif is_caps(ln):
            label = sentence(ln)
        elif len(ln.split()) <= 5 and not re.search(r"[.,;]$", ln) and next_is_dish(i):
            section = {"name": ln, "items": []}
            sections.append(section)
            item = None
        elif item is not None:
            item["description"] = (item["description"] + " " + ln).strip()
        else:
            intro.append(ln)

    # ---- offers, events, notice from the tail
    tail = lines[end:]
    offers, events, notice, i, in_events = [], [], [], 0, False
    while i < len(tail):
        ln = tail[i]
        j = i + start  # absolute index for offer_at
        if is_caps(ln) and i + 1 < len(tail) and tail[i + 1].startswith("£"):
            offers.append({"title": sentence(ln), "headline": tail[i + 1],
                           "detail": tail[i + 2] if i + 2 < len(tail) and not is_caps(tail[i + 2])
                           and not re.match(r"^coming up", tail[i + 2], re.I) and "·" not in tail[i + 2][:3] else None})
            i += 3 if offers[-1]["detail"] else 2
            continue
        if re.match(r"^coming up", ln, re.I):
            in_events = True
        elif is_caps(ln):
            notice.append(ln)
        elif in_events:
            ev = parse_event(ln, year)
            if ev:
                events.append(ev)
            elif venue_words and all(w.lower() in ln.lower() for w in venue_words[:1]):
                in_events = False  # footer venue line
        i += 1
    notice_text = sentence(" ".join(notice)) if notice else None

    for s in sections:
        if not s["items"]:
            warnings.append(f"Section '{s['name']}' has no dishes. Check the PDF.")
    for s in sections:
        for it in s["items"]:
            if not it["description"]:
                warnings.append(f"'{it['name']}' has no description.")
    if not sections:
        raise MenuError("Found no dishes with prices. Is this a menu PDF?")

    title = title_line.title()
    return {
        "id": re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-"),
        "venue": venue,
        "title": title,
        "subtitle": subtitle,
        "valid_from": valid_from.isoformat() if valid_from else None,
        "valid_to": valid_to.isoformat() if valid_to else None,
        "intro": " ".join(intro) or None,
        "sections": sections,
        "offers": offers,
        "events": events,
        "footnote": notice_text,
    }, warnings


def upsert(menu, target: Path):
    data = {"menus": []}
    if target.exists():
        data = json.loads(target.read_text())
        history = target.parent / "history"
        history.mkdir(exist_ok=True)
        shutil.copy2(target, history / f"{target.stem}-{dt.datetime.now():%Y%m%d-%H%M%S}.json")
    menus = [m for m in data.get("menus", []) if m.get("id") != menu["id"]]
    menus.append(menu)
    data["menus"] = menus
    tmp = target.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    tmp.replace(target)


def preview(menu):
    out = [f"{menu['venue']} · {menu['title']}  ({menu['valid_from']} to {menu['valid_to']})"]
    for s in menu["sections"]:
        out.append(f"\n  {s['name']}")
        for it in s["items"]:
            tag = f" [{', '.join(it['tags'])}]" if it["tags"] else ""
            lab = f"({it['label']}) " if it["label"] else ""
            out.append(f"    {lab}{it['name']}{tag}  £{it['price']:.2f}")
    for o in menu["offers"]:
        out.append(f"\n  Offer: {o['title']}: {o['headline']} ({o['detail']})")
    for e in menu["events"]:
        out.append(f"  Event: {e['title']} {e['date'] or 'every ' + str(e['recurs'])} {e['time'] or ''}")
    return "\n".join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--out", type=Path, help="write this one menu as JSON")
    ap.add_argument("--merge", type=Path, help="upsert into this menu file (replaces same id)")
    ap.add_argument("--expect-venue", help="refuse unless the menu header contains this word (e.g. Lion)")
    ap.add_argument("--id", help="override the menu id")
    ap.add_argument("--expect-dishes", type=int, help="control total: how many dishes YOU count on the printed menu")
    ap.add_argument("--allow-source", action="append", default=[], help="a printed line we deliberately don't keep, e.g. a marketing blurb")
    ap.add_argument("--accept", action="append", default=[], help="a word you have checked against the printed menu")
    ap.add_argument("--force", action="store_true", help="skip the venue check and the completeness check")
    args = ap.parse_args(argv)

    try:
        lines = read_lines(args.pdf)
        menu, warnings = parse(lines)
        if args.expect_venue and not args.force and args.expect_venue.lower() not in menu["venue"].lower():
            raise MenuError(f"This menu says '{menu['venue']}', not '{args.expect_venue}'. "
                            "Not merging. Use --force only if you're sure.")
    except MenuError as e:
        print(f"STOPPED: {e}", file=sys.stderr)
        return 2
    if args.id:
        menu["id"] = args.id
    menu["source"] = {"file": args.pdf.name, "extracted_at": dt.datetime.now().isoformat(timespec="seconds")}

    print(preview(menu))
    for w in warnings:
        print(f"  WARNING: {w}", file=sys.stderr)

    # Double check: nothing printed on the PDF may be missing from the menu, and nothing in the menu may be invented.
    check = menu_check.check([lines], menu, lenient=True, include_extras=True,
                             expect_dishes=args.expect_dishes, accept=args.accept, allow_source=args.allow_source)
    print("\nCOMPLETENESS CHECK\n" + menu_check.report(check))
    if not check["ok"] and not args.force:
        print("STOPPED: the menu does not match the PDF exactly. Nothing was written. Fix the PDF or the parser, "
              "or use --force only if you have checked it by hand.", file=sys.stderr)
        return 3
    if args.out:
        args.out.write_text(json.dumps(menu, indent=2, ensure_ascii=False) + "\n")
        print(f"\nWrote {args.out}")
    if args.merge:
        # Keep the Lion's own PDF for the Download PDF button: menus/<id>.pdf next to the data folder
        menus_dir = args.merge.resolve().parent.parent / "menus"
        menus_dir.mkdir(exist_ok=True)
        shutil.copy2(args.pdf, menus_dir / f"{menu['id']}.pdf")
        menu["pdf"] = f"menus/{menu['id']}.pdf"
        upsert(menu, args.merge)
        print(f"\nMerged into {args.merge} as '{menu['id']}'")
    return 0


if __name__ == "__main__":
    sys.exit(main())
