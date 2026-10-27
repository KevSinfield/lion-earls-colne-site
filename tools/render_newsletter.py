#!/usr/bin/env python3
"""Render the weekly Lion newsletter as email-safe HTML.

    python3 tools/render_newsletter.py --content tools/samples/newsletter-sample.json --sample --out newsletter/preview.html

Email clients are far more limited than browsers, so this uses table layout, inline styles,
web-safe fonts (Georgia/Arial) and a text masthead, so it needs no images. Menu dishes come from data/menu.json,
offers and events from the content file. Nothing is sent: this only writes an HTML file.
Brevo's unsubscribe tag is swapped in when the campaign is created (see UNSUBSCRIBE).
"""
import argparse
import datetime as dt
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Shared facts. TODO: move into one data file once the weekly job is wired up.
VENUE = {
    "name": "The Lion",
    "address": "High Street, Earls Colne, Essex CO6 2PA",
    "phone": "01206 911385",
    "site": "https://thelionearlscolne.com",  # TODO: confirm once the real site is live
    "book": "",  # TODO: the Lion's own Stampede link. Never tel:. Empty = link to the site's Find us section
}
UNSUBSCRIBE = "[[UNSUBSCRIBE_URL]]"  # TODO: replace with Brevo's unsubscribe tag when sending

BG, PANEL, INK = "#e7dcc6", "#f8f2e4", "#1e1513"      # page, card, text
GOLD, MUTE, LINE = "#8a6424", "#6b5f55", "#d9cdb4"     # accent text, secondary text, hairlines
DARK = "#171310"                                      # offer box and button
SERIF = "Georgia, 'Times New Roman', serif"
SANS = "Arial, Helvetica, sans-serif"


def e(text):
    return escape(str(text or ""), quote=True)


def nice_date(iso):
    d = dt.date.fromisoformat(iso)
    return d.strftime("%a %-d %b").upper()


def price(p):
    return f"£{p:.2f}" if p is not None else ""


def row(inner, bg=PANEL, pad="0 36px"):
    return f'<tr><td bgcolor="{bg}" style="background:{bg};padding:{pad};">{inner}</td></tr>'


def spacer(h=24, bg=PANEL):
    return f'<tr><td bgcolor="{bg}" height="{h}" style="height:{h}px;line-height:{h}px;font-size:1px;">&nbsp;</td></tr>'


def kicker(text, colour=GOLD):
    return (f'<p style="margin:0 0 10px;font:bold 11px {SANS};letter-spacing:3px;text-transform:uppercase;'
            f'color:{colour};">{e(text)}</p>')


def button(label, href, bg=DARK, colour="#f3ead8"):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>'
            f'<td bgcolor="{bg}" style="background:{bg};border-radius:0;">'
            f'<a href="{e(href)}" style="display:inline-block;padding:16px 38px;font:bold 13px {SANS};'
            f'letter-spacing:2.5px;text-transform:uppercase;color:{colour};text-decoration:none;">{e(label)}</a>'
            f'</td></tr></table>')


def offers_block(offers):
    out = []
    for o in offers:
        detail = (f'<p style="margin:6px 0 0;font:italic 15px {SERIF};color:#c9bfa9;">{e(o.get("detail"))}</p>'
                  if o.get("detail") else "")
        out.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
            f'style="margin:0 0 14px;"><tr><td bgcolor="{DARK}" align="center" style="background:{DARK};padding:26px 20px;">'
            f'<p style="margin:0 0 8px;font:bold 11px {SANS};letter-spacing:3px;text-transform:uppercase;color:#c79a4b;">'
            f'{e(o.get("title"))}</p>'
            f'<p style="margin:0;font:normal 28px/1.15 {SERIF};color:#f3ead8;">{e(o.get("headline"))}</p>'
            f'{detail}</td></tr></table>')
    return "".join(out)


def menu_block(menu, limit):
    items = [i for s in menu["sections"] for i in s["items"]][:limit]
    out = []
    for i in items:
        tags = "".join(
            f' <span style="font:bold 10px {SANS};letter-spacing:1px;text-transform:uppercase;color:{GOLD};">'
            f'{e(t)}</span>' for t in i.get("tags", []))
        desc = (f'<p style="margin:3px 0 0;font:13px/1.45 {SANS};color:{MUTE};">{e(i["description"])}</p>'
                if i.get("description") else "")
        out.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
            f'<tr><td style="padding:14px 0;border-bottom:1px solid {LINE};">'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
            f'<td valign="top" style="font:normal 19px/1.25 {SERIF};color:{INK};">{e(i["name"])}{tags}</td>'
            f'<td valign="top" align="right" width="70" style="font:normal 19px/1.25 {SERIF};color:{GOLD};'
            f'white-space:nowrap;">{price(i.get("price"))}</td></tr></table>{desc}</td></tr></table>')
    return "".join(out)


def events_block(events):
    out = []
    for ev in events:
        when = nice_date(ev["date"]) if ev.get("date") else (ev.get("recurs") or "").upper()
        meta = " · ".join(x for x in (ev.get("time"), ev.get("note")) if x)
        out.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
            f'<td valign="top" width="96" style="padding:14px 0;border-bottom:1px solid {LINE};'
            f'font:bold 12px {SANS};letter-spacing:2px;color:{GOLD};">{e(when)}</td>'
            f'<td valign="top" style="padding:14px 0;border-bottom:1px solid {LINE};">'
            f'<span style="font:normal 20px/1.2 {SERIF};color:{INK};">{e(ev["title"])}</span>'
            f'<br><span style="font:13px {SANS};color:{MUTE};">{e(meta)}</span></td></tr></table>')
    return "".join(out)


