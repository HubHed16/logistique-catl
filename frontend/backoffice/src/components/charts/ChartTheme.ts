// Palette dupliquée depuis src/app/globals.css — recharts ne lit pas
// les CSS vars dans fill/stroke, il faut des hex littéraux.
export const CATL_COLORS = {
  primary: "#2c3e50",
  accent: "#e67e22",
  success: "#27ae60",
  info: "#3498db",
  text: "#546e7a",
  bg: "#f4f7f9",
  neutral: "#cbd5e0",
} as const;

export const EUR_FORMATTER = new Intl.NumberFormat("fr-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const EUR_FORMATTER_PRECISE = new Intl.NumberFormat("fr-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export const NUM_FORMATTER = new Intl.NumberFormat("fr-BE", {
  maximumFractionDigits: 2,
});

export const PCT_FORMATTER = new Intl.NumberFormat("fr-BE", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const CHART_MARGIN = { top: 8, right: 16, bottom: 8, left: 8 } as const;

export const AXIS_TICK = {
  fill: CATL_COLORS.text,
  fontSize: 11,
} as const;
