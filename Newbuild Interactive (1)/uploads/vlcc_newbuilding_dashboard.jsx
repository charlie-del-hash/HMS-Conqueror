import { useState, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart, Bar, Cell } from "recharts";

// ─── VLCC MARKET DEFAULTS (2026 benchmarks) ───
const DEFAULTS = {
  // Newbuilding
  nbPrice: 128,              // $m, conventional VLCC (Korean major yard)
  nbPriceDualFuel: 145,      // $m, LNG dual-fuel
  deliveryMonths: 30,        // months from order to delivery
  economicLife: 25,          // years from delivery
  // Secondhand
  shPrice5yr: 100,           // $m, 5-year-old VLCC
  shPrice10yr: 72,           // $m, 10-year-old
  shAge: 5,                  // years
  // Operating — base opex at delivery (year 0 of vessel life)
  dailyOpex: 10500,          // $/day base opex (crew, stores, insurance, management)
  opexEscalation: 2.5,       // % p.a. real escalation (aging, regulatory, insurance creep)
  scrubberPremium: 3500,     // $/day TCE uplift from scrubber (VLSFO-HSFO spread)
  scrubberCapex: 5,          // $m retrofit cost
  dualFuelBunkerSaving: 4500,// $/day saving from LNG
  // Drydock / Special Survey — escalating with age
  drydockBase: 2.8,          // $m, 1st special survey (year 5)
  drydockEscalation: 1.5,    // multiplier per subsequent survey (compounding)
  drydockOffHireDays: 25,    // days off-hire per drydock (repositioning + yard time)
  // Financing
  ltv: 60,                   // loan-to-value %
  interestRate: 6.5,         // % p.a. (current shipping debt market)
  loanTenor: 12,             // years
  // Market
  tcRate: 42000,             // $/day, 1-year TC equivalent (2026 VLCC market)
  scrapValuePerLdt: 620,     // $/ldt (Indian subcontinent)
  vlccLdt: 42000,            // typical VLCC lightweight tonnage
  discountRate: 8,           // % for NPV calcs (shipping WACC proxy)
  tradingDaysPerYear: 350,   // standard allowance (365 minus positioning, waiting, maintenance)
};

const SCRAP_VALUE = (DEFAULTS.scrapValuePerLdt * DEFAULTS.vlccLdt) / 1e6; // ~$26m

// ─── DRYDOCK SCHEDULE HELPER ───
// Returns array of { vesselAge, cost ($m), offHireDays } for surveys during ownership
function getDrydockSchedule(vesselAgeAtStart, ownershipYears, baseCost, escalation, offHireDays) {
  const schedule = [];
  // Special surveys at vessel ages 5, 10, 15, 20 (intermediate surveys at 2.5, 7.5 etc. are smaller — modeled as opex)
  const surveyAges = [5, 10, 15, 20];
  surveyAges.forEach((surveyAge, idx) => {
    const ownershipYear = surveyAge - vesselAgeAtStart;
    if (ownershipYear > 0 && ownershipYear <= ownershipYears) {
      // Cost escalates: 1st survey = base, 2nd = base × escalation, 3rd = base × escalation², etc.
      const cost = baseCost * Math.pow(escalation, idx);
      schedule.push({
        ownershipYear: Math.round(ownershipYear),
        vesselAge: surveyAge,
        cost: Math.round(cost * 10) / 10,
        offHireDays,
        surveyNumber: idx + 1,
      });
    }
  });
  return schedule;
}

// ─── OPEX WITH AGE ESCALATION ───
// Opex at a given vessel age, escalating from base at age 0
function opexAtAge(baseOpex, vesselAge, escalationPct) {
  return baseOpex * Math.pow(1 + escalationPct / 100, vesselAge);
}

