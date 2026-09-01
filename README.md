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

- **Plate 01** — the approval series since January 2025 with our policy events pinned on it
  (Section 301, the tariff rounds, the sanctions and Hormuz spikes).
- **Plate 02** — net approval by issue, with the four issues that transmit directly to freight
  picked out from the background political weather.
- **Plate 03** — a transmission board mapping each poll number to the freight channel it travels
  down and the segments exposed to it.
- **Plate 04** — the published rate assessments the market has already moved to.
- **Plate 05** — the November window: the midterms on 3 November 2026 and the expiry of the
  Section 301 vessel-fee truce on 9 November 2026, six days apart.

### Visual design

Aqua (Mac OS X, 2001–2007) read through modern Apple HIG. The page is a stack of windows on a
pinstriped desktop: brushed-metal title bars with traffic lights, sunken bezels around the charts,
lickable gel controls, and candy-stripe progress bars on the countdowns. Dark mode is Aqua's own
**Graphite** appearance rather than an inversion of the light theme.

Type is Source Serif 4 (standing in for Apple's New York) and Source Sans 3 (for Lucida Grande /
Myriad); data figures use the native Apple mono stack, so on a Mac they render in SF Mono or Menlo.

Single self-contained file — no build step, no runtime dependencies. Charts are hand-rolled SVG.
Light and dark themes both ship. Every chart has a keyboard-reachable data-table view, and the
series colours are validated for colourblind separation and contrast against both window surfaces.

**Demo status.** Figures carrying a source in the "Credit, sources and method" section are
published numbers. The path drawn *between* published readings on Plate 01 is interpolated to show
the shape of the series and should not be quoted point-by-point. Before this goes to clients it
needs the licensed Economist/YouGov feed behind it and a live Baltic/Drewry connection in place of
hand-entered rate assessments. The transmission board and the November window are desk opinion.

### Viewing it

Open `approval-tracker/index.html` directly, or serve the repo root and browse to
`/approval-tracker/`. With GitHub Pages enabled (Settings → Pages → deploy from `main`, `/ (root)`),
the site is at `https://charlie-del-hash.github.io/HMS-Conqueror/`. The root redirects to the
Approval Tracker and falls back to a menu of both dashboards if the redirect does not fire.
