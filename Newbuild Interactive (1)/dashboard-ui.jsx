// dashboard.jsx — VLCC newbuilding dashboard wired to theme + tweaks.
// Pure render layer; calc engine lives in calc.jsx, themes in themes.jsx.

const { useState, useMemo, useCallback, useEffect } = React;
const {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart, Bar, Cell,
} = Recharts;

// ── Density preset → numeric scale ──
const DENSITY = {
  compact:  { pad: 12, gap: 12, kpiPad: "10px 12px", kpiVal: 18, kpiLbl: 10, font: 12, hdr: 19 },
  regular:  { pad: 16, gap: 16, kpiPad: "14px 16px", kpiVal: 22, kpiLbl: 11, font: 13, hdr: 22 },
  comfy:    { pad: 22, gap: 22, kpiPad: "18px 22px", kpiVal: 28, kpiLbl: 12, font: 14, hdr: 26 },
};

// ── Build the styles object from theme + tweaks. ──
function makeStyles(theme, tw) {
  const d = DENSITY[tw.density] || DENSITY.regular;
  const radius = tw.radius;
  const surface = theme.panelStyle;

  // Panel surface treatment
  const panelBg =
    surface === "glass"  ? theme.panel :
    surface === "stark"  ? theme.panel :
    surface === "card"   ? theme.panel :
                            theme.panel;
  const panelShadow =
    surface === "card"  ? "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)" :
    surface === "glass" ? "0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px rgba(0,0,0,0.25)" :
    surface === "stark" ? "none" :
                          "none";
  const panelBorder =
    surface === "stark" ? `1.5px solid ${theme.panelBorderStrong}` :
    surface === "glass" ? `0.5px solid ${theme.panelBorder}` :
                          `1px solid ${theme.panelBorder}`;
  const panelExtra = surface === "glass" ? {
    backdropFilter: "blur(20px) saturate(140%)",
    WebkitBackdropFilter: "blur(20px) saturate(140%)",
  } : {};

  return {
    densityScale: d,
    root: {
      fontFamily: theme.sans,
      background: theme.bgGradient || theme.bg,
      color: theme.text,
      minHeight: "100vh",
      padding: d.pad + 4,
      boxSizing: "border-box",
      fontSize: d.font,
    },
    header: {
      marginBottom: d.gap + 8,
      borderBottom: tw.headerRule ? `1px solid ${theme.panelBorder}` : "none",
      paddingBottom: tw.headerRule ? d.pad : 0,
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    },
    title: {
      fontSize: d.hdr,
      fontWeight: theme.displayWeight,
      letterSpacing: theme.displayTracking,
      color: theme.text,
      margin: 0,
      fontFamily: theme.display,
    },
    subtitle: {
      fontSize: 12,
      color: theme.textDim,
      marginTop: 4,
      fontFamily: theme.mono,
      letterSpacing: "0.02em",
    },
    eyebrow: {
      fontSize: 10,
      fontFamily: theme.mono,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: theme.textMuted,
      marginBottom: 4,
    },
    tabs: {
      display: "flex",
      gap: tw.tabStyle === "pill" ? 6 : 0,
      marginBottom: d.gap + 8,
      borderBottom: tw.tabStyle === "underline" ? `1px solid ${theme.panelBorder}` : "none",
      padding: tw.tabStyle === "segmented" ? 3 : 0,
      background: tw.tabStyle === "segmented" ? theme.accentSoft : "transparent",
      borderRadius: tw.tabStyle === "segmented" ? radius + 2 : 0,
      width: tw.tabStyle === "segmented" ? "fit-content" : "auto",
    },
    tab: (active) => {
      const base = {
        padding: "10px 18px",
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: theme.sans,
        transition: "all 0.18s",
        letterSpacing: "0.02em",
      };
      if (tw.tabStyle === "pill") return {
        ...base,
        color: active ? "#fff" : theme.textDim,
        background: active ? theme.accent : "transparent",
        borderRadius: radius + 4,
      };
      if (tw.tabStyle === "segmented") return {
        ...base,
        color: active ? theme.text : theme.textDim,
        background: active ? theme.panel : "transparent",
        borderRadius: radius,
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
      };
      return {
        ...base,
        color: active ? theme.accent : theme.textDim,
        borderBottom: active ? `2px solid ${theme.accent}` : "2px solid transparent",
      };
    },
    grid: {
      display: "grid",
      gridTemplateColumns: tw.sidebarSide === "right" ? "1fr 300px" : "300px 1fr",
      gap: d.gap + 4,
      alignItems: "start",
    },
    panel: {
      background: panelBg,
      border: panelBorder,
      borderRadius: radius,
      padding: d.pad,
      boxShadow: panelShadow,
      ...panelExtra,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      color: theme.textMuted,
      marginBottom: 10,
      marginTop: 14,
      fontFamily: theme.mono,
    },
    inputRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    label: { fontSize: 12, color: theme.textDim },
    input: {
      width: 80,
      padding: "4px 8px",
      fontSize: 12,
      fontFamily: theme.numericFont,
      background: theme.key === "editorial" || theme.key === "mono" ? "#fff" : theme.bg,
      border: `1px solid ${theme.panelBorder}`,
      borderRadius: Math.max(radius - 4, 2),
      color: theme.text,
      textAlign: "right",
      outline: "none",
    },
    slider: { width: "100%", accentColor: theme.accent, marginTop: 4 },
    kpiRow: {
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(${tw.compactKpi ? 140 : 170}px, 1fr))`,
      gap: d.gap - 2,
      marginBottom: d.gap + 4,
    },
    kpi: (color = theme.accent) => {
      const style = tw.kpiStyle;
      const base = {
        background: panelBg,
        border: panelBorder,
        borderRadius: radius,
        padding: d.kpiPad,
        boxShadow: panelShadow,
        position: "relative",
        overflow: "hidden",
        ...panelExtra,
      };
      if (style === "left-bar")  return { ...base, borderLeft: `3px solid ${color}` };
      if (style === "top-bar")   return { ...base, borderTop: `3px solid ${color}` };
      if (style === "tinted")    return { ...base, background: color + "12", borderLeft: `1px solid ${color}40` };
      if (style === "underline") return { ...base, borderBottom: `2px solid ${color}` };
      return base; // none
    },
    kpiValue: (color) => ({
      fontSize: d.kpiVal,
      fontWeight: 700,
      fontFamily: theme.numericFont,
      color: color || theme.text,
      letterSpacing: "-0.01em",
    }),
    kpiLabel: {
      fontSize: d.kpiLbl,
      color: theme.textDim,
      marginTop: 4,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontFamily: theme.sans,
    },
    kpiSub: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 2,
      fontFamily: theme.mono,
    },
    toggleRow: (active) => ({
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
      cursor: "pointer",
      fontSize: 12,
      color: active ? theme.accent : theme.textDim,
      padding: "4px 0",
    }),
    toggleDot: (active) => ({
      width: 14,
      height: 14,
      borderRadius: Math.max(radius - 6, 2),
      border: `1.5px solid ${active ? theme.accent : theme.textMuted}`,
      background: active ? theme.accent : "transparent",
      transition: "all 0.15s",
      flexShrink: 0,
    }),
    chartContainer: {
      background: panelBg,
      border: panelBorder,
      borderRadius: radius,
      padding: d.pad,
      boxShadow: panelShadow,
      ...panelExtra,
    },
    chartTitle: {
      fontSize: 13,
      fontWeight: 600,
      color: theme.text,
      marginBottom: 12,
      fontFamily: theme.sans,
      letterSpacing: "-0.005em",
    },
    legend: {
      display: "flex",
      gap: 18,
      marginTop: 10,
      fontSize: 11,
      color: theme.textDim,
      flexWrap: "wrap",
      fontFamily: theme.sans,
    },
    legendDot: (color) => ({
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: color,
      display: "inline-block",
      marginRight: 6,
      verticalAlign: "middle",
    }),
    note: {
      fontSize: 11,
      color: theme.textMuted,
      fontStyle: theme.key === "editorial" ? "italic" : "normal",
      marginTop: 10,
      lineHeight: 1.55,
      fontFamily: theme.key === "editorial" ? theme.display : theme.sans,
    },
    ddBadge: {
      display: "inline-block",
      fontSize: 9,
      fontWeight: 700,
      padding: "2px 6px",
      borderRadius: Math.max(radius - 5, 2),
      background: theme.drydock + "26",
      color: theme.drydock,
      border: `1px solid ${theme.drydock}4d`,
      marginLeft: 6,
      fontFamily: theme.mono,
      letterSpacing: "0.04em",
    },
    heatmapTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 12,
      fontFamily: theme.numericFont,
    },
    heatmapTh: {
      padding: "8px 6px",
      fontSize: 10,
      fontWeight: 600,
      color: theme.textDim,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      borderBottom: `1px solid ${theme.panelBorder}`,
      textAlign: "center",
      fontFamily: theme.mono,
    },
    heatmapRowLabel: {
      padding: "8px 10px 8px 0",
      textAlign: "right",
      color: theme.textDim,
      borderBottom: `1px solid ${theme.panelBorder}`,
      fontSize: 11,
      fontFamily: theme.mono,
    },
    theme,
    tw,
    radius,
  };
}

// ── Heatmap cell colorization ──
function heatmapCellStyle(value, theme, palette, radius) {
  const intensity = Math.min(Math.abs(value) / 40, 1);
  let bg, fg;
  if (palette === "mono") {
    const v = Math.min(0.5, 0.05 + intensity * 0.55);
    bg = value > 0 ? `rgba(17,17,17,${v})` : `rgba(17,17,17,${v * 0.5})`;
    fg = value > 0 ? "#fff" : theme.text;
    if (value > 0 && v < 0.25) fg = theme.text;
  } else if (palette === "redblue") {
    bg = value > 0
      ? `rgba(34,211,238,${0.08 + intensity * 0.45})`
      : `rgba(244,63,94,${0.08 + intensity * 0.45})`;
    fg = value > 0 ? "#22d3ee" : "#fb7185";
  } else {
    bg = value > 0
      ? `rgba(16,185,129,${0.08 + intensity * 0.5})`
      : `rgba(239,68,68,${0.08 + intensity * 0.5})`;
    fg = value > 0 ? theme.positive : theme.negative;
  }
  return {
    padding: "8px 6px",
    textAlign: "center",
    background: bg,
    color: fg,
    fontWeight: 500,
    borderBottom: `1px solid ${theme.panelBorder}`,
    fontSize: 11,
  };
}

// ── Small UI atoms ──
function InputField({ label, value, onChange, unit = "", min, max, step = 1, s }) {
  return (
    <div style={s.inputRow}>
      <span style={s.label}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type="number" style={s.input} value={value} min={min} max={max} step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)} />
        {unit && <span style={{ fontSize: 11, color: s.theme.textMuted, width: 30, fontFamily: s.theme.mono }}>{unit}</span>}
      </div>
    </div>
  );
}

function MiniToggle({ label, active, onChange, s }) {
  return (
    <div style={s.toggleRow(active)} onClick={() => onChange(!active)}>
      <div style={s.toggleDot(active)} />
      {label}
    </div>
  );
}

function KPI({ value, label, color, sub, s }) {
  return (
    <div style={s.kpi(color)} data-kpi="">
      <div style={s.kpiValue(color || s.theme.text)}>{value}</div>
      <div style={s.kpiLabel}>{label}</div>
      {sub && <div style={s.kpiSub}>{sub}</div>}
    </div>
  );
}

function makeTooltip(theme) {
  return ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: theme.tooltipBg,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 12,
        fontFamily: theme.mono,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      }}>
        <div style={{ color: theme.textDim, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: ${typeof p.value === "number" ? p.value.toFixed(1) : p.value}m
          </div>
        ))}
      </div>
    );
  };
}

// ── INPUT PANEL ──
function InputPanel(props) {
  const { s, activeTab, st, breakevenRate } = props;
  const { nbPrice, setNbPrice, deliveryMonths, setDeliveryMonths, economicLife, setEconomicLife,
    dailyOpex, setDailyOpex, opexEscalation, setOpexEscalation, ltv, setLtv, interestRate,
    setInterestRate, loanTenor, setLoanTenor, tcRate, setTcRate, drydockBase, setDrydockBase,
    hasScrubber, setHasScrubber, isDualFuel, setIsDualFuel, shPrice, setShPrice, shAge,
    setShAge, shOpex, setShOpex, discountRate, setDiscountRate } = st;
  const theme = s.theme;
  const SLIDER_MIN = 15000, SLIDER_MAX = 120000;
  const bePct = breakevenRate ? Math.max(0, Math.min(100, ((breakevenRate - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100)) : null;

  return (
    <div style={s.panel}>
      <div style={{ ...s.sectionLabel, marginTop: 0 }}>Newbuilding · VLCC</div>
      <InputField s={s} label="Yard Price" value={nbPrice} onChange={setNbPrice} unit="$m" min={80} max={200} />
      <InputField s={s} label="Delivery" value={deliveryMonths} onChange={setDeliveryMonths} unit="mo" min={12} max={60} />
      <InputField s={s} label="Economic Life" value={economicLife} onChange={setEconomicLife} unit="yr" min={15} max={30} />
      <InputField s={s} label="Daily Opex" value={dailyOpex} onChange={setDailyOpex} unit="$/d" min={5000} max={20000} step={500} />
      <InputField s={s} label="Opex Escalation" value={opexEscalation} onChange={setOpexEscalation} unit="%/yr" min={0} max={6} step={0.5} />

      <div style={s.sectionLabel}>TC Rate Assumption</div>
      <div style={{ textAlign: "center", fontFamily: theme.numericFont, fontSize: 22, fontWeight: 700, color: theme.accent, marginBottom: 4, letterSpacing: "-0.02em" }}>
        ${tcRate.toLocaleString()}<span style={{ fontSize: 12, color: theme.textDim, fontWeight: 500 }}>/day</span>
      </div>
      <div style={{ position: "relative" }}>
        <input type="range" style={s.slider} min={SLIDER_MIN} max={SLIDER_MAX} step={1000}
          value={tcRate} onChange={e => setTcRate(parseInt(e.target.value))} />
        {bePct != null && (
          <div style={{
            position: "absolute", top: 4, bottom: 4, left: `${bePct}%`,
            width: 2, marginLeft: -1, background: theme.warn, pointerEvents: "none",
            opacity: 0.85,
          }} />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textMuted, fontFamily: theme.mono, marginTop: 2, position: "relative" }}>
        <span>$15k</span>
        {bePct != null && (
          <span style={{
            position: "absolute", left: `${bePct}%`, transform: "translateX(-50%)",
            color: theme.warn, fontWeight: 600, letterSpacing: "0.04em", whiteSpace: "nowrap",
          }}>
            BE ${Math.round(breakevenRate / 1000)}k
          </span>
        )}
        <span>$120k</span>
      </div>
      {(hasScrubber || isDualFuel) && (() => {
        const uplift = (hasScrubber ? DEFAULTS.scrubberPremium : 0) + (isDualFuel ? DEFAULTS.dualFuelBunkerSaving : 0);
        return (
          <div style={{ marginTop: 8, padding: "6px 10px", background: theme.accentSoft, border: `1px solid ${theme.panelBorder}`, borderRadius: Math.max(s.radius - 4, 2), fontSize: 10, fontFamily: theme.mono, color: theme.textDim, lineHeight: 1.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>+ config uplift</span>
              <span style={{ color: theme.positive, fontWeight: 600 }}>+${uplift.toLocaleString()}/d</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
              <span style={{ color: theme.text }}>Effective TCE</span>
              <span style={{ color: theme.text, fontWeight: 600 }}>${(tcRate + uplift).toLocaleString()}/d</span>
            </div>
          </div>
        );
      })()}

      <div style={s.sectionLabel}>Financing</div>
      <InputField s={s} label="LTV" value={ltv} onChange={setLtv} unit="%" min={0} max={80} />
      <InputField s={s} label="Interest Rate" value={interestRate} onChange={setInterestRate} unit="%" min={2} max={12} step={0.25} />
      <InputField s={s} label="Loan Tenor" value={loanTenor} onChange={setLoanTenor} unit="yr" min={5} max={20} />

      <div style={s.sectionLabel}>Drydock / Special Survey</div>
      <InputField s={s} label="1st Survey Cost" value={drydockBase} onChange={setDrydockBase} unit="$m" min={1} max={8} step={0.1} />
      <div style={{ fontSize: 10, color: theme.textMuted, marginBottom: 4, lineHeight: 1.4, fontFamily: theme.mono }}>
        Subsequent ×{DEFAULTS.drydockEscalation} · {DEFAULTS.drydockOffHireDays}d off-hire
      </div>

      <div style={s.sectionLabel}>Configuration</div>
      <MiniToggle s={s} label="Exhaust Gas Scrubber (+$5m)" active={hasScrubber} onChange={setHasScrubber} />
      <MiniToggle s={s} label="LNG Dual-Fuel (+$17m)" active={isDualFuel} onChange={setIsDualFuel} />

      {activeTab === "nbvsh" && (
        <>
          <div style={s.sectionLabel}>Secondhand VLCC</div>
          <InputField s={s} label="Purchase Price" value={shPrice} onChange={setShPrice} unit="$m" min={40} max={160} />
          <InputField s={s} label="Vessel Age" value={shAge} onChange={setShAge} unit="yr" min={1} max={20} />
          <InputField s={s} label="Daily Opex" value={shOpex} onChange={setShOpex} unit="$/d" min={5000} max={25000} step={500} />
          <InputField s={s} label="Discount Rate" value={discountRate} onChange={setDiscountRate} unit="%" min={4} max={15} step={0.5} />
          <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 4, lineHeight: 1.4, fontFamily: theme.mono }}>
            SH opex escalates at {(opexEscalation + 0.5).toFixed(1)}%/yr (age premium).
            Remaining life: {25 - shAge} years.
          </div>
        </>
      )}

      <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 16, lineHeight: 1.5, fontFamily: theme.mono, paddingTop: 12, borderTop: `1px solid ${theme.panelBorder}` }}>
        <div style={{ fontWeight: 600, color: theme.textDim, marginBottom: 4 }}>SCRAP</div>
        NB ${SCRAP_VALUE.toFixed(1)}m · SH ${(SCRAP_VALUE * 0.85).toFixed(1)}m
        <br />({DEFAULTS.vlccLdt.toLocaleString()} ldt × ${DEFAULTS.scrapValuePerLdt}/ldt)
      </div>
    </div>
  );
}

Object.assign(window, { makeStyles, heatmapCellStyle, InputField, MiniToggle, KPI, makeTooltip, InputPanel, DENSITY });
