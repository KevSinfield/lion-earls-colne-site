/* ONE place to edit. Anything marked TODO still needs Craig to confirm.
   Source: the Lion's Facebook page (posts and graphics, 2 to 4 Oct 2026). */
window.LION = {
  name: "The Lion",
  address: "High Street, Earls Colne, Essex CO6 2PA",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=The+Lion+High+Street+Earls+Colne+CO6+2PA",
  phone: "01206 911385",
  email: "TODO",                        // Facebook shows both emma@ and andy@thelionearlscolne.com. Confirm which
  bookingUrl: "",   // TODO: the Lion's OWN Stampede link (not the Chapel's). All "Book a table" links must go through Stampede, never tel:. Empty = buttons point to #find until it exists.
  facebook: "https://www.facebook.com/profile.php?id=61594219600168",

  // From the "Opening hours this week" graphic. TODO: confirm these are the standing hours.
  // 0 = Sunday. close past 24 means after midnight. kitchen = [start, end] windows (24h decimals).
  hours: {
    0: { open: 12, close: 20, kitchen: [[12, 18]] },
    1: null,
    2: null,
    3: { open: 16, close: 22, kitchen: [], note: "Drinks only" },
    4: { open: 12, close: 23, kitchen: [[12.5, 14.5], [17.5, 20.5]] },
    5: { open: 12, close: 25, kitchen: [[12.5, 14.5], [17.5, 20.5]] },
    6: { open: 12, close: 25, kitchen: [[12.5, 14.5], [17.5, 20.5]] }
  },

  // The week as the Lion actually runs it. TODO: confirm live music is every Friday
  week: [
    { day: "Wednesday", title: "Drinks at the bar", note: "From 4pm" },
    { day: "Thursday", title: "Pizza & tapas", note: "Kitchen 12:30 and 5:30" },
    { day: "Friday", title: "Live music", note: "9pm, food before" },
    { day: "Saturday", title: "Pizza & tapas", note: "Open until 1am" },
    { day: "Sunday", title: "Sunday roast", note: "12 until 6. Book ahead" }
  ]
  // Menus live in data/menu.json (written by tools/extract_menu.py)
};
