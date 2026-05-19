// calc.jsx — pure calculation engine extracted from the original dashboard.
// Exposes calcBreakeven, calcNBvsSH, opexAtAge, getDrydockSchedule, DEFAULTS, SCRAP_VALUE.

const DEFAULTS = {
  nbPrice: 128,
  nbPriceDualFuel: 145,
  deliveryMonths: 30,
  economicLife: 25,
  shPrice5yr: 100,
  shPrice10yr: 72,
  shAge: 5,
  dailyOpex: 10500,
  opexEscalation: 2.5,
  scrubberPremium: 3500,
  scrubberCapex: 5,
  dualFuelBunkerSaving: 4500,
  drydockBase: 2.8,
  drydockEscalation: 1.5,
  drydockOffHireDays: 25,
  ltv: 60,
  interestRate: 6.5,
  loanTenor: 12,
  tcRate: 42000,
  scrapValuePerLdt: 620,
  vlccLdt: 42000,
  discountRate: 8,
  tradingDaysPerYear: 350,
};

const SCRAP_VALUE = (DEFAULTS.scrapValuePerLdt * DEFAULTS.vlccLdt) / 1e6;

function getDrydockSchedule(vesselAgeAtStart, ownershipYears, baseCost, escalation, offHireDays) {
  const schedule = [];
  const surveyAges = [5, 10, 15, 20];
  surveyAges.forEach((surveyAge, idx) => {
    const ownershipYear = surveyAge - vesselAgeAtStart;
    if (ownershipYear > 0 && ownershipYear <= ownershipYears) {
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

function opexAtAge(baseOpex, vesselAge, escalationPct) {
  return baseOpex * Math.pow(1 + escalationPct / 100, vesselAge);
}

function calcBreakeven(params) {
  const {
    yardPrice, deliveryMonths, economicLife, dailyOpex, opexEscalation,
    ltv, interestRate, loanTenor, tcRate,
    scrapValue, hasScrubber, scrubberCapex, scrubberPremium,
    isDualFuel, dualFuelBunkerSaving, dualFuelPremium,
    drydockBase, drydockEscalation, drydockOffHireDays,
    tradingDaysPerYear,
  } = params;

  // TC uplifts from vessel configuration — added on top of base market TC rate.
  const tcUplift = (hasScrubber ? scrubberPremium : 0) + (isDualFuel ? dualFuelBunkerSaving : 0);
  const effectiveTcRate = tcRate + tcUplift;
  const effectiveYardPrice = isDualFuel ? yardPrice + dualFuelPremium : yardPrice;
  const finalCapex = effectiveYardPrice + (hasScrubber ? scrubberCapex : 0); // $m

  // All money tracked in raw $ inside the year loop and solver, then
  // converted to $m for display. The original code mixed $m and raw $
  // (equity & debt service stored in $m but added to a raw-$ accumulator)
  // which silently zeroed out capex and debt in the cash-flow picture.
  const finalCapexRaw = finalCapex * 1e6;
  const debtAmountRaw = finalCapexRaw * (ltv / 100);
  const equityAmountRaw = finalCapexRaw - debtAmountRaw;
  const annualDebtServiceRaw = debtAmountRaw > 0
    ? (debtAmountRaw * (interestRate / 100)) / (1 - Math.pow(1 + interestRate / 100, -loanTenor))
    : 0;
  // Friendly $m versions for return/display
  const debtAmount = debtAmountRaw / 1e6;
  const equityAmount = equityAmountRaw / 1e6;
  const annualDebtService = annualDebtServiceRaw; // raw $ — display divides by 1e6

  const deliveryYears = deliveryMonths / 12;
  const deliveryYearsFloor = Math.ceil(deliveryYears);

  const drydocks = getDrydockSchedule(0, economicLife, drydockBase, drydockEscalation, drydockOffHireDays);

  const years = [];
  let cumCashRaw = -equityAmountRaw; // equity outlay at t=0
  const totalYears = deliveryYearsFloor + economicLife;
  let totalDrydockCapex = 0;

  for (let y = 0; y <= totalYears; y++) {
    let annualRevenue = 0;
    let annualOpex = 0;
    let annualDebt = 0;
    let drydockCost = 0; // $m
    let scrap = 0;       // $m
    let tradingDays = 0;
    let vesselAge = null;
    let phase = "build";

    if (y >= deliveryYearsFloor) {
      const tradingYear = y - deliveryYearsFloor;
      vesselAge = tradingYear;
      phase = "trading";

      if (tradingYear < economicLife) {
        const dd = drydocks.find(d => d.ownershipYear === tradingYear);
        const offHire = dd ? dd.offHireDays : 0;
        drydockCost = dd ? dd.cost : 0;
        totalDrydockCapex += drydockCost;

        tradingDays = tradingDaysPerYear - offHire;
        const currentOpex = opexAtAge(dailyOpex, vesselAge, opexEscalation);

        annualRevenue = effectiveTcRate * tradingDays;       // raw $
        annualOpex = currentOpex * 365;                       // raw $
        annualDebt = tradingYear < loanTenor ? annualDebtServiceRaw : 0; // raw $
      }

      if (tradingYear === economicLife - 1) {
        scrap = scrapValue; // $m
      }
    }

    const netCashRaw = annualRevenue - annualOpex - annualDebt - drydockCost * 1e6 + scrap * 1e6;
    cumCashRaw += netCashRaw;

    years.push({
      year: y,
      label: `Y${y}`,
      revenue: annualRevenue / 1e6,
      opex: annualOpex / 1e6,
      debtService: annualDebt / 1e6,
      drydock: drydockCost,
      scrap: scrap,
      netCash: netCashRaw / 1e6,
      cumCash: cumCashRaw / 1e6,
      tradingDays,
      vesselAge,
      phase,
      isDrydockYear: drydockCost > 0,
    });
  }

  // Breakeven solver — returns the BASE market TC rate that yields NPV=0,
  // given the vessel's configuration uplift is earned on top. All cash
  // flows tracked in raw $.
  let lo = 0, hi = 200000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    let npv = -finalCapexRaw; // upfront capex in raw $
    for (let yr = 0; yr < economicLife; yr++) {
      const t = deliveryYears + yr + 1;
      const dd = drydocks.find(d => d.ownershipYear === yr);
      const offHire = dd ? dd.offHireDays : 0;
      const ddCost = dd ? dd.cost * 1e6 : 0;
      const currentOpex = opexAtAge(dailyOpex, yr, opexEscalation);
      const annualNet = ((mid + tcUplift) * (tradingDaysPerYear - offHire)) - (currentOpex * 365) -
        (yr < loanTenor ? annualDebtServiceRaw : 0) - ddCost;
      npv += annualNet / Math.pow(1 + DEFAULTS.discountRate / 100, t);
    }
    npv += (scrapValue * 1e6) / Math.pow(1 + DEFAULTS.discountRate / 100, deliveryYears + economicLife);
    if (npv > 0) hi = mid; else lo = mid;
  }
  const breakevenRate = Math.round((lo + hi) / 2);

  const paybackYear = years.find(y => y.cumCash >= 0);
  const paybackPeriod = paybackYear ? paybackYear.year : null;

  return {
    years, breakevenRate, paybackPeriod, finalCapex, equityAmount,
    debtAmount, annualDebtService, effectiveTcRate, drydocks, totalDrydockCapex,
  };
}

// nbParams / shParams carry a BASE market `tcRate` plus an optional `tcUplift`
// that represents per-vessel TCE enhancements (scrubber spread, LNG bunker
// saving). The uplift is earned on top of the market rate. shParams typically
// has tcUplift = 0 unless the secondhand candidate is itself eco-fitted.
function calcNBvsSH(nbParams, shParams, discountRate) {
  const dr = discountRate / 100;
  const nbUplift = nbParams.tcUplift || 0;
  const shUplift = shParams.tcUplift || 0;

  function npvStream(capex, deliveryDelay, baseOpex, opexEscalation, vesselAgeAtStart, effectiveTc, life, scrap, drydockBase, drydockEscalation, drydockOffHire) {
    let npv = -capex * 1e6;
    const drydocks = getDrydockSchedule(vesselAgeAtStart, life, drydockBase, drydockEscalation, drydockOffHire);

    for (let yr = 0; yr < life; yr++) {
      const t = deliveryDelay + yr + 1;
      const vesselAge = vesselAgeAtStart + yr;
      const dd = drydocks.find(d => d.ownershipYear === yr);
      const offHire = dd ? dd.offHireDays : 0;
      const ddCost = dd ? dd.cost * 1e6 : 0;
      const currentOpex = opexAtAge(baseOpex, vesselAge, opexEscalation);
      const annual = (effectiveTc * (DEFAULTS.tradingDaysPerYear - offHire)) - (currentOpex * 365) - ddCost;
      npv += annual / Math.pow(1 + dr, t);
    }
    npv += (scrap * 1e6) / Math.pow(1 + dr, deliveryDelay + life);
    return npv;
  }

  const nbEffective = nbParams.tcRate + nbUplift;
  const shEffective = shParams.tcRate + shUplift;

  const nbNPV = npvStream(
    nbParams.capex, nbParams.deliveryMonths / 12,
    nbParams.opex, nbParams.opexEsc, 0, nbEffective,
    nbParams.life, nbParams.scrap,
    nbParams.ddBase, nbParams.ddEsc, nbParams.ddOffHire
  );
  const shNPV = npvStream(
    shParams.capex, 0,
    shParams.opex, shParams.opexEsc, shParams.vesselAge, shEffective,
    shParams.life, shParams.scrap,
    shParams.ddBase, shParams.ddEsc, shParams.ddOffHire
  );

  const timeline = [];
  const maxHorizon = Math.max(Math.ceil(nbParams.deliveryMonths / 12) + nbParams.life, shParams.life) + 1;
  let nbCum = -nbParams.capex * 1e6;
  let shCum = -shParams.capex * 1e6;
  const nbDelivery = nbParams.deliveryMonths / 12;

  const nbDrydocks = getDrydockSchedule(0, nbParams.life, nbParams.ddBase, nbParams.ddEsc, nbParams.ddOffHire);
  const shDrydocks = getDrydockSchedule(shParams.vesselAge, shParams.life, shParams.ddBase, shParams.ddEsc, shParams.ddOffHire);

  for (let y = 0; y <= Math.min(maxHorizon, 30); y++) {
    const nbTradingYear = y - Math.ceil(nbDelivery);
    if (nbTradingYear >= 0 && nbTradingYear < nbParams.life) {
      const dd = nbDrydocks.find(d => d.ownershipYear === nbTradingYear);
      const offHire = dd ? dd.offHireDays : 0;
      const ddCost = dd ? dd.cost * 1e6 : 0;
      const vesselAge = nbTradingYear;
      const currentOpex = opexAtAge(nbParams.opex, vesselAge, nbParams.opexEsc);
      nbCum += (nbEffective * (DEFAULTS.tradingDaysPerYear - offHire)) - (currentOpex * 365) - ddCost;
      if (nbTradingYear === nbParams.life - 1) nbCum += nbParams.scrap * 1e6;
    }

    if (y < shParams.life) {
      const dd = shDrydocks.find(d => d.ownershipYear === y);
      const offHire = dd ? dd.offHireDays : 0;
      const ddCost = dd ? dd.cost * 1e6 : 0;
      const vesselAge = shParams.vesselAge + y;
      const currentOpex = opexAtAge(shParams.opex, vesselAge, shParams.opexEsc);
      shCum += (shEffective * (DEFAULTS.tradingDaysPerYear - offHire)) - (currentOpex * 365) - ddCost;
      if (y === shParams.life - 1) shCum += shParams.scrap * 1e6;
    }

    timeline.push({
      year: y,
      nb: Math.round(nbCum / 1e5) / 10,
      sh: Math.round(shCum / 1e5) / 10,
    });
  }

  // Heatmap iterates BASE market rate; each side adds its own uplift.
  // Range extends through plausible newbuild breakeven territory.
  const tcRates = [];
  for (let r = 25000; r <= 100000; r += 7500) tcRates.push(r);
  const delays = [12, 18, 24, 30, 36, 48];

  const heatmap = [];
  for (const rate of tcRates) {
    const row = { tcRate: rate };
    for (const delay of delays) {
      const nbVal = npvStream(
        nbParams.capex, delay / 12, nbParams.opex, nbParams.opexEsc, 0, rate + nbUplift,
        nbParams.life, nbParams.scrap, nbParams.ddBase, nbParams.ddEsc, nbParams.ddOffHire
      );
      const shVal = npvStream(
        shParams.capex, 0, shParams.opex, shParams.opexEsc, shParams.vesselAge, rate + shUplift,
        shParams.life, shParams.scrap, shParams.ddBase, shParams.ddEsc, shParams.ddOffHire
      );
      row[`d${delay}`] = nbVal - shVal;
    }
    heatmap.push(row);
  }

  // Indifference rate = BASE market TC at which NB ≈ SH NPVs. If no crossover
  // exists in [0, 200k] — i.e. one side always wins — returns null so the UI
  // can show "n/a" instead of a misleading bisection-converged value.
  let lo = 0, hi = 200000;
  const probe = (rate) => {
    const nb = npvStream(
      nbParams.capex, nbParams.deliveryMonths / 12, nbParams.opex, nbParams.opexEsc, 0, rate + nbUplift,
      nbParams.life, nbParams.scrap, nbParams.ddBase, nbParams.ddEsc, nbParams.ddOffHire
    );
    const sh = npvStream(
      shParams.capex, 0, shParams.opex, shParams.opexEsc, shParams.vesselAge, rate + shUplift,
      shParams.life, shParams.scrap, shParams.ddBase, shParams.ddEsc, shParams.ddOffHire
    );
    return sh > nb;
  };
  const shWinsAtLo = probe(lo);
  const shWinsAtHi = probe(hi);
  let indifferenceRate;
  if (shWinsAtLo === shWinsAtHi) {
    indifferenceRate = null; // no crossover in the searched range
  } else {
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (probe(mid) === shWinsAtLo) lo = mid;
      else hi = mid;
    }
    indifferenceRate = Math.round((lo + hi) / 2);
  }

  return { nbNPV, shNPV, timeline, heatmap, tcRates, delays, indifferenceRate };
}

Object.assign(window, { DEFAULTS, SCRAP_VALUE, getDrydockSchedule, opexAtAge, calcBreakeven, calcNBvsSH });
