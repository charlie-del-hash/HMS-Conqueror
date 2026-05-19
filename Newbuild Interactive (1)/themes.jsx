// themes.jsx — visual style presets for the VLCC dashboard.
// Each theme exposes a palette + font stacks + surface treatment.
// Tweaks override individual properties on top of the chosen preset.

const FONT_STACKS = {
  jetbrains: "'JetBrains Mono', 'Fira Code', 'SF Mono', ui-monospace, monospace",
  ibm:       "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace",
  spaceMono: "'Space Mono', 'IBM Plex Mono', ui-monospace, monospace",
  dmSans:    "'DM Sans', 'Inter', system-ui, sans-serif",
  inter:     "'Inter', system-ui, sans-serif",
  manrope:   "'Manrope', 'Inter', system-ui, sans-serif",
  spaceGrot: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  ibmSans:   "'IBM Plex Sans', 'Inter', system-ui, sans-serif",
  fraunces:  "'Fraunces', 'Source Serif Pro', Georgia, serif",
  sourceSerif:"'Source Serif Pro', 'Fraunces', Georgia, serif",
  newsreader:"'Newsreader', 'Source Serif Pro', Georgia, serif",
};

const THEMES = {
  terminal: {
    label: "Terminal",
    bg: "#0a0f1a",
    bgGradient: null,
    panel: "#111827",
    panelBorder: "#1e293b",
    panelBorderStrong: "#27324a",
    accent: "#3b82f6",
    accentSoft: "rgba(59,130,246,0.12)",
    positive: "#10b981",
    negative: "#ef4444",
    warn: "#f59e0b",
    drydock: "#8b5cf6",
    text: "#e2e8f0",
    textDim: "#94a3b8",
    textMuted: "#475569",
    gridLine: "#1e293b",
    tooltipBg: "#1a2332",
    mono: FONT_STACKS.jetbrains,
    sans: FONT_STACKS.dmSans,
    display: FONT_STACKS.dmSans,
    displayWeight: 700,
    displayTracking: "-0.02em",
    panelStyle: "flat",
    chrome: "lined",
  },
  maritime: {
    label: "Maritime",
    // Deep ocean navy with warm brass accent and oat-cream text — fits VLCC subject matter.
    bg: "#0c1929",
    bgGradient: null,
    panel: "#142336",
    panelBorder: "#22344c",
    panelBorderStrong: "#33486a",
    accent: "#c69962",                    // brass
    accentSoft: "rgba(198,153,98,0.12)",
    positive: "#7ab989",                  // sea-foam
    negative: "#d96458",                  // signal red
    warn: "#e0b14c",                      // running-light amber
    drydock: "#8aa3c4",                   // weathered slate
    text: "#f0ead8",                      // sailcloth cream
    textDim: "#a89e85",
    textMuted: "#6b6553",
    gridLine: "#1d2c42",
    tooltipBg: "#142336",
    mono: FONT_STACKS.ibm,
    sans: FONT_STACKS.ibmSans,
    display: FONT_STACKS.fraunces,
    displayWeight: 600,
    displayTracking: "-0.015em",
    panelStyle: "card",
    chrome: "ruled",
  },
  editorial: {
    label: "Editorial",
    bg: "#f5f1e8",
    bgGradient: null,
    panel: "#fbf7ee",
    panelBorder: "#d9d1bf",
    panelBorderStrong: "#9d9079",
    accent: "#1f3a5f",
    accentSoft: "rgba(31,58,95,0.08)",
    positive: "#1f6b46",
    negative: "#a8311e",
    warn: "#a86b1f",
    drydock: "#6b3fa0",
    text: "#1a1612",
    textDim: "#5b5448",
    textMuted: "#9d9079",
    gridLine: "#e6dfd0",
    tooltipBg: "#fbf7ee",
    mono: FONT_STACKS.ibm,
    sans: FONT_STACKS.ibmSans,
    display: FONT_STACKS.fraunces,
    displayWeight: 600,
    displayTracking: "-0.015em",
    panelStyle: "card",
    chrome: "ruled",
  },
  sunset: {
    label: "Sunset",
    bg: "#1a0f0a",
    bgGradient: "radial-gradient(1100px 500px at 90% 0%, rgba(251,146,60,0.12), transparent 60%), #1a0f0a",
    panel: "#241612",
    panelBorder: "#3a2620",
    panelBorderStrong: "#5c3a2f",
    accent: "#fb923c",
    accentSoft: "rgba(251,146,60,0.14)",
    positive: "#84cc16",
    negative: "#f43f5e",
    warn: "#fde047",
    drydock: "#f472b6",
    text: "#fef3e9",
    textDim: "#c4a892",
    textMuted: "#7a5e4d",
    gridLine: "#3a2620",
    tooltipBg: "#241612",
    mono: FONT_STACKS.spaceMono,
    sans: FONT_STACKS.manrope,
    display: FONT_STACKS.manrope,
    displayWeight: 700,
    displayTracking: "-0.03em",
    panelStyle: "flat",
    chrome: "lined",
  },
  mono: {
    label: "Mono",
    bg: "#fafafa",
    bgGradient: null,
    panel: "#ffffff",
    panelBorder: "#111111",
    panelBorderStrong: "#111111",
    accent: "#111111",
    accentSoft: "rgba(17,17,17,0.06)",
    positive: "#111111",
    negative: "#111111",
    warn: "#111111",
    drydock: "#111111",
    text: "#111111",
    textDim: "#444444",
    textMuted: "#888888",
    gridLine: "#e6e6e6",
    tooltipBg: "#ffffff",
    mono: FONT_STACKS.jetbrains,
    sans: FONT_STACKS.ibmSans,
    display: FONT_STACKS.ibmSans,
    displayWeight: 700,
    displayTracking: "-0.02em",
    panelStyle: "stark",
    chrome: "ruled",
    monochrome: true, // signals charts to use grayscale palette
  },
  phosphor: {
    label: "Phosphor",
    // Vintage CRT — pure black panel with monochromatic green phosphor + scanline grid.
    bg: "#000000",
    bgGradient: "repeating-linear-gradient(0deg, rgba(0,255,102,0.025) 0px, rgba(0,255,102,0.025) 1px, transparent 1px, transparent 3px), #000000",
    panel: "#040b06",
    panelBorder: "#0a4528",
    panelBorderStrong: "#0f7140",
    accent: "#00ff66",                    // primary phosphor
    accentSoft: "rgba(0,255,102,0.10)",
    positive: "#39ff14",
    negative: "#ff5577",                  // contrasting alarm
    warn: "#fae600",
    drydock: "#9bff8a",
    text: "#7dff9e",
    textDim: "#3eb964",
    textMuted: "#207040",
    gridLine: "#0c3d24",
    tooltipBg: "#040b06",
    mono: FONT_STACKS.spaceMono,
    sans: FONT_STACKS.spaceMono,          // mono everywhere — true CRT
    display: FONT_STACKS.spaceMono,
    displayWeight: 700,
    displayTracking: "0.02em",
    panelStyle: "flat",
    chrome: "ruled",
  },
  brutalist: {
    label: "Brutalist",
    // Swiss-poster severity — bright white, ink black, thick 1.5px ruled borders,
    // single high-vis vermillion accent. No shadows, no rounding.
    bg: "#fafaf7",
    bgGradient: null,
    panel: "#ffffff",
    panelBorder: "#0a0a0a",
    panelBorderStrong: "#0a0a0a",
    accent: "#e63b1f",                    // hi-vis vermillion
    accentSoft: "rgba(230,59,31,0.08)",
    positive: "#0a0a0a",
    negative: "#e63b1f",
    warn: "#0a0a0a",
    drydock: "#0a0a0a",
    text: "#0a0a0a",
    textDim: "#3d3d3d",
    textMuted: "#7a7a7a",
    gridLine: "#0a0a0a",
    tooltipBg: "#ffffff",
    mono: FONT_STACKS.ibm,
    sans: FONT_STACKS.manrope,
    display: FONT_STACKS.manrope,
    displayWeight: 800,                   // big and heavy
    displayTracking: "-0.035em",
    panelStyle: "stark",                  // heavy 1.5px borders
    chrome: "ruled",
  },
  tactical: {
    label: "Tactical",
    // Military/operations utility — olive-drab on tan substrate, mono everywhere,
    // hi-vis safety orange for accents. Feels like a printed field manual.
    bg: "#1a1d12",
    bgGradient: null,
    panel: "#22271a",
    panelBorder: "#3a4129",
    panelBorderStrong: "#5a6440",
    accent: "#ff7a1a",                    // safety orange
    accentSoft: "rgba(255,122,26,0.10)",
    positive: "#a8c46a",                  // OD green
    negative: "#d44a3f",
    warn: "#e0b14c",
    drydock: "#c9a06a",                   // khaki
    text: "#dcd5b8",                      // tan
    textDim: "#999073",
    textMuted: "#5a553e",
    gridLine: "#2a2f1f",
    tooltipBg: "#22271a",
    mono: FONT_STACKS.spaceMono,
    sans: FONT_STACKS.ibm,                // mono-flavoured sans
    display: FONT_STACKS.spaceMono,
    displayWeight: 700,
    displayTracking: "0.04em",            // wide-set, stenciled feel
    panelStyle: "flat",
    chrome: "ruled",
  },
};