// ─── BREAKEVEN CALC ENGINE (with drydock + escalation) ───
function calcBreakeven(params) {
  const {
    yardPrice, deliveryMonths, economicLife, dailyOpex, opexEscalation,
    ltv, interestRate, loanTenor, tcRate,
    scrapValue, hasScrubber, scrubberCapex, scrubberPremium,
    isDualFuel, dualFuelBunkerSaving, dualFuelPremium,
    drydockBase, drydockEscalation, drydockOffHireDays,
    tradingDaysPerYear,
  } = params;

  const effectiveTcRate = tcRate + (hasScrubber ? scrubberPremium : 0) + (isDualFuel ? dualFuelBunkerSaving : 0);
  const effectiveYardPrice = isDualFuel ? yardPrice + dualFuelPremium : yardPrice;
  const finalCapex = effectiveYardPrice + (hasScrubber ? scrubberCapex : 0);

  const debtAmount = finalCapex * (ltv / 100);
  const equityAmount = finalCapex - debtAmount;
  const annualDebtService = debtAmount > 0
    ? (debtAmount * (interestRate / 100)) / (1 - Math.pow(1 + interestRate / 100, -loanTenor))
    : 0;

  const deliveryYears = deliveryMonths / 12;

  // Drydock schedule for a newbuilding (vessel age starts at 0 at delivery)
  const drydocks = getDrydockSchedule(0, economicLife, drydockBase, drydockEscalation, drydockOffHireDays);

  // Build year-by-year cash flows
  const years = [];
  let cumCash = -equityAmount; // equity outlay at t=0
  const totalYears = Math.ceil(deliveryYears) + economicLife;
  let totalDrydockCapex = 0;

  for (let y = 0; y <= totalYears; y++) {
    let annualRevenue = 0;
    let annualOpex = 0;
    let annualDebt = 0;
    let drydockCost = 0;
    let scrap = 0;
    let tradingDays = 0;
    let vesselAge = null;
    let phase = "build";

    if (y >= Math.ceil(deliveryYears)) {
      // Trading year
      const tradingYear = y - Math.ceil(deliveryYears);
      vesselAge = tradingYear;
      phase = "trading";

      if (tradingYear < economicLife) {
        // Check for drydock this year
        const dd = drydocks.find(d => d.ownershipYear === tradingYear);
        const offHire = dd ? dd.offHireDays : 0;
        drydockCost = dd ? dd.cost : 0;
        totalDrydockCapex += drydockCost;

        tradingDays = tradingDaysPerYear - offHire;
        const currentOpex = opexAtAge(dailyOpex, vesselAge, opexEscalation);

        annualRevenue = effectiveTcRate * tradingDays;
        annualOpex = currentOpex * 365; // opex runs 365 regardless of trading
        annualDebt = tradingYear < loanTenor ? annualDebtService : 0;
      }

      // Scrap at end of economic life
      if (tradingYear === economicLife - 1) {
        scrap = scrapValue;
      }
    }

    const netCash = (annualRevenue - annualOpex - annualDebt - drydockCost * 1e6 + scrap * 1e6);
    cumCash += netCash;

    years.push({
      year: y,
      label: `Y${y}`,
      revenue: annualRevenue / 1e6,
      opex: annualOpex / 1e6,
      debtService: annualDebt / 1e6,
      drydock: drydockCost,
      scrap: scrap,
      netCash: netCash / 1e6,
      cumCash: cumCash / 1e6,
      tradingDays,
      vesselAge,
      phase,
      isDrydockYear: drydockCost > 0,
    });
  }

  // ─── BREAKEVEN TC RATE (iterative solve, includes drydock + escalation) ───
  let lo = 0, hi = 200000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    let npv = -finalCapex;
    for (let yr = 0; yr < economicLife; yr++) {
      const t = deliveryYears + yr + 1;
      const dd = drydocks.find(d => d.ownershipYear === yr);
      const offHire = dd ? dd.offHireDays : 0;
      const ddCost = dd ? dd.cost * 1e6 : 0;
      const currentOpex = opexAtAge(dailyOpex, yr, opexEscalation);
      const annualNet = (mid * (tradingDaysPerYear - offHire)) - (currentOpex * 365) -
        (yr < loanTenor ? annualDebtService : 0) - ddCost;
      npv += annualNet / Math.pow(1 + DEFAULTS.discountRate / 100, t);
    }
    npv += (scrapValue * 1e6) / Math.pow(1 + DEFAULTS.discountRate / 100, deliveryYears + economicLife);
    if (npv > 0) hi = mid; else lo = mid;
  }
  const breakevenRate = Math.round((lo + hi) / 2);

  // Payback period
  const paybackYear = years.find(y => y.cumCash >= 0);
  const paybackPeriod = paybackYear ? paybackYear.year : null;

  return {
    years, breakevenRate, paybackPeriod, finalCapex, equityAmount,
    debtAmount, annualDebtService, effectiveTcRate, drydocks, totalDrydockCapex,
  };
}

