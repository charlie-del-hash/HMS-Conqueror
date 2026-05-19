// dashboard-tabs.jsx — the two tab views (Breakeven + NB vs SH).

function BreakevenTab({ s, st, breakeven }) {
  const theme = s.theme; const tw = s.tw;
  const b = breakeven;
  const tcColor = st.tcRate > b.breakevenRate ? theme.positive : theme.negative;
  const margin = st.tcRate - b.breakevenRate;
  const Tooltipper = makeTooltip(theme);
  const anim = tw.animateCharts !== false;

  // Fill gradient stops driven by tweak
  const FillDefs = () => (
    <defs>
      <linearGradient id="cumGradSplit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={theme.positive} stopOpacity={0.28} />
        <stop offset="50%" stopColor={theme.positive} stopOpacity={0} />
        <stop offset="50%" stopColor={theme.negative} stopOpacity={0} />
        <stop offset="100%" stopColor={theme.negative} stopOpacity={0.28} />
      </linearGradient>
      <linearGradient id="cumGradAccent" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={theme.accent} stopOpacity={0.30} />
        <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
  const fillId = tw.chartFill === "split" ? "url(#cumGradSplit)" :
                 tw.chartFill === "accent" ? "url(#cumGradAccent)" : "none";

  // Drydock marker render
  const drydockMarkers = b.years.filter(y => y.isDrydockYear);
  const renderDDMarkers = () => {
    if (tw.drydockMarkers === "hidden") return null;
    if (tw.drydockMarkers === "dots") {
      return drydockMarkers.map((y, i) => (
        <ReferenceLine key={i} x={y.label} stroke={theme.drydock} strokeWidth={0}
          ifOverflow="extendDomain"
          label={{ value: "▼", position: "top", fill: theme.drydock, fontSize: 11 }} />
      ));
    }
    if (tw.drydockMarkers === "band") {
      return drydockMarkers.map((y, i) => (
        <ReferenceLine key={i} x={y.label} stroke={theme.drydock} strokeOpacity={0.18} strokeWidth={18} />
      ));
    }
    return drydockMarkers.map((y, i) => (
      <ReferenceLine key={i} x={y.label} stroke={theme.drydock} strokeDasharray="3 3" strokeWidth={1.5} />
    ));
  };

  const lineWeight = tw.lineWeight ?? 2.5;
  const showGrid = tw.showGrid !== false;
  const showLegend = tw.showLegend !== false;

  return (
    <div>
      <div style={s.kpiRow}>
        <KPI s={s} value={`$${b.breakevenRate.toLocaleString()}/d`} label="Breakeven TC Rate" color={theme.warn} sub="incl. drydock + escalation" />
        <KPI s={s} value={`$${b.finalCapex.toFixed(1)}m`} label="Total Capex" color={theme.accent} />
        <KPI s={s} value={b.paybackPeriod ? `${b.paybackPeriod} yrs` : "> life"}
          label="Cash Payback"
          color={b.paybackPeriod && b.paybackPeriod <= st.economicLife + Math.ceil(st.deliveryMonths / 12) ? theme.positive : theme.negative} />
        <KPI s={s} value={`${margin > 0 ? "+" : ""}$${margin.toLocaleString()}/d`} label="Rate vs Breakeven" color={tcColor} />
      </div>

      {b.drydocks.length > 0 && tw.showDrydockSummary !== false && (
        <div style={{ ...s.panel, marginBottom: s.densityScale.gap, padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: theme.textDim, fontWeight: 700, letterSpacing: "0.12em", fontFamily: theme.mono, textTransform: "uppercase" }}>Survey Schedule</span>
            {b.drydocks.map((dd, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={s.ddBadge}>SS{dd.surveyNumber}</span>
                <span style={{ fontSize: 11, color: theme.text, fontFamily: theme.mono }}>
                  Age {dd.vesselAge} · ${dd.cost.toFixed(1)}m
                </span>
              </span>
            ))}
            <span style={{ fontSize: 11, color: theme.drydock, fontFamily: theme.mono, marginLeft: "auto", fontWeight: 600 }}>
              Total ${b.totalDrydockCapex.toFixed(1)}m
            </span>
          </div>
        </div>
      )}

      <div style={s.chartContainer}>
        <div style={s.chartTitle}>Cumulative Cash Flow — VLCC Newbuilding</div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={b.years} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.gridLine} />}
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: theme.textDim, fontFamily: theme.mono }} stroke={theme.gridLine} />
            <YAxis tick={{ fontSize: 10, fill: theme.textDim, fontFamily: theme.mono }} stroke={theme.gridLine} tickFormatter={v => `$${v}m`} />
            <Tooltip content={<Tooltipper />} />
            <ReferenceLine y={0} stroke={theme.textMuted} strokeDasharray="4 4" />
            <FillDefs />
            {fillId !== "none" && (
              <Area type="monotone" dataKey="cumCash" fill={fillId} stroke="none" name="Cumulative" isAnimationActive={anim} />
            )}
            <Line type="monotone" dataKey="cumCash" stroke={theme.accent} strokeWidth={lineWeight} dot={false} name="Cumulative Cash" isAnimationActive={anim} />
            {renderDDMarkers()}
            <ReferenceLine x={`Y${Math.ceil(st.deliveryMonths / 12)}`} stroke={theme.accent}
              strokeDasharray="4 4" label={{ value: "Delivery", position: "top", fill: theme.textDim, fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
        {showLegend && (
          <div style={s.legend}>
            <span><span style={s.legendDot(theme.accent)} /> Cumulative cash flow</span>
            {tw.drydockMarkers !== "hidden" && <span><span style={s.legendDot(theme.drydock)} /> Drydock / special survey</span>}
          </div>
        )}
        {tw.showNotes !== false && (
          <div style={s.note}>
            Visible dips at survey years reflect drydock capex + off-hire revenue loss. Opex escalates at {st.opexEscalation}%/yr, compressing margins over vessel life.
          </div>
        )}
      </div>

      <div style={{ ...s.chartContainer, marginTop: s.densityScale.gap }}>
        <div style={s.chartTitle}>Annual Cash Flow Components (Trading Years)</div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={b.years.filter(y => y.phase === "trading")} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.gridLine} />}
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: theme.textDim, fontFamily: theme.mono }} stroke={theme.gridLine} />
            <YAxis tick={{ fontSize: 10, fill: theme.textDim, fontFamily: theme.mono }} stroke={theme.gridLine} tickFormatter={v => `$${v}m`} />
            <Tooltip content={<Tooltipper />} />
            <Bar dataKey="revenue" fill={theme.positive} opacity={0.7} name="TC Revenue" radius={[2, 2, 0, 0]} isAnimationActive={anim} />
            <Bar dataKey="opex" fill={theme.negative} opacity={0.6} name="Opex (escalating)" radius={[2, 2, 0, 0]} isAnimationActive={anim} />
            <Bar dataKey="debtService" fill={theme.warn} opacity={0.6} name="Debt Service" radius={[2, 2, 0, 0]} isAnimationActive={anim} />
            <Bar dataKey="drydock" fill={theme.drydock} opacity={0.8} name="Drydock Capex" radius={[2, 2, 0, 0]} isAnimationActive={anim} />
            <Line type="monotone" dataKey="netCash" stroke={theme.text} strokeWidth={1.5} dot={false} name="Net Cash" isAnimationActive={anim} />
          </ComposedChart>
        </ResponsiveContainer>
        {showLegend && (
          <div style={s.legend}>
            <span><span style={s.legendDot(theme.positive)} /> Revenue</span>
            <span><span style={s.legendDot(theme.negative)} /> Opex</span>
            <span><span style={s.legendDot(theme.warn)} /> Debt</span>
            <span><span style={s.legendDot(theme.drydock)} /> Drydock</span>
            <span><span style={s.legendDot(theme.text)} /> Net cash</span>
          </div>
        )}
      </div>

      <div style={{ ...s.panel, marginTop: s.densityScale.gap, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12 }}>
        <div>
          <div style={s.sectionLabel}>Capital Structure</div>
          <div style={s.inputRow}><span style={s.label}>Equity</span><span style={{ fontFamily: theme.numericFont, color: theme.text }}>${b.equityAmount.toFixed(1)}m</span></div>
          <div style={s.inputRow}><span style={s.label}>Debt</span><span style={{ fontFamily: theme.numericFont, color: theme.text }}>${b.debtAmount.toFixed(1)}m</span></div>
          <div style={s.inputRow}><span style={s.label}>Annual Debt Service</span><span style={{ fontFamily: theme.numericFont, color: theme.text }}>${(b.annualDebtService / 1e6).toFixed(1)}m</span></div>
          <div style={s.inputRow}><span style={s.label}>Lifetime Drydock</span><span style={{ fontFamily: theme.numericFont, color: theme.drydock }}>${b.totalDrydockCapex.toFixed(1)}m</span></div>
        </div>
        <div>
          <div style={s.sectionLabel}>Opex Trajectory</div>
          <div style={s.inputRow}><span style={s.label}>Year 1 Opex</span><span style={{ fontFamily: theme.numericFont }}>${st.dailyOpex.toLocaleString()}/d</span></div>
          <div style={s.inputRow}><span style={s.label}>Year 10 Opex</span><span style={{ fontFamily: theme.numericFont }}>${Math.round(opexAtAge(st.dailyOpex, 10, st.opexEscalation)).toLocaleString()}/d</span></div>
          <div style={s.inputRow}><span style={s.label}>Year 20 Opex</span><span style={{ fontFamily: theme.numericFont }}>${Math.round(opexAtAge(st.dailyOpex, 20, st.opexEscalation)).toLocaleString()}/d</span></div>
          <div style={s.inputRow}><span style={s.label}>Year 25 Opex</span><span style={{ fontFamily: theme.numericFont, color: theme.warn }}>${Math.round(opexAtAge(st.dailyOpex, 25, st.opexEscalation)).toLocaleString()}/d</span></div>
        </div>
      </div>
    </div>
  );
}

