/* ONE place to edit. Anything marked TODO still needs Craig to confirm.
   Source: the Lion's Facebook page (posts and graphics, 2 to 27 Oct 2026). */
window.LION = {
  name: "The Lion",
  address: "High Street, Earls Colne, Essex CO6 2PA",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=The+Lion+High+Street+Earls+Colne+CO6+2PA",
  phone: "01206 911385",
  email: "TODO",                        // Facebook shows both emma@ and andy@thelionearlscolne.com. Confirm which
  bookingUrl: "",   // TODO: the Lion's OWN Stampede link (not the Chapel's). All "Book a table" links must go through Stampede, never tel:. Empty = buttons point to #find until it exists.
  facebook: "https://www.facebook.com/profile.php?id=61594219600168",

  // From the Lion's "Updated opening hours" Facebook post of 15 Oct 2026 (supersedes the 2 Oct graphic).
  // TODO: confirm these are the standing hours.
  // 0 = Sunday. close past 24 means after midnight. kitchen = [start, end] windows (24h decimals).
  hours: {
    0: { open: 12, close: 20, kitchen: [[12, 17]] },
    1: null,
    2: { open: 16, close: 23, kitchen: [], note: "Drinks only. Poker from 7:30pm" },
    3: { open: 16, close: 22, kitchen: [[17.5, 20.5]], note: "2For1 pizzas" },
    4: { open: 12, close: 23, kitchen: [[12.5, 14.5], [17.5, 20.5]] },
    5: { open: 12, close: 25, kitchen: [[12.5, 14.5], [17.5, 20.5]] },
    6: { open: 12, close: 25, kitchen: [[12.5, 14.5], [17.5, 20.5]] }
  },

  // The week as the Lion actually runs it (Facebook, Oct 2026). TODO: confirm Tapas Friday times.
  week: [
    { day: "Tuesday", title: "Poker night", note: "From 7:30pm. Drinks only" },
    { day: "Wednesday", title: "2For1 pizzas", note: "Food 5:30 to 8:30pm" },
    { day: "Friday", title: "Tapas Friday", note: "5:30 to 8:30pm" },
    { day: "Saturday", title: "Open until 1am", note: "Food lunch and evening" },
    { day: "Sunday", title: "Sunday roast", note: "12 to 5pm. Book ahead" }
  ]
  // Menus live in data/menu.json (written by tools/extract_menu.py)
};
