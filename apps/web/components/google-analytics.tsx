import Script from 'next/script'
import { getGaMeasurementId, isGaAnalyticsEnabled } from '@/lib/analytics/config'

export function GoogleAnalytics() {
  const measurementId = getGaMeasurementId()

  if (!isGaAnalyticsEnabled()) {
    return null
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            send_page_view: false,
            allow_google_signals: true,
            allow_ad_personalization_signals: false
          });
        `}
      </Script>
    </>
  )
}
