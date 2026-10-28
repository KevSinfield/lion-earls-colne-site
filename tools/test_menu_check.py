"""Tests for the menu completeness check: it must pass a faithful copy and fail on any dropped or invented dish."""
import copy
import unittest

import menu_check

SOURCE = [
    "THE", "LION", "EARLS COLNE",
    "PUB CLASSICS",
    "Honest, hearty favourites, done properly.",
    "Ham, Egg & Chips",
    "Home-cooked ham, two free-range eggs and",
    "chunky chips.",
    "Scampi & Chips",
    "Breaded scampi with chunky chips, buttered",
    "peas and homemade tartare sauce.",
    "Falafel & Hummus ve",
]


def dish(name, desc=None, tags=None):
    return {"name": name, "description": desc, "price": None, "tags": tags or [], "label": None}


MENU = {
    "id": "t", "title": "Test", "intro": None, "offers": [], "events": [], "footnote": None,
    "sections": [{"name": "Pub Classics", "note": "Honest, hearty favourites, done properly.", "items": [
        dish("Ham, Egg & Chips", "Home-cooked ham, two free-range eggs and chunky chips."),
        dish("Scampi & Chips", "Breaded scampi with chunky chips, buttered peas and homemade tartare sauce."),
        dish("Falafel & Hummus", None, ["vegan"]),
    ]}],
}


class MenuCheck(unittest.TestCase):
    def test_faithful_copy_passes(self):
        r = menu_check.check([SOURCE], MENU, expect_dishes=3)
        self.assertTrue(r["ok"], menu_check.report(r))

    def test_dropped_dish_fails(self):
        m = copy.deepcopy(MENU)
        del m["sections"][0]["items"][1]  # lose the scampi
        r = menu_check.check([SOURCE], m)
        self.assertFalse(r["ok"])
        self.assertTrue(any("Scampi" in ln for ln in r["dropped"]))

    def test_dropped_description_fails(self):
        m = copy.deepcopy(MENU)
        m["sections"][0]["items"][0]["description"] = "Home-cooked ham and chunky chips."  # lost the eggs
        r = menu_check.check([SOURCE], m)
        self.assertFalse(r["ok"])

    def test_invented_dish_fails(self):
        m = copy.deepcopy(MENU)
        m["sections"][0]["items"].append(dish("Sirloin Steak", "Served with peppercorn sauce."))
        r = menu_check.check([SOURCE], m)
        self.assertFalse(r["ok"])
        self.assertIn("sirloin", [w for w, _ in r["extra"]])

    def test_typo_in_our_data_fails(self):
        m = copy.deepcopy(MENU)
        m["sections"][0]["items"][1]["description"] = m["sections"][0]["items"][1]["description"].replace("scampi", "scamp")
        self.assertFalse(menu_check.check([SOURCE], m)["ok"])

    def test_ocr_slip_needs_a_person_to_confirm(self):
        slipped = [ln.replace("Breaded", "Breadec") for ln in SOURCE]
        r = menu_check.check([slipped], MENU)
        self.assertFalse(r["ok"])
        self.assertEqual([w for w, _ in r["near"]], ["breaded"])
        self.assertTrue(menu_check.check([slipped], MENU, accept=["breaded"])["ok"])

    def test_diet_mark_read_as_stray_letters_is_tolerated(self):
        noisy = SOURCE[:-1] + ["Falafel & Hummus De"]
        self.assertTrue(menu_check.check([noisy], MENU)["ok"])

    def test_control_total_must_match(self):
        r = menu_check.check([SOURCE], MENU, expect_dishes=4)
        self.assertFalse(r["ok"])
        self.assertFalse(r["count_ok"])

    def test_page_title_can_be_allowed_but_only_when_named(self):
        with_title = SOURCE + ["WOOD-FIRED PIZZA"]
        self.assertFalse(menu_check.check([with_title], MENU)["ok"])
        self.assertTrue(menu_check.check([with_title], MENU, allow_source=["WOOD-FIRED PIZZA"])["ok"])

    def test_overlapping_pictures_are_fine(self):
        self.assertTrue(menu_check.check([SOURCE, SOURCE[3:]], MENU)["ok"])


if __name__ == "__main__":
    unittest.main()
