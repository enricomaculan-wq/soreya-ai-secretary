export type AnalyticsEventParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export function trackAnalyticsEvent(eventName: string, params?: AnalyticsEventParams) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return false
  }

  window.gtag('event', eventName, params ?? {})
  return true
}

export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return false
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
  })
  return true
}