// ─── NB vs SH COMPARISON ENGINE (with drydock + escalation) ───
function calcNBvsSH(nbParams, shParams, discountRate) {
  const dr = discountRate / 100;

  function npvStream(capex, deliveryDelay, baseOpex, opexEscalation, vesselAgeAtStart, tcRate, life, scrap, drydockBase, drydockEscalation, drydockOffHire) {
    let npv = -capex * 1e6;
    const drydocks = getDrydockSchedule(vesselAgeAtStart, life, drydockBase, drydockEscalation, drydockOffHire);

    for (let yr = 0; yr < life; yr++) {
      const t = deliveryDelay + yr + 1;
      const vesselAge = vesselAgeAtStart + yr;
      const dd = drydocks.find(d => d.ownershipYear === yr);
      const offHire = dd ? dd.offHireDays : 0;
      const ddCost = dd ? dd.cost * 1e6 : 0;
      const currentOpex = opexAtAge(baseOpex, vesselAge, opexEscalation);
      const annual = (tcRate * (DEFAULTS.tradingDaysPerYear - offHire)) - (currentOpex * 365) - ddCost;
      npv += annual / Math.pow(1 + dr, t);
    }
    npv += (scrap * 1e6) / Math.pow(1 + dr, deliveryDelay + life);
    return npv;
  }

  const nbNPV = npvStream(
    nbParams.capex, nbParams.deliveryMonths / 12,
    nbParams.opex, nbParams.opexEsc, 0, nbParams.tcRate,
    nbParams.life, nbParams.scrap,
    nbParams.ddBase, nbParams.ddEsc, nbParams.ddOffHire
  );
  const shNPV = npvStream(
    shParams.capex, 0,
    shParams.opex, shParams.opexEsc, shParams.vesselAge, shParams.tcRate,
    shParams.life, shParams.scrap,
    shParams.ddBase, shParams.ddEsc, shParams.ddOffHire
  );

  // Cumulative earnings comparison (undiscounted, for visual clarity)
  const timeline = [];
  const maxHorizon = Math.max(Math.ceil(nbParams.deliveryMonths / 12) + nbParams.life, shParams.life) + 1;
  let nbCum = -nbParams.capex * 1e6;
  let shCum = -shParams.capex * 1e6;
  const nbDelivery = nbParams.deliveryMonths / 12;

  const nbDrydocks = getDrydockSchedule(0, nbParams.life, nbParams.ddBase, nbParams.ddEsc, nbParams.ddOffHire);
  const shDrydocks = getDrydockSchedule(shParams.vesselAge, shParams.life, shParams.ddBase, shParams.ddEsc, shParams.ddOffHire);

  for (let y = 0; y <= Math.min(maxHorizon, 30); y++) {
    // NB
    const nbTradingYear = y - Math.ceil(nbDelivery);
    if (nbTradingYear >= 0 && nbTradingYear < nbParams.life) {
      const dd = nbDrydocks.find(d => d.ownershipYear === nbTradingYear);
      const offHire = dd ? dd.offHireDays : 0;
      const ddCost = dd ? dd.cost * 1e6 : 0;
      const vesselAge = nbTradingYear;
      const currentOpex = opexAtAge(nbParams.opex, vesselAge, nbParams.opexEsc);
      nbCum += (nbParams.tcRate * (DEFAULTS.tradingDaysPerYear - offHire)) - (currentOpex * 365) - ddCost;
      if (nbTradingYear === nbParams.life - 1) nbCum += nbParams.scrap * 1e6;
    }

    // SH
    if (y < shParams.life) {
      const dd = shDrydocks.find(d => d.ownershipYear === y);
      const offHire = dd ? dd.offHireDays : 0;
      const ddCost = dd ? dd.cost * 1e6 : 0;
      const vesselAge = shParams.vesselAge + y;
      const currentOpex = opexAtAge(shParams.opex, vesselAge, shParams.opexEsc);
      shCum += (shParams.tcRate * (DEFAULTS.tradingDaysPerYear - offHire)) - (currentOpex * 365) - ddCost;
      if (y === shParams.life - 1) shCum += shParams.scrap * 1e6;
    }

    timeline.push({
      year: y,
      nb: Math.round(nbCum / 1e5) / 10,
      sh: Math.round(shCum / 1e5) / 10,
    });
  }

  // Heatmap: TC rate vs delivery delay
  const tcRates = [];
  for (let r = 20000; r <= 70000; r += 5000) tcRates.push(r);
  const delays = [18, 24, 30, 36, 42, 48];

  const heatmap = [];
  for (const rate of tcRates) {
    const row = { tcRate: rate };
    for (const delay of delays) {
      const nbVal = npvStream(
        nbParams.capex, delay / 12, nbParams.opex, nbParams.opexEsc, 0, rate,
        nbParams.life, nbParams.scrap, nbParams.ddBase, nbParams.ddEsc, nbParams.ddOffHire
      );
      const shVal = npvStream(
        shParams.capex, 0, shParams.opex, shParams.opexEsc, shParams.vesselAge, rate,
        shParams.life, shParams.scrap, shParams.ddBase, shParams.ddEsc, shParams.ddOffHire
      );
      row[`d${delay}`] = nbVal - shVal;
    }
    heatmap.push(row);
  }

  // Indifference rate
  let lo = 0, hi = 200000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const nb = npvStream(
      nbParams.capex, nbParams.deliveryMonths / 12, nbParams.opex, nbParams.opexEsc, 0, mid,
      nbParams.life, nbParams.scrap, nbParams.ddBase, nbParams.ddEsc, nbParams.ddOffHire
    );
    const sh = npvStream(
      shParams.capex, 0, shParams.opex, shParams.opexEsc, shParams.vesselAge, mid,
      shParams.life, shParams.scrap, shParams.ddBase, shParams.ddEsc, shParams.ddOffHire
    );
    if (sh > nb) hi = mid; else lo = mid;
  }
  const indifferenceRate = Math.round((lo + hi) / 2);

  return { nbNPV, shNPV, timeline, heatmap, tcRates, delays, indifferenceRate };
}

// ─── STYLES ───
const colors = {
  bg: "#0a0f1a",
  panel: "#111827",
  panelBorder: "#1e293b",
  accent: "#3b82f6",
  accentDim: "#1e3a5f",
  positive: "#10b981",
  negative: "#ef4444",
  warn: "#f59e0b",
  drydock: "#8b5cf6",
  text: "#e2e8f0",
  textDim: "#94a3b8",
  textMuted: "#475569",
  gridLine: "#1e293b",
};

const fontStack = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";
const sansStack = "'DM Sans', 'Inter', system-ui, sans-serif";