def masthead():
    rule = (f'<div style="height:1px;background:{INK};line-height:1px;font-size:1px;">&nbsp;</div>')
    return (
        f'<p style="margin:0;text-align:center;font:normal 13px {SERIF};letter-spacing:5px;text-indent:5px;'
        f'text-transform:uppercase;color:{INK};">The</p>'
        f'<p style="margin:2px 0 0;text-align:center;font:bold 58px/1 {SERIF};letter-spacing:6px;text-indent:6px;'
        f'text-transform:uppercase;color:{INK};">Lion</p>'
        f'<table role="presentation" width="250" align="center" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:12px auto 14px;"><tr><td valign="middle" width="105">{rule}</td>'
        f'<td align="center" valign="middle" style="font:11px/1 {SERIF};color:{INK};">&#9670;</td>'
        f'<td valign="middle" width="105">{rule}</td></tr></table>'
        f'<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr>'
        f'<td style="border:1px solid {INK};padding:7px 22px;font:bold 11px {SANS};letter-spacing:4px;'
        f'text-transform:uppercase;color:{INK};">Earls Colne</td></tr></table>')


def render(content, menu, sample, menu_limit):
    parts = []
    if sample:
        parts.append(row(
            f'<p style="margin:0;padding:9px 0;text-align:center;font:bold 11px {SANS};letter-spacing:1px;'
            f'color:#fff;">PREVIEW ONLY: layout test, not a live newsletter</p>',
            bg="#a33", pad="0 16px"))
    # Masthead: live text, so it never depends on images loading (same style as the printed menu)
    parts.append(row(masthead(), pad="38px 36px 26px"))
    parts.append(f'<tr><td bgcolor="{PANEL}" style="padding:0 36px;"><div style="height:1px;background:{LINE};'
                 f'line-height:1px;font-size:1px;">&nbsp;</div></td></tr>')
    # Title
    parts.append(row(
        kicker(content.get("kicker", "This week at the Lion")) +
        f'<h1 style="margin:0;font:normal 36px/1.12 {SERIF};color:{INK};">{e(content["headline"])}</h1>' +
        (f'<p style="margin:14px 0 0;font:italic 17px/1.5 {SERIF};color:{MUTE};">{e(content["intro"])}</p>'
         if content.get("intro") else ""), pad="30px 36px 6px"))
    # Offers
    if content.get("offers"):
        parts.append(row(offers_block(content["offers"]), pad="22px 36px 6px"))
    # Menu
    parts.append(row(kicker(content.get("menu_title", "On the menu")) + menu_block(menu, menu_limit) +
                     f'<p style="margin:16px 0 0;text-align:center;"><a href="{e(VENUE["site"])}#menu" '
                     f'style="font:bold 12px {SANS};letter-spacing:2px;text-transform:uppercase;color:{GOLD};'
                     f'text-decoration:underline;">See the full menu</a></p>', pad="26px 36px 8px"))
    # Events
    if content.get("events"):
        parts.append(row(kicker("What's on") + events_block(content["events"]), pad="26px 36px 8px"))
    # CTA
    parts.append(row(f'<p style="margin:0 0 18px;text-align:center;font:italic 18px {SERIF};color:{INK};">'
                     f'{e(content.get("cta_text", "Tables go quickly at the weekend."))}</p>' +
                     button("Book a table", VENUE["book"] or VENUE["site"] + "#find"), pad="34px 36px 40px"))
    # Footer
    parts.append(row(
        f'<p style="margin:0;text-align:center;font:13px/1.7 {SANS};color:{MUTE};">'
        f'{e(VENUE["name"])}, {e(VENUE["address"])}<br>'
        f'<a href="tel:{e(VENUE["phone"].replace(" ", ""))}" style="color:{MUTE};">{e(VENUE["phone"])}</a>'
        f' &nbsp;·&nbsp; <a href="{e(VENUE["site"])}" style="color:{MUTE};">thelionearlscolne.com</a></p>'
        f'<p style="margin:16px 0 0;text-align:center;font:11px/1.6 {SANS};color:#7d7364;">'
        f'You are receiving this because you signed up for news from The Lion.<br>'
        f'<a href="{UNSUBSCRIBE}" style="color:#7d7364;text-decoration:underline;">Unsubscribe</a></p>',
        bg=BG, pad="28px 36px 36px"))

    body = "\n".join(parts)
    pre = e(content.get("preheader", ""))
    return f"""<!DOCTYPE html>
<html lang="en-GB" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>{e(content.get("subject", content["headline"]))}</title>
<style>
  body {{ margin:0; padding:0; background:{BG}; }}
  a {{ color:{GOLD}; }}
  @media only screen and (max-width: 620px) {{
    .wrap {{ width:100% !important; }}
    h1 {{ font-size:30px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:{BG};">{pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{BG}" style="background:{BG};">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
{body}
</table>
</td></tr></table>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--content", type=Path, required=True, help="JSON with headline, offers, events")
    ap.add_argument("--menu-file", type=Path, default=ROOT / "data" / "menu.json")
    ap.add_argument("--menu-id", default="sunday-menu")
    ap.add_argument("--limit", type=int, default=6, help="max dishes to show")
    ap.add_argument("--sample", action="store_true", help="add a red 'sample content' strip")
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    content = json.loads(args.content.read_text())
    menus = json.loads(args.menu_file.read_text())["menus"]
    menu = next((m for m in menus if m["id"] == args.menu_id), None)
    if not menu:
        raise SystemExit(f"No menu with id '{args.menu_id}' in {args.menu_file}")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(render(content, menu, args.sample, args.limit))
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
