# HMS-Conqueror

Interactive HTML dashboards for the chartering, S&P and research desks.

| Dashboard | Path | What it is |
|---|---|---|
| **VLCC Newbuilding Analysis** | `Newbuild Interactive (1)/VLCC Dashboard.html` | Newbuild vs. secondhand economics, sensitivity and breakeven modelling. |
| **Freight Desk Approval Tracker** | `approval-tracker/index.html` | US presidential approval read as a leading indicator of maritime policy risk. |

## Freight Desk Approval Tracker

An in-house adaptation of [*The Economist*'s Trump approval
tracker](https://www.economist.com/interactive/trump-approval-tracker), rebuilt for a shipbroking
desk. It keeps the original's net-approval framing and reproduces its published figures with
attribution, then adds the maritime layer:

- **Plate 01** — net approval from +11 at inauguration to −29, with our policy events pinned on it
  (Section 301, the tariff rounds, the Hormuz spike).
- **Plate 02** — net approval by issue, with the three that reach our fixtures directly picked out
  from the background political weather.
- **Plate 03** — a transmission board mapping each poll number to the freight channel it travels
  down, the segments exposed, and what the desk would actually do about it.
- **Plate 04** — the Section 301 vessel fee: zero today, $23/NT (Annex II) or $80/NT (Annex I) if
  it reverts. Market context marks sit below it, visually subordinated.
- **Plate 05** — a **fee calculator**. Pick a segment or type the net tonnage off the tonnage
  certificate, choose which annex applies, and read the fee per US voyage at every step of the
  published schedule.
- **Plate 06** — the November window: the midterms on 3 November 2026 and the expiry of the
  Section 301 vessel-fee truce on 9 November 2026, six days apart.

### The Section 301 schedule

Fees are assessed **per US voyage on net tonnage** — not deadweight, not per port call. Two
separate schedules apply, and conflating them is the easy mistake:

| Per net ton | Oct 2025 | Apr 2026 | Apr 2027 | Apr 2028 |
|---|---|---|---|---|
| **Annex II** — Chinese-*built*, non-Chinese operator | $18 | $23 | $28 | $33 |
| **Annex I** — Chinese-*owned or operated* | $50 | $80 | $110 | $140 |
| Box ships, alternative basis (per container discharged) | $120 | $153 | $195 | $250 |

Korean, Japanese and European-built tonnage under a non-Chinese operator falls outside both
annexes and pays nothing. Everything is suspended until 9 November 2026.

### Visual design

Aqua (Mac OS X, 2001–2007) read through modern Apple HIG. The page is a stack of windows on a
pinstriped desktop: brushed-metal title bars, sunken bezels around the charts, lickable gel
controls, and candy-stripe progress bars on the countdowns. Dark mode is Aqua's own **Graphite**
appearance rather than an inversion of the light theme.

**Every control does something.** A ship's console has no decorative lamps, so the window title
bars carry brass instruments rather than imitation traffic lights: a knurled **shade lever** that
collapses its panel, and — in the masthead — a **DAY / NIGHT switch**, the bridge-lighting control,
wired to the page's appearance and remembered per browser.

Type is Source Serif 4 (standing in for Apple's New York) and Source Sans 3 (for Lucida Grande /
Myriad); data figures use the native Apple mono stack, so on a Mac they render in SF Mono or Menlo.

Single self-contained file — no build step, no runtime dependencies. Charts are hand-rolled SVG.
Light and dark themes both ship. Every chart has a keyboard-reachable data-table view, and the
series colours are validated for colourblind separation and contrast against both window surfaces.

### Provenance

Every figure on the page carries one of three tags, and the key is repeated in the sources section:

| Tag | Meaning |
|---|---|
| **Published** | A figure published by the named source. |
| **Desk-entered** | Typed in by hand from secondary reporting. Verify before quoting; replace with a live feed. |
| **Our calculation** | Derived by us from published inputs, with the arithmetic shown. |

### Updating the approval series

The series is **maintained by hand** — seven readings across nineteen months, so a feed would
cost more than it saves. To add one, append a single entry to `NET` in `approval-tracker/index.html`,
in date order, and change nothing else: the hero figures, the chart, the readings table, the
reading count and the "weakest reading" claim all derive from that array.

```js
{ d:"2026-09-14", v:-27, a:35, p:62, kind:"poll",
  src:"Economist/YouGov, 11–14 Sep 2026" },
```

| Field | |
|---|---|
| `d` | ISO date the reading was published |
| `v` | net approval (negative is underwater) |
| `a`, `p` | approve / disapprove. A single poll has both; **a poll-of-polls has neither — use `null`.** Never infer a split from the net. |
| `kind` | `"poll"` for one Economist/YouGov poll, `"agg"` for an Economist poll-of-polls |
| `src` | the citation shown in the tooltip and the table |

`checkNET()` runs on load and warns in the browser console if an entry breaks those rules —
including when `v !== a - p`, which catches a mistyped figure. Open the console after editing.

The page also shows the age of the latest reading, and displays a **"check for a newer poll"**
flag once it passes 45 days, so a series nobody has touched cannot quietly present itself as
current.

**Plate 01 plots only published readings** — seven of them, at the dates they were published.
Nothing is interpolated: where more than a hundred days separate two readings the connector is
drawn dashed, because there is no data in between. (An earlier draft drew a smooth monthly line
through invented intermediate points; that has been removed.)

**Demo status.** The two market-context marks were hand-entered from secondary reporting rather
than read off a terminal — the TD3C figure in particular is extraordinary and wants checking
against Baltic. Wire the page to a live Baltic/Drewry feed and the licensed Economist/YouGov feed
before it goes near a client. The transmission board and the November window are desk opinion.

### Viewing it

Open `approval-tracker/index.html` directly, or serve the repo root and browse to
`/approval-tracker/`. With GitHub Pages enabled (Settings → Pages → deploy from `main`, `/ (root)`),
the site is at `https://charlie-del-hash.github.io/HMS-Conqueror/`. The root redirects to the
Approval Tracker and falls back to a menu of both dashboards if the redirect does not fire.