const s = {
  root: {
    fontFamily: sansStack,
    background: colors.bg,
    color: colors.text,
    minHeight: "100vh",
    padding: "20px",
    boxSizing: "border-box",
  },
  header: {
    marginBottom: 24,
    borderBottom: `1px solid ${colors.panelBorder}`,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#fff",
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textDim,
    marginTop: 4,
    fontFamily: fontStack,
  },
  tabs: {
    display: "flex",
    gap: 0,
    marginBottom: 24,
    borderBottom: `1px solid ${colors.panelBorder}`,
  },
  tab: (active) => ({
    padding: "10px 20px",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? colors.accent : colors.textDim,
    background: "transparent",
    border: "none",
    borderBottom: active ? `2px solid ${colors.accent}` : "2px solid transparent",
    cursor: "pointer",
    fontFamily: sansStack,
    transition: "all 0.2s",
  }),
  grid: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: 20,
    alignItems: "start",
  },
  panel: {
    background: colors.panel,
    border: `1px solid ${colors.panelBorder}`,
    borderRadius: 8,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: colors.textMuted,
    marginBottom: 12,
    marginTop: 16,
  },
  inputRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: colors.textDim,
  },
  input: {
    width: 80,
    padding: "4px 8px",
    fontSize: 13,
    fontFamily: fontStack,
    background: colors.bg,
    border: `1px solid ${colors.panelBorder}`,
    borderRadius: 4,
    color: colors.text,
    textAlign: "right",
  },
  slider: {
    width: "100%",
    accentColor: colors.accent,
    marginTop: 4,
  },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 20,
  },
  kpi: (color = colors.accent) => ({
    background: colors.panel,
    border: `1px solid ${colors.panelBorder}`,
    borderRadius: 8,
    padding: "14px 16px",
    borderLeft: `3px solid ${color}`,
  }),
  kpiValue: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: fontStack,
    color: "#fff",
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  toggle: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    cursor: "pointer",
    fontSize: 12,
    color: active ? colors.accent : colors.textDim,
  }),
  toggleDot: (active) => ({
    width: 14,
    height: 14,
    borderRadius: 3,
    border: `1.5px solid ${active ? colors.accent : colors.textMuted}`,
    background: active ? colors.accent : "transparent",
    transition: "all 0.15s",
    flexShrink: 0,
  }),
  chartContainer: {
    background: colors.panel,
    border: `1px solid ${colors.panelBorder}`,
    borderRadius: 8,
    padding: "16px",
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 12,
  },
  heatmapTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
    fontFamily: fontStack,
  },
  heatmapTh: {
    padding: "8px 6px",
    fontSize: 10,
    fontWeight: 600,
    color: colors.textDim,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.panelBorder}`,
    textAlign: "center",
  },
  heatmapTd: (value) => {
    const intensity = Math.min(Math.abs(value) / 40, 1);
    const bg = value > 0
      ? `rgba(16,185,129,${0.1 + intensity * 0.5})`
      : `rgba(239,68,68,${0.1 + intensity * 0.5})`;
    return {
      padding: "8px 6px",
      textAlign: "center",
      background: bg,
      color: value > 0 ? colors.positive : colors.negative,
      fontWeight: 500,
      borderBottom: `1px solid ${colors.panelBorder}`,
      fontSize: 11,
    };
  },
  heatmapRowLabel: {
    padding: "8px 10px 8px 0",
    textAlign: "right",
    color: colors.textDim,
    borderBottom: `1px solid ${colors.panelBorder}`,
    fontSize: 11,
  },
  legend: {
    display: "flex",
    gap: 16,
    marginTop: 8,
    fontSize: 11,
    color: colors.textDim,
    flexWrap: "wrap",
  },
  legendDot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    display: "inline-block",
    marginRight: 4,
  }),
  note: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: 8,
    lineHeight: 1.5,
  },
  ddBadge: {
    display: "inline-block",
    fontSize: 9,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 3,
    background: "rgba(139,92,246,0.15)",
    color: colors.drydock,
    border: `1px solid rgba(139,92,246,0.3)`,
    marginLeft: 6,
  },
};

// ─── COMPONENTS ───
function InputField({ label, value, onChange, unit = "", min, max, step = 1 }) {
  return (
    <div style={s.inputRow}>
      <span style={s.label}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="number"
          style={s.input}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
        {unit && <span style={{ fontSize: 11, color: colors.textMuted, width: 30 }}>{unit}</span>}
      </div>
    </div>
  );
}

function Toggle({ label, active, onChange }) {
  return (
    <div style={s.toggle(active)} onClick={() => onChange(!active)}>
      <div style={s.toggleDot(active)} />
      {label}
    </div>
  );
}

function KPI({ value, label, color, sub }) {
  return (
    <div style={s.kpi(color)}>
      <div style={{ ...s.kpiValue, color: color || "#fff" }}>{value}</div>
      <div style={s.kpiLabel}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a2332", border: `1px solid ${colors.panelBorder}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, fontFamily: fontStack }}>
      <div style={{ color: colors.textDim, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: ${typeof p.value === "number" ? p.value.toFixed(1) : p.value}m
        </div>
      ))}
    </div>
  );
};

