/**
 * VPD aire (kPa), aprox. ecuación Magnus + presión de vapor de saturación.
 * T en °C, RH en % (0–100).
 */
export function computeVpdKpa(tempC: number, rhPct: number): number | null {
  if (!Number.isFinite(tempC) || !Number.isFinite(rhPct)) return null
  if (rhPct < 0 || rhPct > 100) return null
  const svp =
    0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3))
  const vpd = svp * (1 - rhPct / 100)
  if (!Number.isFinite(vpd) || vpd < 0) return null
  return Math.round(vpd * 1000) / 1000
}
