"""Run: tools/.venv/bin/python -m unittest discover -s tools -v"""
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path

import extract_menu as X

HERE = Path(__file__).parent
SAMPLE = HERE / "samples" / "chapel-weekend-specials.pdf"


class ExtractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.menu, cls.warnings = X.parse(X.read_lines(SAMPLE))

    def items(self):
        return {i["name"]: i for s in self.menu["sections"] for i in s["items"]}

    def test_header_and_dates(self):
        self.assertEqual(self.menu["title"], "Weekend Specials")
        self.assertIn("Chapel", self.menu["venue"])
        self.assertEqual((self.menu["valid_from"], self.menu["valid_to"]), ("2026-10-02", "2026-10-04"))

    def test_sections_and_prices(self):
        self.assertEqual([s["name"] for s in self.menu["sections"]], ["To Begin", "Big Plates"])
        it = self.items()
        self.assertEqual(len(it), 5)
        self.assertEqual(it["Corn Ribs"]["price"], 8.0)
        self.assertEqual(it["Luxury Fish Pie"]["price"], 19.5)

    def test_tag_and_label(self):
        it = self.items()
        self.assertEqual(it["Gnocchi"]["tags"], ["vegetarian"])
        self.assertEqual(it["Luxury Fish Pie"]["label"], "Market fish · this weekend")

    def test_wrapped_description_joined(self):
        d = self.items()["Luxury Fish Pie"]["description"]
        self.assertTrue(d.startswith("Haddock") and d.endswith("seasonal greens."))

    def test_offer_and_events(self):
        o = self.menu["offers"][0]
        self.assertEqual(o["headline"], "£15 — lunch and a drink")
        self.assertEqual(o["detail"], "Tuesday to Friday, 12pm to 2pm")
        quiz = next(e for e in self.menu["events"] if e["title"] == "Sunday Quiz")
        self.assertEqual((quiz["date"], quiz["time"]), ("2026-10-04", "7.30pm"))
        roast = next(e for e in self.menu["events"] if e["recurs"])
        self.assertEqual((roast["recurs"], roast["time"]), ("Sunday", "12pm to 4pm"))

    def test_no_warnings(self):
        self.assertEqual(self.warnings, [])

    def test_date_variants(self):
        f = X.parse_validity
        self.assertEqual(f("2–4 October 2026"), (dt.date(2026, 10, 2), dt.date(2026, 10, 4)))
        self.assertEqual(f("30 October to 2 November 2026"), (dt.date(2026, 10, 30), dt.date(2026, 11, 2)))
        self.assertEqual(f("5 December 2026"), (dt.date(2026, 12, 5), dt.date(2026, 12, 5)))
        self.assertEqual(f("no dates here"), (None, None))

    def test_upsert_replaces_same_id_and_keeps_backup(self):
        with tempfile.TemporaryDirectory() as d:
            target = Path(d) / "menu.json"
            X.upsert({"id": "a", "title": "one"}, target)
            X.upsert({"id": "b", "title": "two"}, target)
            X.upsert({"id": "a", "title": "one-new"}, target)
            data = json.loads(target.read_text())
            self.assertEqual(sorted(m["id"] for m in data["menus"]), ["a", "b"])
            self.assertEqual(next(m for m in data["menus"] if m["id"] == "a")["title"], "one-new")
            self.assertTrue(list((Path(d) / "history").glob("menu-*.json")))

    def test_menu_without_dates_is_refused(self):
        with self.assertRaises(X.MenuError):
            X.parse(["THE LION", "SUNDAY MENU", "Roast beef 18.00", "Served pink."])

    def test_menu_without_dishes_is_refused(self):
        with self.assertRaises(X.MenuError):
            X.parse(["THE LION", "SUNDAY MENU", "Every Sunday · 1 October 2026", "Come and say hello."])


if __name__ == "__main__":
    unittest.main()
