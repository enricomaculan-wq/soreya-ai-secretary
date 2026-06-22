"use client";

import type { NormalizedCalendarEvent, SupportedLocale } from "@soreya/shared";
import { DEMO_SCHEDULE_WORK_HOURS, getNextDemoWorkdays } from "@soreya/shared";
import { useMemo } from "react";

import { useI18n } from "@/lib/i18n";

const WORK_HOURS = DEMO_SCHEDULE_WORK_HOURS;
const SLOT_HEIGHT_REM = 2.35;
const SLOT_GAP_REM = 1 / 16;

function eventOffsetRem(rowIndex: number, minuteFraction = 0) {
  return rowIndex * (SLOT_HEIGHT_REM + SLOT_GAP_REM) + minuteFraction * SLOT_HEIGHT_REM;
}

function getEventPositionStyle(startsAt: Date, endsAt: Date) {
  const startRow = (WORK_HOURS as readonly number[]).indexOf(startsAt.getHours());
  if (startRow < 0) {
    return null;
  }

  const endHour = endsAt.getHours();
  const endRow = (WORK_HOURS as readonly number[]).indexOf(endHour);
  const topRem = eventOffsetRem(startRow, startsAt.getMinutes() / 60);
  const bottomRem =
    endRow >= 0
      ? eventOffsetRem(endRow, endsAt.getMinutes() / 60)
      : topRem + SLOT_HEIGHT_REM * 0.75;
  const heightRem = Math.max(0.5, bottomRem - topRem);

  return {
    top: `${topRem}rem`,
    height: `${heightRem}rem`,
  };
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getNextWorkdays(count: number, reference = new Date()) {
  return getNextDemoWorkdays(count, reference);
}

function eventsForDay(events: NormalizedCalendarEvent[], day: Date) {
  return events.filter((event) => isSameCalendarDay(new Date(event.startsAt), day));
}

function formatHourLabel(hour: number, localeTag: string) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat(localeTag, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function DemoPlaygroundCalendarStrip({
  compact = false,
  events,
  highlightedEventIds,
  pendingConfirmationEventIds,
  locale,
}: {
  compact?: boolean;
  events: NormalizedCalendarEvent[];
  highlightedEventIds: string[];
  pendingConfirmationEventIds: string[];
  locale: SupportedLocale;
}) {
  const { t } = useI18n();
  const localeTag = locale === "it" ? "it-IT" : "en-US";
  const workdays = useMemo(() => getNextWorkdays(5), []);
  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      const startsAt = new Date(event.startsAt);
      return workdays.some((day) => isSameCalendarDay(startsAt, day));
    });
  }, [events, workdays]);

  const pendingCount = pendingConfirmationEventIds.length;
  const confirmedCount = highlightedEventIds.length;
  const hasGridEvents = visibleEvents.length > 0;

  return (
    <section
      className={`soreya-demo-calendar-strip ${compact ? "soreya-demo-calendar-strip-compact" : ""}`}
      data-demo-tour="calendar"
    >
      <div className="soreya-demo-calendar-strip-header">
        <div>
          <h3 className="soreya-demo-calendar-strip-title">{t("demoPlayground.calendarStrip.title")}</h3>
          <p className="soreya-demo-calendar-strip-subtitle">
            {compact
              ? t("demoPlayground.calendarStrip.subtitleCompact")
              : t("demoPlayground.calendarStrip.subtitleGrid")}
          </p>
        </div>
        <div className="soreya-demo-calendar-strip-badges">
          {pendingCount > 0 ? (
            <span className="soreya-demo-calendar-strip-badge soreya-demo-calendar-strip-badge-pending">
              {t("demoPlayground.calendarStrip.pendingCount", { count: pendingCount })}
            </span>
          ) : null}
          {confirmedCount > 0 ? (
            <span className="soreya-demo-calendar-strip-badge">
              {t("demoPlayground.calendarStrip.confirmedCount", { count: confirmedCount })}
            </span>
          ) : null}
        </div>
      </div>

      {hasGridEvents ? (
        <div className="soreya-demo-calendar-grid-wrap">
          <div
            className="soreya-demo-calendar-grid"
            style={{
              gridTemplateColumns: `2.75rem repeat(${workdays.length}, minmax(0, 1fr))`,
              gridTemplateRows: `auto repeat(${WORK_HOURS.length}, var(--demo-slot-height))`,
            }}
          >
            <div className="soreya-demo-calendar-grid-corner" />
            {workdays.map((day) => {
              const isToday = isSameCalendarDay(day, new Date());
              return (
                <div
                  className={`soreya-demo-calendar-grid-dayhead ${isToday ? "soreya-demo-calendar-grid-dayhead-today" : ""}`}
                  key={day.toISOString()}
                >
                  <span className="soreya-demo-calendar-grid-dayname">
                    {new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(day)}
                  </span>
                  <span className="soreya-demo-calendar-grid-daydate">
                    {new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short" }).format(day)}
                  </span>
                </div>
              );
            })}

            {WORK_HOURS.map((hour, hourIndex) => (
              <div className="soreya-demo-calendar-grid-row" key={hour}>
                <div
                  className="soreya-demo-calendar-grid-time"
                  style={{ gridColumn: 1, gridRow: hourIndex + 2 }}
                >
                  {formatHourLabel(hour, localeTag)}
                </div>
                {workdays.map((day, dayIndex) => (
                  <div
                    className="soreya-demo-calendar-grid-cell"
                    key={`${day.toISOString()}-${hour}`}
                    style={{ gridColumn: dayIndex + 2, gridRow: hourIndex + 2 }}
                  />
                ))}
              </div>
            ))}

            {workdays.map((day, dayIndex) => {
              const dayEvents = eventsForDay(visibleEvents, day);

              return (
                <div
                  className="soreya-demo-calendar-grid-day-overlay"
                  key={`overlay-${day.toISOString()}`}
                  style={{
                    gridColumn: dayIndex + 2,
                    gridRow: `2 / ${WORK_HOURS.length + 2}`,
                  }}
                >
                  {dayEvents.map((event) => {
                    const startsAt = new Date(event.startsAt);
                    const endsAt = new Date(event.endsAt);
                    const position = getEventPositionStyle(startsAt, endsAt);
                    if (!position) {
                      return null;
                    }

                    const isPending = pendingConfirmationEventIds.includes(event.id);
                    const isJustConfirmed = highlightedEventIds.includes(event.id);
                    const timeLabel = `${new Intl.DateTimeFormat(localeTag, {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(startsAt)}–${new Intl.DateTimeFormat(localeTag, {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(endsAt)}`;

                    return (
                      <article
                        className={`soreya-demo-calendar-grid-event soreya-demo-calendar-grid-event-positioned ${
                          isPending
                            ? "soreya-demo-calendar-grid-event-pending"
                            : isJustConfirmed
                              ? "soreya-demo-calendar-grid-event-new"
                              : ""
                        }`}
                        key={event.id}
                        style={position}
                        title={event.title}
                      >
                        <p className="soreya-demo-calendar-grid-event-title">{event.title}</p>
                        <p className="soreya-demo-calendar-grid-event-time">{timeLabel}</p>
                        {isPending ? (
                          <span className="soreya-demo-calendar-grid-event-badge soreya-demo-calendar-grid-event-badge-pending">
                            {t("demoPlayground.calendarStrip.pendingShort")}
                          </span>
                        ) : isJustConfirmed ? (
                          <span className="soreya-demo-calendar-grid-event-badge">
                            {t("demoPlayground.calendarStrip.confirmedShort")}
                          </span>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="soreya-demo-calendar-strip-empty">{t("demoPlayground.calendarStrip.empty")}</p>
      )}
    </section>
  );
}
