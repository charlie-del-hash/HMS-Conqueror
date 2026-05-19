// app.jsx — top-level VLCC dashboard app with Tweaks panel.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "terminal",
  "accent": "auto",
  "monoFont": "jetbrains",
  "sansFont": "dmSans",
  "displayFont": "dmSans",
  "numericStyle": "mono",
  "density": "regular",
  "radius": 8,
  "kpiStyle": "left-bar",
  "tabStyle": "underline",
  "chartFill": "split",
  "drydockMarkers": "line",
  "heatmapPalette": "redgreen",
  "lineWeight": 2.5,
  "showGrid": true,
  "showLegend": true,
  "showNotes": true,
  "showDrydockSummary": true,
  "compactKpi": false,
  "headerRule": true,
  "sidebarSide": "left",
  "animateCharts": true,
  "showEyebrow": true
}/*EDITMODE-END*/;

function VLCCDashboard() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme = useMemo(() => deriveTheme(tw.theme, tw), [tw]);
  const s = useMemo(() => makeStyles(theme, tw), [theme, tw]);

  // Persist accent within accent palette of the chosen theme
  const accentPalette = ACCENT_PALETTES[tw.theme] || ACCENT_PALETTES.terminal;

  const [activeTab, setActiveTab] = useState("breakeven");

  // ── Model state ──
  const [nbPrice, setNbPrice] = useState(DEFAULTS.nbPrice);
  const [deliveryMonths, setDeliveryMonths] = useState(DEFAULTS.deliveryMonths);
  const [economicLife, setEconomicLife] = useState(DEFAULTS.economicLife);
  const [dailyOpex, setDailyOpex] = useState(DEFAULTS.dailyOpex);
  const [opexEscalation, setOpexEscalation] = useState(DEFAULTS.opexEscalation);
  const [ltv, setLtv] = useState(DEFAULTS.ltv);
  const [interestRate, setInterestRate] = useState(DEFAULTS.interestRate);
  const [loanTenor, setLoanTenor] = useState(DEFAULTS.loanTenor);
  const [tcRate, setTcRate] = useState(DEFAULTS.tcRate);
  const [discountRate, setDiscountRate] = useState(DEFAULTS.discountRate);
  const [drydockBase, setDrydockBase] = useState(DEFAULTS.drydockBase);
  const [hasScrubber, setHasScrubber] = useState(false);
  const [isDualFuel, setIsDualFuel] = useState(false);
  const [shPrice, setShPrice] = useState(DEFAULTS.shPrice5yr);
  const [shAge, setShAge] = useState(DEFAULTS.shAge);
  const [shOpex, setShOpex] = useState(12000);

  const st = {
    nbPrice, setNbPrice, deliveryMonths, setDeliveryMonths, economicLife, setEconomicLife,
    dailyOpex, setDailyOpex, opexEscalation, setOpexEscalation, ltv, setLtv,
    interestRate, setInterestRate, loanTenor, setLoanTenor, tcRate, setTcRate,
    discountRate, setDiscountRate, drydockBase, setDrydockBase,
    hasScrubber, setHasScrubber, isDualFuel, setIsDualFuel,
    shPrice, setShPrice, shAge, setShAge, shOpex, setShOpex,
  };

  const breakeven = useMemo(() => calcBreakeven({
    yardPrice: nbPrice, deliveryMonths, economicLife, dailyOpex, opexEscalation,
    ltv, interestRate, loanTenor, tcRate, scrapValue: SCRAP_VALUE, hasScrubber,
    scrubberCapex: DEFAULTS.scrubberCapex, scrubberPremium: DEFAULTS.scrubberPremium,
    isDualFuel, dualFuelBunkerSaving: DEFAULTS.dualFuelBunkerSaving,
    dualFuelPremium: DEFAULTS.nbPriceDualFuel - DEFAULTS.nbPrice,
    drydockBase, drydockEscalation: DEFAULTS.drydockEscalation,
    drydockOffHireDays: DEFAULTS.drydockOffHireDays,
    tradingDaysPerYear: DEFAULTS.tradingDaysPerYear,
  }), [nbPrice, deliveryMonths, economicLife, dailyOpex, opexEscalation, ltv,
       interestRate, loanTenor, tcRate, hasScrubber, isDualFuel, drydockBase]);

  const comparison = useMemo(() => {
    const effectiveNbPrice = isDualFuel ? nbPrice + (DEFAULTS.nbPriceDualFuel - DEFAULTS.nbPrice) : nbPrice;
    const nbCapex = effectiveNbPrice + (hasScrubber ? DEFAULTS.scrubberCapex : 0);
    // TC uplifts apply only to the upgraded vessel (NB). The SH candidate
    // doesn't have a scrubber or LNG dual-fuel — it earns the base market rate.
    const nbUplift = (hasScrubber ? DEFAULTS.scrubberPremium : 0) + (isDualFuel ? DEFAULTS.dualFuelBunkerSaving : 0);
    const remainingLife = 25 - shAge;
    return calcNBvsSH(
      { capex: nbCapex, deliveryMonths, opex: dailyOpex, opexEsc: opexEscalation,
        tcRate, tcUplift: nbUplift,
        life: economicLife, scrap: SCRAP_VALUE,
        ddBase: drydockBase, ddEsc: DEFAULTS.drydockEscalation, ddOffHire: DEFAULTS.drydockOffHireDays },
      { capex: shPrice, deliveryMonths: 0, opex: shOpex, opexEsc: opexEscalation + 0.5,
        vesselAge: shAge, tcRate, tcUplift: 0,
        life: remainingLife, scrap: SCRAP_VALUE * 0.85,
        ddBase: drydockBase, ddEsc: DEFAULTS.drydockEscalation, ddOffHire: DEFAULTS.drydockOffHireDays + 5 },
      discountRate
    );
  }, [nbPrice, deliveryMonths, economicLife, dailyOpex, opexEscalation, tcRate, hasScrubber,
      isDualFuel, shPrice, shAge, shOpex, discountRate, drydockBase]);

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {tw.showEyebrow && (
            <div style={s.eyebrow}>VLCC · 2026 Market Benchmarks</div>
          )}
          <h1 style={s.title}>VLCC Newbuilding Analysis</h1>
          <div style={s.subtitle}>Breakeven &amp; investment decision tool</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: theme.mono, fontSize: 11, color: theme.textMuted }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: theme.positive }} />
          <span>LIVE · {tw.theme.toUpperCase()}</span>
        </div>
      </div>

      <div style={s.tabs}>
        <button style={s.tab(activeTab === "breakeven")} onClick={() => setActiveTab("breakeven")}>
          Breakeven Calculator
        </button>
        <button style={s.tab(activeTab === "nbvsh")} onClick={() => setActiveTab("nbvsh")}>
          NB vs Secondhand Matrix
        </button>
      </div>

      <div style={s.grid}>
        {tw.sidebarSide === "left" && (
          <div style={{ position: "sticky", top: 16, maxHeight: "calc(100vh - 32px)", overflowY: "auto", overflowX: "hidden", alignSelf: "start" }}>
            <InputPanel s={s} st={st} activeTab={activeTab} breakevenRate={breakeven.breakevenRate} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          {activeTab === "breakeven"
            ? <BreakevenTab s={s} st={st} breakeven={breakeven} />
            : <NBvsSHTab s={s} st={st} breakeven={breakeven} comparison={comparison} />}
        </div>
        {tw.sidebarSide === "right" && (
          <div style={{ position: "sticky", top: 16, maxHeight: "calc(100vh - 32px)", overflowY: "auto", overflowX: "hidden", alignSelf: "start" }}>
            <InputPanel s={s} st={st} activeTab={activeTab} breakevenRate={breakeven.breakevenRate} />
          </div>
        )}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Visual Style">
          <TweakSelect label="Theme" value={tw.theme}
            options={Object.keys(THEMES).map(k => ({ value: k, label: THEMES[k].label }))}
            onChange={(v) => {
              // Reset accent when switching themes
              setTweak({ theme: v, accent: "auto" });
            }} />
          <TweakColor label="Accent"
            value={tw.accent === "auto" ? (THEMES[tw.theme]?.accent || "#3b82f6") : tw.accent}
            options={accentPalette.map(a => a.value)}
            onChange={(v) => setTweak("accent", v)} />
          <TweakRadio label="Density" value={tw.density}
            options={["compact", "regular", "comfy"]}
            onChange={(v) => setTweak("density", v)} />
          <TweakSlider label="Corner radius" value={tw.radius} min={0} max={16} step={2} unit="px"
            onChange={(v) => setTweak("radius", v)} />
        </TweakSection>

        <TweakSection label="Typography">
          <TweakSelect label="Display font" value={tw.displayFont}
            options={[
              { value: "dmSans", label: "DM Sans" },
              { value: "inter", label: "Inter" },
              { value: "manrope", label: "Manrope" },
              { value: "spaceGrot", label: "Space Grotesk" },
              { value: "ibmSans", label: "IBM Plex Sans" },
              { value: "fraunces", label: "Fraunces (serif)" },
              { value: "newsreader", label: "Newsreader (serif)" },
            ]}
            onChange={(v) => setTweak("displayFont", v)} />
          <TweakSelect label="Body sans" value={tw.sansFont}
            options={[
              { value: "dmSans", label: "DM Sans" },
              { value: "inter", label: "Inter" },
              { value: "manrope", label: "Manrope" },
              { value: "spaceGrot", label: "Space Grotesk" },
              { value: "ibmSans", label: "IBM Plex Sans" },
            ]}
            onChange={(v) => setTweak("sansFont", v)} />
          <TweakSelect label="Mono font" value={tw.monoFont}
            options={[
              { value: "jetbrains", label: "JetBrains Mono" },
              { value: "ibm", label: "IBM Plex Mono" },
              { value: "spaceMono", label: "Space Mono" },
            ]}
            onChange={(v) => setTweak("monoFont", v)} />
          <TweakRadio label="Numbers" value={tw.numericStyle}
            options={[{value:"mono",label:"Mono"},{value:"sans",label:"Sans"}]}
            onChange={(v) => setTweak("numericStyle", v)} />
        </TweakSection>

        <TweakSection label="Surfaces">
          <TweakSelect label="KPI accent" value={tw.kpiStyle}
            options={[
              { value: "left-bar", label: "Left bar" },
              { value: "top-bar", label: "Top bar" },
              { value: "underline", label: "Underline" },
              { value: "tinted", label: "Tinted bg" },
              { value: "none", label: "None" },
            ]}
            onChange={(v) => setTweak("kpiStyle", v)} />
          <TweakSelect label="Tab style" value={tw.tabStyle}
            options={[
              { value: "underline", label: "Underline" },
              { value: "pill", label: "Pill" },
              { value: "segmented", label: "Segmented" },
            ]}
            onChange={(v) => setTweak("tabStyle", v)} />
          <TweakRadio label="Sidebar" value={tw.sidebarSide}
            options={["left", "right"]}
            onChange={(v) => setTweak("sidebarSide", v)} />
          <TweakToggle label="Compact KPI cards" value={tw.compactKpi}
            onChange={(v) => setTweak("compactKpi", v)} />
          <TweakToggle label="Header rule" value={tw.headerRule}
            onChange={(v) => setTweak("headerRule", v)} />
          <TweakToggle label="Eyebrow label" value={tw.showEyebrow}
            onChange={(v) => setTweak("showEyebrow", v)} />
        </TweakSection>

        <TweakSection label="Charts">
          <TweakSelect label="Area fill" value={tw.chartFill}
            options={[
              { value: "split", label: "Split (pos/neg)" },
              { value: "accent", label: "Accent gradient" },
              { value: "none", label: "No fill" },
            ]}
            onChange={(v) => setTweak("chartFill", v)} />
          <TweakSelect label="Drydock markers" value={tw.drydockMarkers}
            options={[
              { value: "line", label: "Dashed line" },
              { value: "dots", label: "Top markers" },
              { value: "band", label: "Vertical band" },
              { value: "hidden", label: "Hidden" },
            ]}
            onChange={(v) => setTweak("drydockMarkers", v)} />
          <TweakSelect label="Heatmap palette" value={tw.heatmapPalette}
            options={[
              { value: "redgreen", label: "Red / Green" },
              { value: "redblue", label: "Red / Blue" },
              { value: "mono", label: "Monochrome" },
            ]}
            onChange={(v) => setTweak("heatmapPalette", v)} />
          <TweakSlider label="Line weight" value={tw.lineWeight} min={1} max={5} step={0.5} unit="px"
            onChange={(v) => setTweak("lineWeight", v)} />
          <TweakToggle label="Grid lines" value={tw.showGrid}
            onChange={(v) => setTweak("showGrid", v)} />
          <TweakToggle label="Chart legends" value={tw.showLegend}
            onChange={(v) => setTweak("showLegend", v)} />
          <TweakToggle label="Caption notes" value={tw.showNotes}
            onChange={(v) => setTweak("showNotes", v)} />
          <TweakToggle label="Drydock summary" value={tw.showDrydockSummary}
            onChange={(v) => setTweak("showDrydockSummary", v)} />
          <TweakToggle label="Animate charts" value={tw.animateCharts}
            onChange={(v) => setTweak("animateCharts", v)} />
        </TweakSection>

        <TweakSection label="Presets">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <TweakButton label="Bloomberg" secondary onClick={() => setTweak({
              theme: "terminal", accent: "auto", monoFont: "jetbrains", sansFont: "dmSans",
              displayFont: "dmSans", numericStyle: "mono", density: "regular", radius: 6,
              kpiStyle: "left-bar", tabStyle: "underline", chartFill: "split",
              drydockMarkers: "line", heatmapPalette: "redgreen", lineWeight: 2.5,
              showGrid: true, headerRule: true, sidebarSide: "left", compactKpi: false,
              showEyebrow: true, animateCharts: true, showNotes: true, showDrydockSummary: true,
            })} />
            <TweakButton label="Trading Desk" secondary onClick={() => setTweak({
              theme: "terminal", accent: "#22d3ee", monoFont: "jetbrains", sansFont: "ibmSans",
              displayFont: "ibmSans", numericStyle: "mono", density: "compact", radius: 2,
              kpiStyle: "top-bar", tabStyle: "segmented", chartFill: "none",
              drydockMarkers: "line", heatmapPalette: "redgreen", lineWeight: 1.5,
              showGrid: true, headerRule: true, sidebarSide: "left", compactKpi: true,
              showEyebrow: false, animateCharts: false, showNotes: false, showDrydockSummary: true,
            })} />
            <TweakButton label="Print" secondary onClick={() => setTweak({
              theme: "editorial", accent: "auto", monoFont: "ibm", sansFont: "ibmSans",
              displayFont: "fraunces", numericStyle: "mono", density: "comfy", radius: 4,
              kpiStyle: "underline", tabStyle: "underline", chartFill: "none",
              drydockMarkers: "dots", heatmapPalette: "mono", lineWeight: 2,
              showGrid: true, headerRule: true, sidebarSide: "right", compactKpi: false,
              showEyebrow: true, animateCharts: false, showNotes: true, showDrydockSummary: true,
            })} />
            <TweakButton label="Analyst Memo" secondary onClick={() => setTweak({
              theme: "editorial", accent: "#1f3a5f", monoFont: "ibm", sansFont: "ibmSans",
              displayFont: "newsreader", numericStyle: "mono", density: "regular", radius: 0,
              kpiStyle: "underline", tabStyle: "underline", chartFill: "none",
              drydockMarkers: "dots", heatmapPalette: "mono", lineWeight: 1.5,
              showGrid: true, headerRule: true, sidebarSide: "right", compactKpi: true,
              showEyebrow: true, animateCharts: false, showNotes: true, showDrydockSummary: true,
            })} />
            <TweakButton label="Stark" secondary onClick={() => setTweak({
              theme: "mono", accent: "auto", monoFont: "jetbrains", sansFont: "ibmSans",
              displayFont: "ibmSans", numericStyle: "mono", density: "regular", radius: 0,
              kpiStyle: "none", tabStyle: "segmented", chartFill: "none",
              drydockMarkers: "line", heatmapPalette: "mono", lineWeight: 1.5,
              showGrid: true, headerRule: true, sidebarSide: "left", compactKpi: true,
              showEyebrow: false, animateCharts: false, showNotes: false, showDrydockSummary: true,
            })} />
            <TweakButton label="Heatwave" secondary onClick={() => setTweak({
              theme: "sunset", accent: "auto", monoFont: "spaceMono", sansFont: "manrope",
              displayFont: "manrope", numericStyle: "mono", density: "comfy", radius: 10,
              kpiStyle: "tinted", tabStyle: "pill", chartFill: "accent",
              drydockMarkers: "band", heatmapPalette: "redblue", lineWeight: 3,
              showGrid: false, headerRule: false, sidebarSide: "left", compactKpi: false,
              showEyebrow: true, animateCharts: true, showNotes: true, showDrydockSummary: true,
            })} />
            <TweakButton label="Helm" secondary onClick={() => setTweak({
              theme: "maritime", accent: "auto", monoFont: "ibm", sansFont: "ibmSans",
              displayFont: "fraunces", numericStyle: "mono", density: "regular", radius: 4,
              kpiStyle: "left-bar", tabStyle: "underline", chartFill: "accent",
              drydockMarkers: "line", heatmapPalette: "redblue", lineWeight: 2.5,
              showGrid: true, headerRule: true, sidebarSide: "left", compactKpi: false,
              showEyebrow: true, animateCharts: true, showNotes: true, showDrydockSummary: true,
            })} />
            <TweakButton label="CRT" secondary onClick={() => setTweak({
              theme: "phosphor", accent: "auto", monoFont: "spaceMono", sansFont: "spaceMono",
              displayFont: "spaceMono", numericStyle: "mono", density: "compact", radius: 0,
              kpiStyle: "top-bar", tabStyle: "underline", chartFill: "none",
              drydockMarkers: "dots", heatmapPalette: "mono", lineWeight: 1.5,
              showGrid: true, headerRule: true, sidebarSide: "left", compactKpi: true,
              showEyebrow: true, animateCharts: false, showNotes: false, showDrydockSummary: true,
            })} />
            <TweakButton label="Manifesto" secondary onClick={() => setTweak({
              theme: "brutalist", accent: "auto", monoFont: "ibm", sansFont: "manrope",
              displayFont: "manrope", numericStyle: "mono", density: "comfy", radius: 0,
              kpiStyle: "none", tabStyle: "segmented", chartFill: "none",
              drydockMarkers: "band", heatmapPalette: "mono", lineWeight: 3,
              showGrid: true, headerRule: true, sidebarSide: "left", compactKpi: false,
              showEyebrow: true, animateCharts: false, showNotes: false, showDrydockSummary: true,
            })} />
            <TweakButton label="Sitrep" secondary onClick={() => setTweak({
              theme: "tactical", accent: "auto", monoFont: "spaceMono", sansFont: "ibm",
              displayFont: "spaceMono", numericStyle: "mono", density: "compact", radius: 0,
              kpiStyle: "top-bar", tabStyle: "underline", chartFill: "none",
              drydockMarkers: "line", heatmapPalette: "redgreen", lineWeight: 2,
              showGrid: true, headerRule: true, sidebarSide: "left", compactKpi: true,
              showEyebrow: true, animateCharts: false, showNotes: false, showDrydockSummary: true,
            })} />
          </div>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<VLCCDashboard />);