// ─── MAIN DASHBOARD ───
export default function VLCCDashboard() {
  const [activeTab, setActiveTab] = useState("breakeven");

  // Shared NB params
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

  // Toggles
  const [hasScrubber, setHasScrubber] = useState(false);
  const [isDualFuel, setIsDualFuel] = useState(false);

  // SH params
  const [shPrice, setShPrice] = useState(DEFAULTS.shPrice5yr);
  const [shAge, setShAge] = useState(DEFAULTS.shAge);
  const [shOpex, setShOpex] = useState(12000);

  // ─── BREAKEVEN CALCS ───
  const breakeven = useMemo(() => calcBreakeven({
    yardPrice: nbPrice,
    deliveryMonths,
    economicLife,
    dailyOpex,
    opexEscalation,
    ltv,
    interestRate,
    loanTenor,
    tcRate,
    scrapValue: SCRAP_VALUE,
    hasScrubber,
    scrubberCapex: DEFAULTS.scrubberCapex,
    scrubberPremium: DEFAULTS.scrubberPremium,
    isDualFuel,
    dualFuelBunkerSaving: DEFAULTS.dualFuelBunkerSaving,
    dualFuelPremium: DEFAULTS.nbPriceDualFuel - DEFAULTS.nbPrice,
    drydockBase,
    drydockEscalation: DEFAULTS.drydockEscalation,
    drydockOffHireDays: DEFAULTS.drydockOffHireDays,
    tradingDaysPerYear: DEFAULTS.tradingDaysPerYear,
  }), [nbPrice, deliveryMonths, economicLife, dailyOpex, opexEscalation, ltv, interestRate, loanTenor, tcRate, hasScrubber, isDualFuel, drydockBase]);

  // ─── NB vs SH CALCS ───
  const comparison = useMemo(() => {
    const effectiveNbPrice = isDualFuel ? nbPrice + (DEFAULTS.nbPriceDualFuel - DEFAULTS.nbPrice) : nbPrice;
    const nbCapex = effectiveNbPrice + (hasScrubber ? DEFAULTS.scrubberCapex : 0);
    const effectiveTc = tcRate + (hasScrubber ? DEFAULTS.scrubberPremium : 0) + (isDualFuel ? DEFAULTS.dualFuelBunkerSaving : 0);
    const remainingLife = 25 - shAge;

    return calcNBvsSH(
      {
        capex: nbCapex, deliveryMonths, opex: dailyOpex, opexEsc: opexEscalation,
        tcRate: effectiveTc, life: economicLife, scrap: SCRAP_VALUE,
        ddBase: drydockBase, ddEsc: DEFAULTS.drydockEscalation, ddOffHire: DEFAULTS.drydockOffHireDays,
      },
      {
        capex: shPrice, deliveryMonths: 0, opex: shOpex, opexEsc: opexEscalation + 0.5,
        vesselAge: shAge, tcRate: effectiveTc, life: remainingLife, scrap: SCRAP_VALUE * 0.85,
        ddBase: drydockBase, ddEsc: DEFAULTS.drydockEscalation, ddOffHire: DEFAULTS.drydockOffHireDays + 5,
      },
      discountRate
    );
  }, [nbPrice, deliveryMonths, economicLife, dailyOpex, opexEscalation, tcRate, hasScrubber, isDualFuel, shPrice, shAge, shOpex, discountRate, drydockBase]);

  // ─── SHARED INPUT PANEL ───
  const InputPanel = () => (
    <div style={s.panel}>
      <div style={{ ...s.sectionLabel, marginTop: 0 }}>Newbuilding — VLCC</div>
      <InputField label="Yard Price" value={nbPrice} onChange={setNbPrice} unit="$m" min={80} max={200} />
      <InputField label="Delivery" value={deliveryMonths} onChange={setDeliveryMonths} unit="mo" min={12} max={60} />
      <InputField label="Economic Life" value={economicLife} onChange={setEconomicLife} unit="yr" min={15} max={30} />
      <InputField label="Daily Opex (base)" value={dailyOpex} onChange={setDailyOpex} unit="$/d" min={5000} max={20000} step={500} />
      <InputField label="Opex Escalation" value={opexEscalation} onChange={setOpexEscalation} unit="%/yr" min={0} max={6} step={0.5} />

      <div style={s.sectionLabel}>TC Rate Assumption</div>
      <div style={{ textAlign: "center", fontFamily: fontStack, fontSize: 20, fontWeight: 700, color: colors.accent, marginBottom: 4 }}>
        ${tcRate.toLocaleString()}<span style={{ fontSize: 12, color: colors.textDim }}>/day</span>
      </div>
      <input
        type="range"
        style={s.slider}
        min={15000} max={80000} step={1000}
        value={tcRate}
        onChange={e => setTcRate(parseInt(e.target.value))}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: colors.textMuted }}>
        <span>$15k</span><span>$80k</span>
      </div>

      <div style={s.sectionLabel}>Financing</div>
      <InputField label="LTV" value={ltv} onChange={setLtv} unit="%" min={0} max={80} />
      <InputField label="Interest Rate" value={interestRate} onChange={setInterestRate} unit="%" min={2} max={12} step={0.25} />
      <InputField label="Loan Tenor" value={loanTenor} onChange={setLoanTenor} unit="yr" min={5} max={20} />

      <div style={s.sectionLabel}>Drydock / Special Survey</div>
      <InputField label="1st Survey Cost" value={drydockBase} onChange={setDrydockBase} unit="$m" min={1} max={8} step={0.1} />
      <div style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4, lineHeight: 1.4 }}>
        Subsequent surveys escalate ×{DEFAULTS.drydockEscalation} · {DEFAULTS.drydockOffHireDays}d off-hire per survey
      </div>

      <div style={s.sectionLabel}>Configuration</div>
      <Toggle label="Exhaust Gas Scrubber (+$5m)" active={hasScrubber} onChange={setHasScrubber} />
      <Toggle label="LNG Dual-Fuel (+$17m)" active={isDualFuel} onChange={setIsDualFuel} />

      {activeTab === "nbvsh" && (
        <>
          <div style={s.sectionLabel}>Secondhand VLCC</div>
          <InputField label="Purchase Price" value={shPrice} onChange={setShPrice} unit="$m" min={40} max={160} />
          <InputField label="Vessel Age" value={shAge} onChange={setShAge} unit="yr" min={1} max={20} />
          <InputField label="Daily Opex (base)" value={shOpex} onChange={setShOpex} unit="$/d" min={5000} max={25000} step={500} />
          <InputField label="Discount Rate" value={discountRate} onChange={setDiscountRate} unit="%" min={4} max={15} step={0.5} />
          <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 4, lineHeight: 1.4 }}>
            SH opex escalates at {(opexEscalation + 0.5).toFixed(1)}%/yr (age premium).
            Remaining life: {25 - shAge} years. Drydock +5d off-hire penalty.
          </div>
        </>
      )}

      <div style={{ ...s.note, marginTop: 16, fontStyle: "normal" }}>
        <div style={{ fontWeight: 600, color: colors.textDim, marginBottom: 4 }}>Scrap</div>
        NB: ${SCRAP_VALUE.toFixed(1)}m · SH: ${(SCRAP_VALUE * 0.85).toFixed(1)}m
        <br />({DEFAULTS.vlccLdt.toLocaleString()} ldt × ${DEFAULTS.scrapValuePerLdt}/ldt)
      </div>
    </div>
  );

  // ─── BREAKEVEN TAB ───
  const BreakevenTab = () => {
    const b = breakeven;
    const tcColor = tcRate > b.breakevenRate ? colors.positive : colors.negative;
    const margin = tcRate - b.breakevenRate;

    return (
      <div>
        <div style={s.kpiRow}>
          <KPI
            value={`$${b.breakevenRate.toLocaleString()}/d`}
            label="Breakeven TC Rate"
            color={colors.warn}
            sub="incl. drydock + opex escalation"
          />
          <KPI
            value={`$${b.finalCapex.toFixed(1)}m`}
            label="Total Capex"
            color={colors.accent}
          />
          <KPI
            value={b.paybackPeriod ? `${b.paybackPeriod} yrs` : "> life"}
            label="Cash Payback"
            color={b.paybackPeriod && b.paybackPeriod <= economicLife + Math.ceil(deliveryMonths / 12) ? colors.positive : colors.negative}
          />
          <KPI
            value={`${margin > 0 ? "+" : ""}$${margin.toLocaleString()}/d`}
            label="Rate vs Breakeven"
            color={tcColor}
          />
        </div>

        {/* Drydock schedule summary */}
        {b.drydocks.length > 0 && (
          <div style={{ ...s.panel, marginBottom: 16, padding: "10px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: colors.textDim, fontWeight: 600 }}>SURVEY SCHEDULE</span>
              {b.drydocks.map((dd, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={s.ddBadge}>SS{dd.surveyNumber}</span>
                  <span style={{ fontSize: 11, color: colors.text, fontFamily: fontStack }}>
                    Y{dd.ownershipYear + Math.ceil(deliveryMonths / 12)} · ${dd.cost.toFixed(1)}m
                  </span>
                </span>
              ))}
              <span style={{ fontSize: 11, color: colors.drydock, fontFamily: fontStack, marginLeft: "auto" }}>
                Total: ${b.totalDrydockCapex.toFixed(1)}m
              </span>
            </div>
          </div>
        )}

        {/* Cumulative Cash Flow Chart */}
        <div style={s.chartContainer}>
          <div style={s.chartTitle}>Cumulative Cash Flow — VLCC Newbuilding</div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={b.years} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLine} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: colors.textDim }} stroke={colors.gridLine} />
              <YAxis tick={{ fontSize: 10, fill: colors.textDim }} stroke={colors.gridLine} tickFormatter={v => `$${v}m`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke={colors.textMuted} strokeDasharray="4 4" />
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.positive} stopOpacity={0.25} />
                  <stop offset="50%" stopColor={colors.positive} stopOpacity={0} />
                  <stop offset="50%" stopColor={colors.negative} stopOpacity={0} />
                  <stop offset="100%" stopColor={colors.negative} stopOpacity={0.25} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="cumCash" fill="url(#cumGrad)" stroke="none" name="Cumulative" />
              <Line type="monotone" dataKey="cumCash" stroke={colors.accent} strokeWidth={2.5} dot={false} name="Cumulative Cash" />
              {/* Drydock markers */}
              {b.years.filter(y => y.isDrydockYear).map((y, i) => (
                <ReferenceLine
                  key={i}
                  x={y.label}
                  stroke={colors.drydock}
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              ))}
              <ReferenceLine
                x={`Y${Math.ceil(deliveryMonths / 12)}`}
                stroke={colors.accent}
                strokeDasharray="4 4"
                label={{ value: "Delivery", position: "top", fill: colors.textDim, fontSize: 10 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={s.legend}>
            <span><span style={s.legendDot(colors.accent)} /> Cumulative cash flow</span>
            <span><span style={s.legendDot(colors.drydock)} /> Drydock / special survey</span>
          </div>
          <div style={s.note}>
            Visible dips at survey years reflect drydock capex + off-hire revenue loss. Opex escalates at {opexEscalation}%/yr, compressing margins over vessel life.
          </div>
        </div>

        {/* Annual P&L Breakdown */}
        <div style={{ ...s.chartContainer, marginTop: 16 }}>
          <div style={s.chartTitle}>Annual Cash Flow Components (Trading Years)</div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={b.years.filter(y => y.phase === "trading")} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLine} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: colors.textDim }} stroke={colors.gridLine} />
              <YAxis tick={{ fontSize: 10, fill: colors.textDim }} stroke={colors.gridLine} tickFormatter={v => `$${v}m`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill={colors.positive} opacity={0.7} name="TC Revenue" radius={[2, 2, 0, 0]} />
              <Bar dataKey="opex" fill={colors.negative} opacity={0.6} name="Opex (escalating)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="debtService" fill={colors.warn} opacity={0.6} name="Debt Service" radius={[2, 2, 0, 0]} />
              <Bar dataKey="drydock" fill={colors.drydock} opacity={0.8} name="Drydock Capex" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="netCash" stroke="#fff" strokeWidth={1.5} dot={false} name="Net Cash" />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={s.legend}>
            <span><span style={s.legendDot(colors.positive)} /> Revenue</span>
            <span><span style={s.legendDot(colors.negative)} /> Opex</span>
            <span><span style={s.legendDot(colors.warn)} /> Debt</span>
            <span><span style={s.legendDot(colors.drydock)} /> Drydock</span>
            <span><span style={s.legendDot("#fff")} /> Net cash</span>
          </div>
        </div>

        {/* Financing + Opex Trajectory Summary */}
        <div style={{ ...s.panel, marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12 }}>
          <div>
            <div style={s.sectionLabel}>Capital Structure</div>
            <div style={s.inputRow}><span style={s.label}>Equity</span><span style={{ fontFamily: fontStack, color: colors.text }}>${b.equityAmount.toFixed(1)}m</span></div>
            <div style={s.inputRow}><span style={s.label}>Debt</span><span style={{ fontFamily: fontStack, color: colors.text }}>${b.debtAmount.toFixed(1)}m</span></div>
            <div style={s.inputRow}><span style={s.label}>Annual Debt Service</span><span style={{ fontFamily: fontStack, color: colors.text }}>${(b.annualDebtService / 1e6).toFixed(1)}m</span></div>
            <div style={s.inputRow}><span style={s.label}>Lifetime Drydock</span><span style={{ fontFamily: fontStack, color: colors.drydock }}>${b.totalDrydockCapex.toFixed(1)}m</span></div>
          </div>
          <div>
            <div style={s.sectionLabel}>Opex Trajectory</div>
            <div style={s.inputRow}><span style={s.label}>Year 1 Opex</span><span style={{ fontFamily: fontStack }}>${dailyOpex.toLocaleString()}/d</span></div>
            <div style={s.inputRow}><span style={s.label}>Year 10 Opex</span><span style={{ fontFamily: fontStack }}>${Math.round(opexAtAge(dailyOpex, 10, opexEscalation)).toLocaleString()}/d</span></div>
            <div style={s.inputRow}><span style={s.label}>Year 20 Opex</span><span style={{ fontFamily: fontStack }}>${Math.round(opexAtAge(dailyOpex, 20, opexEscalation)).toLocaleString()}/d</span></div>
            <div style={s.inputRow}><span style={s.label}>Year 25 Opex</span><span style={{ fontFamily: fontStack, color: colors.warn }}>${Math.round(opexAtAge(dailyOpex, 25, opexEscalation)).toLocaleString()}/d</span></div>
          </div>
        </div>
      </div>
    );
  };

  // ─── NB vs SH TAB ───
  const NBvsSHTab = () => {
    const c = comparison;
    const nbWins = c.nbNPV > c.shNPV;

    return (
      <div>
        <div style={s.kpiRow}>
          <KPI
            value={`$${(c.nbNPV / 1e6).toFixed(1)}m`}
            label="Newbuilding NPV"
            color={nbWins ? colors.positive : colors.textDim}
            sub={`${economicLife}yr life · ${deliveryMonths}mo wait`}
          />
          <KPI
            value={`$${(c.shNPV / 1e6).toFixed(1)}m`}
            label="Secondhand NPV"
            color={!nbWins ? colors.positive : colors.textDim}
            sub={`${25 - shAge}yr remaining · immediate`}
          />
          <KPI
            value={nbWins ? "NEWBUILD" : "SECONDHAND"}
            label="Preferred at Current Inputs"
            color={nbWins ? colors.accent : colors.warn}
          />
          <KPI
            value={`$${c.indifferenceRate.toLocaleString()}/d`}
            label="Indifference TC Rate"
            color={colors.textDim}
            sub="above = SH wins, below = NB wins"
          />
        </div>

        {/* Cumulative Earnings Comparison */}
        <div style={s.chartContainer}>
          <div style={s.chartTitle}>Cumulative Earnings — Newbuilding vs Secondhand VLCC (undiscounted)</div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={c.timeline} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLine} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fill: colors.textDim }}
                stroke={colors.gridLine}
                label={{ value: "Years from Investment Decision", position: "insideBottom", offset: -10, fontSize: 10, fill: colors.textMuted }}
              />
              <YAxis tick={{ fontSize: 10, fill: colors.textDim }} stroke={colors.gridLine} tickFormatter={v => `$${v}m`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke={colors.textMuted} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="nb" stroke={colors.accent} strokeWidth={2.5} dot={false} name="Newbuilding" />
              <Line type="monotone" dataKey="sh" stroke={colors.warn} strokeWidth={2.5} dot={false} name="Secondhand" />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={s.legend}>
            <span><span style={s.legendDot(colors.accent)} /> Newbuilding (delivery: {deliveryMonths}mo)</span>
            <span><span style={s.legendDot(colors.warn)} /> Secondhand ({shAge}yr old, immediate)</span>
          </div>
          <div style={s.note}>
            NB line flat during build period. Both lines show drydock dips. SH has higher opex escalation ({(opexEscalation + 0.5).toFixed(1)}%/yr) and shorter remaining life.
          </div>
        </div>

        {/* Decision Heatmap */}
        <div style={{ ...s.chartContainer, marginTop: 16 }}>
          <div style={s.chartTitle}>Decision Heatmap — NPV Advantage ($m): Newbuilding minus Secondhand</div>
          <div style={{ overflowX: "auto" }}>
            <table style={s.heatmapTable}>
              <thead>
                <tr>
                  <th style={{ ...s.heatmapTh, textAlign: "right", paddingRight: 10 }}>TC Rate $/d</th>
                  {c.delays.map(d => (
                    <th key={d} style={s.heatmapTh}>{d}mo delivery</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.heatmap.map((row, i) => (
                  <tr key={i}>
                    <td style={s.heatmapRowLabel}>${(row.tcRate / 1000).toFixed(0)}k</td>
                    {c.delays.map(d => {
                      const val = row[`d${d}`] / 1e6;
                      return (
                        <td key={d} style={s.heatmapTd(val)}>
                          {val > 0 ? "+" : ""}{val.toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ ...s.legend, marginTop: 12 }}>
            <span><span style={s.legendDot(colors.positive)} /> Green = Newbuilding NPV advantage</span>
            <span><span style={s.legendDot(colors.negative)} /> Red = Secondhand NPV advantage</span>
          </div>
          <div style={s.note}>
            Higher TC rates favour secondhand (immediate earnings compound during NB delivery wait).
            Longer delivery delays widen the SH advantage at high rates. Includes drydock + opex escalation for both.
          </div>
        </div>

        {/* Side-by-side Assumptions */}
        <div style={{ ...s.panel, marginTop: 16, fontSize: 12 }}>
          <div style={{ ...s.sectionLabel, marginTop: 0 }}>Comparison Parameters (incl. drydock & escalation)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: colors.accent, fontSize: 13 }}>Newbuilding</div>
              <div style={s.inputRow}><span style={s.label}>Capex</span><span style={{ fontFamily: fontStack }}>${breakeven.finalCapex.toFixed(1)}m</span></div>
              <div style={s.inputRow}><span style={s.label}>Delivery Wait</span><span style={{ fontFamily: fontStack }}>{deliveryMonths} months</span></div>
              <div style={s.inputRow}><span style={s.label}>Trading Life</span><span style={{ fontFamily: fontStack }}>{economicLife} years</span></div>
              <div style={s.inputRow}><span style={s.label}>Base Opex</span><span style={{ fontFamily: fontStack }}>${dailyOpex.toLocaleString()}/d</span></div>
              <div style={s.inputRow}><span style={s.label}>Opex at Y20</span><span style={{ fontFamily: fontStack }}>${Math.round(opexAtAge(dailyOpex, 20, opexEscalation)).toLocaleString()}/d</span></div>
              <div style={s.inputRow}><span style={s.label}>Drydock Total</span><span style={{ fontFamily: fontStack, color: colors.drydock }}>${breakeven.totalDrydockCapex.toFixed(1)}m</span></div>
              <div style={s.inputRow}><span style={s.label}>Scrap</span><span style={{ fontFamily: fontStack }}>${SCRAP_VALUE.toFixed(1)}m</span></div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: colors.warn, fontSize: 13 }}>Secondhand ({shAge}yr old)</div>
              <div style={s.inputRow}><span style={s.label}>Capex</span><span style={{ fontFamily: fontStack }}>${shPrice}m</span></div>
              <div style={s.inputRow}><span style={s.label}>Delivery Wait</span><span style={{ fontFamily: fontStack }}>Immediate</span></div>
              <div style={s.inputRow}><span style={s.label}>Remaining Life</span><span style={{ fontFamily: fontStack }}>{25 - shAge} years</span></div>
              <div style={s.inputRow}><span style={s.label}>Base Opex</span><span style={{ fontFamily: fontStack }}>${shOpex.toLocaleString()}/d</span></div>
              <div style={s.inputRow}><span style={s.label}>Opex at Scrap Age</span><span style={{ fontFamily: fontStack }}>${Math.round(opexAtAge(shOpex, 25, opexEscalation + 0.5)).toLocaleString()}/d</span></div>
              <div style={s.inputRow}><span style={s.label}>Drydock Penalty</span><span style={{ fontFamily: fontStack, color: colors.drydock }}>+5d off-hire/survey</span></div>
              <div style={s.inputRow}><span style={s.label}>Scrap (adj.)</span><span style={{ fontFamily: fontStack }}>${(SCRAP_VALUE * 0.85).toFixed(1)}m</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <h1 style={s.title}>VLCC Newbuilding Analysis</h1>
        <div style={s.subtitle}>Breakeven & Investment Decision Tool — 2026 Market Benchmarks</div>
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
        <InputPanel />
        <div>
          {activeTab === "breakeven" ? <BreakevenTab /> : <NBvsSHTab />}
        </div>
      </div>
    </div>
  );
}