function NBvsSHTab({ s, st, breakeven, comparison }) {
  const theme = s.theme; const tw = s.tw;
  const c = comparison;
  const nbWins = c.nbNPV > c.shNPV;
  const Tooltipper = makeTooltip(theme);
  const lineWeight = tw.lineWeight ?? 2.5;
  const showGrid = tw.showGrid !== false;
  const showLegend = tw.showLegend !== false;
  const anim = tw.animateCharts !== false;

  return (
    <div>
      <div style={s.kpiRow}>
        <KPI s={s} value={`$${(c.nbNPV / 1e6).toFixed(1)}m`} label="Newbuilding NPV"
          color={nbWins ? theme.positive : theme.textDim}
          sub={`${st.economicLife}yr life · ${st.deliveryMonths}mo wait`} />
        <KPI s={s} value={`$${(c.shNPV / 1e6).toFixed(1)}m`} label="Secondhand NPV"
          color={!nbWins ? theme.positive : theme.textDim}
          sub={`${25 - st.shAge}yr remaining · immediate`} />
        <KPI s={s} value={nbWins ? "NEWBUILD" : "SECONDHAND"} label="Preferred at Current Inputs"
          color={nbWins ? theme.accent : theme.warn} />
        <KPI s={s} value={c.indifferenceRate != null ? `$${c.indifferenceRate.toLocaleString()}/d` : "—"}
          label="Indifference TC Rate"
          color={theme.textDim}
          sub={c.indifferenceRate != null
            ? "above = SH wins, below = NB wins"
            : (c.nbNPV > c.shNPV ? "NB preferred at all rates" : "SH preferred at all rates")} />
      </div>

      <div style={s.chartContainer}>
        <div style={s.chartTitle}>Cumulative Earnings — Newbuilding vs Secondhand VLCC (undiscounted)</div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={c.timeline} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.gridLine} />}
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: theme.textDim, fontFamily: theme.mono }} stroke={theme.gridLine}
              label={{ value: "Years from Investment Decision", position: "insideBottom", offset: -10, fontSize: 10, fill: theme.textMuted }} />
            <YAxis tick={{ fontSize: 10, fill: theme.textDim, fontFamily: theme.mono }} stroke={theme.gridLine} tickFormatter={v => `$${v}m`} />
            <Tooltip content={<Tooltipper />} />
            <ReferenceLine y={0} stroke={theme.textMuted} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="nb" stroke={theme.accent} strokeWidth={lineWeight} dot={false} name="Newbuilding" isAnimationActive={anim} />
            <Line type="monotone" dataKey="sh" stroke={theme.warn} strokeWidth={lineWeight} dot={false} name="Secondhand" isAnimationActive={anim} />
          </ComposedChart>
        </ResponsiveContainer>
        {showLegend && (
          <div style={s.legend}>
            <span><span style={s.legendDot(theme.accent)} /> Newbuilding (delivery: {st.deliveryMonths}mo)</span>
            <span><span style={s.legendDot(theme.warn)} /> Secondhand ({st.shAge}yr old, immediate)</span>
          </div>
        )}
        {tw.showNotes !== false && (
          <div style={s.note}>
            NB line flat during build period. Both lines show drydock dips. SH has higher opex escalation ({(st.opexEscalation + 0.5).toFixed(1)}%/yr) and shorter remaining life.
          </div>
        )}
      </div>

      <div style={{ ...s.chartContainer, marginTop: s.densityScale.gap }}>
        <div style={s.chartTitle}>Decision Heatmap — NPV Advantage ($m): Newbuilding minus Secondhand</div>
        <div style={{ overflowX: "auto" }}>
          <table style={s.heatmapTable}>
            <thead>
              <tr>
                <th style={{ ...s.heatmapTh, textAlign: "right", paddingRight: 10 }}>TC Rate $/d</th>
                {c.delays.map(d => (<th key={d} style={s.heatmapTh}>{d}mo delivery</th>))}
              </tr>
            </thead>
            <tbody>
              {c.heatmap.map((row, i) => (
                <tr key={i}>
                  <td style={s.heatmapRowLabel}>${(row.tcRate / 1000).toFixed(0)}k</td>
                  {c.delays.map(d => {
                    const val = row[`d${d}`] / 1e6;
                    return <td key={d} style={heatmapCellStyle(val, theme, tw.heatmapPalette || "redgreen", s.radius)}>
                      {val > 0 ? "+" : ""}{val.toFixed(1)}
                    </td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showLegend && (
          <div style={{ ...s.legend, marginTop: 12 }}>
            <span><span style={s.legendDot(theme.positive)} /> Newbuilding advantage</span>
            <span><span style={s.legendDot(theme.negative)} /> Secondhand advantage</span>
          </div>
        )}
        {tw.showNotes !== false && (
          <div style={s.note}>
            Higher TC rates favour secondhand (immediate earnings compound during NB delivery wait).
            Longer delivery delays widen the SH advantage at high rates.
          </div>
        )}
      </div>

      <div style={{ ...s.panel, marginTop: s.densityScale.gap, fontSize: 12 }}>
        <div style={{ ...s.sectionLabel, marginTop: 0 }}>Comparison Parameters (incl. drydock & escalation)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: theme.accent, fontSize: 13, fontFamily: theme.sans }}>Newbuilding</div>
            <div style={s.inputRow}><span style={s.label}>Capex</span><span style={{ fontFamily: theme.numericFont }}>${breakeven.finalCapex.toFixed(1)}m</span></div>
            <div style={s.inputRow}><span style={s.label}>Delivery Wait</span><span style={{ fontFamily: theme.numericFont }}>{st.deliveryMonths} months</span></div>
            <div style={s.inputRow}><span style={s.label}>Trading Life</span><span style={{ fontFamily: theme.numericFont }}>{st.economicLife} years</span></div>
            <div style={s.inputRow}><span style={s.label}>Base Opex</span><span style={{ fontFamily: theme.numericFont }}>${st.dailyOpex.toLocaleString()}/d</span></div>
            <div style={s.inputRow}><span style={s.label}>Opex at Y20</span><span style={{ fontFamily: theme.numericFont }}>${Math.round(opexAtAge(st.dailyOpex, 20, st.opexEscalation)).toLocaleString()}/d</span></div>
            <div style={s.inputRow}><span style={s.label}>Drydock Total</span><span style={{ fontFamily: theme.numericFont, color: theme.drydock }}>${breakeven.totalDrydockCapex.toFixed(1)}m</span></div>
            <div style={s.inputRow}><span style={s.label}>Scrap</span><span style={{ fontFamily: theme.numericFont }}>${SCRAP_VALUE.toFixed(1)}m</span></div>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: theme.warn, fontSize: 13, fontFamily: theme.sans }}>Secondhand ({st.shAge}yr old)</div>
            <div style={s.inputRow}><span style={s.label}>Capex</span><span style={{ fontFamily: theme.numericFont }}>${st.shPrice}m</span></div>
            <div style={s.inputRow}><span style={s.label}>Delivery Wait</span><span style={{ fontFamily: theme.numericFont }}>Immediate</span></div>
            <div style={s.inputRow}><span style={s.label}>Remaining Life</span><span style={{ fontFamily: theme.numericFont }}>{25 - st.shAge} years</span></div>
            <div style={s.inputRow}><span style={s.label}>Base Opex</span><span style={{ fontFamily: theme.numericFont }}>${st.shOpex.toLocaleString()}/d</span></div>
            <div style={s.inputRow}><span style={s.label}>Opex at Scrap Age</span><span style={{ fontFamily: theme.numericFont }}>${Math.round(opexAtAge(st.shOpex, 25, st.opexEscalation + 0.5)).toLocaleString()}/d</span></div>
            <div style={s.inputRow}><span style={s.label}>Drydock Penalty</span><span style={{ fontFamily: theme.numericFont, color: theme.drydock }}>+5d off-hire/survey</span></div>
            <div style={s.inputRow}><span style={s.label}>Scrap (adj.)</span><span style={{ fontFamily: theme.numericFont }}>${(SCRAP_VALUE * 0.85).toFixed(1)}m</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BreakevenTab, NBvsSHTab });