const ACCENT_PALETTES = {
  terminal: [
    { value: "#3b82f6", soft: "rgba(59,130,246,0.12)", label: "Cobalt" },
    { value: "#22d3ee", soft: "rgba(34,211,238,0.12)", label: "Cyan" },
    { value: "#10b981", soft: "rgba(16,185,129,0.12)", label: "Emerald" },
    { value: "#f59e0b", soft: "rgba(245,158,11,0.12)", label: "Amber" },
    { value: "#a78bfa", soft: "rgba(167,139,250,0.14)", label: "Iris" },
  ],
  maritime: [
    { value: "#c69962", soft: "rgba(198,153,98,0.12)", label: "Brass" },
    { value: "#7ea8c4", soft: "rgba(126,168,196,0.12)", label: "Sea Glass" },
    { value: "#d96458", soft: "rgba(217,100,88,0.12)", label: "Pilot Red" },
    { value: "#7ab989", soft: "rgba(122,185,137,0.12)", label: "Foam" },
    { value: "#e0b14c", soft: "rgba(224,177,76,0.14)", label: "Lantern" },
  ],
  editorial: [
    { value: "#1f3a5f", soft: "rgba(31,58,95,0.08)", label: "Ink" },
    { value: "#7a3a1f", soft: "rgba(122,58,31,0.08)", label: "Rust" },
    { value: "#1f6b46", soft: "rgba(31,107,70,0.08)", label: "Forest" },
    { value: "#6b3fa0", soft: "rgba(107,63,160,0.08)", label: "Plum" },
    { value: "#a86b1f", soft: "rgba(168,107,31,0.08)", label: "Ochre" },
  ],
  sunset: [
    { value: "#fb923c", soft: "rgba(251,146,60,0.14)", label: "Amber" },
    { value: "#f43f5e", soft: "rgba(244,63,94,0.14)", label: "Coral" },
    { value: "#fde047", soft: "rgba(253,224,71,0.14)", label: "Gold" },
    { value: "#f472b6", soft: "rgba(244,114,182,0.14)", label: "Pink" },
    { value: "#84cc16", soft: "rgba(132,204,22,0.14)", label: "Lime" },
  ],
  mono: [
    { value: "#111111", soft: "rgba(17,17,17,0.06)", label: "Ink" },
  ],
  phosphor: [
    { value: "#00ff66", soft: "rgba(0,255,102,0.10)", label: "Phosphor" },
    { value: "#39ff14", soft: "rgba(57,255,20,0.10)", label: "Acid" },
    { value: "#fae600", soft: "rgba(250,230,0,0.10)", label: "Amber CRT" },
    { value: "#ff5577", soft: "rgba(255,85,119,0.10)", label: "Alarm" },
  ],
  brutalist: [
    { value: "#e63b1f", soft: "rgba(230,59,31,0.08)", label: "Vermillion" },
    { value: "#0a0a0a", soft: "rgba(10,10,10,0.06)", label: "Ink" },
    { value: "#0050a8", soft: "rgba(0,80,168,0.08)", label: "Klein Blue" },
    { value: "#e8b800", soft: "rgba(232,184,0,0.10)", label: "Hi-Vis Yellow" },
  ],
  tactical: [
    { value: "#ff7a1a", soft: "rgba(255,122,26,0.10)", label: "Safety Orange" },
    { value: "#a8c46a", soft: "rgba(168,196,106,0.10)", label: "OD Green" },
    { value: "#e0b14c", soft: "rgba(224,177,76,0.10)", label: "Caution" },
    { value: "#d44a3f", soft: "rgba(212,74,63,0.10)", label: "Threat Red" },
  ],
};

