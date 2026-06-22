"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";

const TOUR_SEEN_KEY = "soreya-demo-tour-seen";

const STEPS = ["compose", "analysis", "approvals"] as const;

export function DemoPresentationTour({ enabled }: { enabled: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    if (window.localStorage.getItem(TOUR_SEEN_KEY) === "1") {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  if (!open) {
    return null;
  }

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  function closeTour() {
    window.localStorage.setItem(TOUR_SEEN_KEY, "1");
    setOpen(false);
  }

  function handleNext() {
    if (isLast) {
      closeTour();
      return;
    }

    setStepIndex((current) => current + 1);
  }

  return (
    <div className="soreya-demo-tour-backdrop">
      <div className="soreya-demo-tour-card" role="dialog">
        <p className="soreya-demo-tour-eyebrow">
          {t("demoTour.stepCounter", { current: stepIndex + 1, total: STEPS.length })}
        </p>
        <h3 className="soreya-demo-tour-title">{t(`demoTour.steps.${step}.title`)}</h3>
        <p className="soreya-demo-tour-body">{t(`demoTour.steps.${step}.body`)}</p>
        <div className="soreya-demo-tour-actions">
          <button className="soreya-btn-secondary px-4 py-2 text-sm" onClick={closeTour} type="button">
            {t("demoTour.skip")}
          </button>
          <button className="soreya-btn-primary px-4 py-2 text-sm" onClick={handleNext} type="button">
            {isLast ? t("demoTour.finish") : t("demoTour.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
