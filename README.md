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

Single self-contained file — no build step, no runtime dependencies. Charts are hand-rolled SVG;
type is Newsreader / IBM Plex Sans / IBM Plex Mono from Google Fonts. Light and dark themes both
ship. Every chart has a keyboard-reachable data-table view.

**Demo status.** Figures carrying a source in the "Credit, sources and method" section are
published numbers. The path drawn *between* published readings on Plate 01 is interpolated to show
the shape of the series and should not be quoted point-by-point. Before this goes to clients it
needs the licensed Economist/YouGov feed behind it and a live Baltic/Drewry connection in place of
hand-entered rate assessments. The transmission board and the November window are desk opinion.

### Viewing it

Open `approval-tracker/index.html` directly, or serve the repo root and browse to
`/approval-tracker/`. With GitHub Pages enabled, it is at
`https://<owner>.github.io/HMS-Conqueror/approval-tracker/` — note the repo root currently
redirects to the VLCC dashboard, so the tracker needs that path.