// Apply tweak overrides on top of a base theme.
function deriveTheme(presetKey, tweaks) {
  const base = THEMES[presetKey] || THEMES.terminal;
  const theme = { ...base, key: presetKey };

  // Accent override
  if (tweaks.accent && tweaks.accent !== "auto") {
    theme.accent = tweaks.accent;
    // derive softer version
    const m = /^#([0-9a-f]{6})$/i.exec(tweaks.accent);
    if (m) {
      const n = parseInt(m[1], 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      theme.accentSoft = `rgba(${r},${g},${b},0.14)`;
    }
  }

  // Font overrides
  if (tweaks.monoFont && FONT_STACKS[tweaks.monoFont]) theme.mono = FONT_STACKS[tweaks.monoFont];
  if (tweaks.sansFont && FONT_STACKS[tweaks.sansFont]) {
    theme.sans = FONT_STACKS[tweaks.sansFont];
    theme.display = FONT_STACKS[tweaks.sansFont];
  }
  if (tweaks.displayFont && FONT_STACKS[tweaks.displayFont]) theme.display = FONT_STACKS[tweaks.displayFont];

  // Numeric-display vs sans-display switch
  if (tweaks.numericStyle === "mono") theme.numericFont = theme.mono;
  else if (tweaks.numericStyle === "sans") theme.numericFont = theme.sans;
  else theme.numericFont = theme.mono;

  return theme;
}

Object.assign(window, { THEMES, ACCENT_PALETTES, FONT_STACKS, deriveTheme });
