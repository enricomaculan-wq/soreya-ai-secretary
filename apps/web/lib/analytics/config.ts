export function getGaMeasurementId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || ''
}

export function isGaAnalyticsEnabled() {
  return /^G-[A-Z0-9]+$/i.test(getGaMeasurementId())
}
