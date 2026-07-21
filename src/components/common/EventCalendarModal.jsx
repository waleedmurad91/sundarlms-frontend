import { useState, useEffect } from "react";
import {
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  PencilLine,
  FileText,
  Users,
  Trophy,
  Umbrella,
  Megaphone,
  Loader2,
  Info,
} from "lucide-react";
import calendarEventsApi from "@/api/calendarEventsApi";

const CATEGORY_META = {
  event: {
    label: "Event",
    icon: Users,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    bannerColor: "rgb(204, 251, 241)",
    bannerTextColor: "rgb(15, 118, 110)",
    dotColor: "#0d9488",
  },
  class: {
    label: "Class",
    icon: BookOpen,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    bannerColor: "rgb(219, 234, 254)",
    bannerTextColor: "rgb(29, 78, 216)",
    dotColor: "#2563eb",
  },
  practice: {
    label: "Practice",
    icon: PencilLine,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    bannerColor: "rgb(255, 237, 213)",
    bannerTextColor: "rgb(194, 65, 12)",
    dotColor: "#ea580c",
  },
  holiday: {
    label: "Holiday",
    icon: Umbrella,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    bannerColor: "#faedd4",
    bannerTextColor: "#df961d",
    dotColor: "#d97706",
  },
  pmc: {
    label: "PMC",
    icon: Trophy,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    bannerColor: "rgb(214, 234, 220)",
    bannerTextColor: "rgb(1, 65, 28)",
    dotColor: "#15803d",
  },
  rmc: {
    label: "RMC",
    icon: Trophy,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    bannerColor: "rgb(210, 210, 235)",
    bannerTextColor: "rgb(0, 0, 128)",
    dotColor: "#4f46e5",
  },
  vss: {
    label: "VSS",
    icon: Trophy,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    bannerColor: "rgb(249, 210, 214)",
    bannerTextColor: "rgb(201, 0, 22)",
    dotColor: "#e11d48",
  },
  ilm: {
    label: "ILM",
    icon: CalendarIcon,
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-700",
    bannerColor: "#eee0c2",
    bannerTextColor: "#996d00",
    dotColor: "#a16207",
  },
  deadline: {
    label: "Deadline",
    icon: FileText,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    bannerColor: "rgb(254, 226, 226)",
    bannerTextColor: "rgb(185, 28, 28)",
    dotColor: "#b91c1c",
  },
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    bannerColor: "rgb(237, 233, 254)",
    bannerTextColor: "rgb(91, 33, 182)",
    dotColor: "#7c3aed",
  },
};

// Same order as the admin form's CATEGORY_OPTIONS — drives the legend.
const CATEGORY_ORDER = [
  "event",
  "class",
  "practice",
  "holiday",
  "pmc",
  "rmc",
  "vss",
  "ilm",
  "deadline",
  "announcement",
];

const DEFAULT_CATEGORY_META = {
  label: "Other",
  icon: CalendarIcon,
  iconBg: "bg-gray-50",
  iconColor: "text-gray-600",
  bannerColor: "rgb(229, 231, 235)",
  bannerTextColor: "rgb(55, 65, 81)",
  dotColor: "#9ca3af",
};

const getCategoryMeta = (category) =>
  CATEGORY_META[String(category ?? "").toLowerCase()] ?? DEFAULT_CATEGORY_META;

const parseApiDate = (value) => {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  return isNaN(date.getTime()) ? null : date;
};

const dateOnlyKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const formatTimeRange = (startDate, endDate) => {
  const fmt = (d) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (!startDate) return "";
  if (!endDate) return fmt(startDate);
  return `${fmt(startDate)} – ${fmt(endDate)}`;
};

const formatDateShort = (date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatDateRange = (startDate, endDate) => {
  if (!startDate) return "";
  if (!endDate || dateOnlyKey(startDate) === dateOnlyKey(endDate)) {
    return formatDateShort(startDate);
  }
  return `${formatDateShort(startDate)} – ${formatDateShort(endDate)}`;
};

const formatCategoryLabel = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Event";
  return normalized
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

// Normalizes every raw public-API event into two display-ready structures:
// - listEventsByDate: every event keyed by date (multi-day events appear on
//   each day they span). Drives the right-hand events list.
// - multiDayBars: one entry per multi-day event, with start/end date keys and
//   color, so the calendar grid can draw a single bar spanning e.g. 20→24
//   rather than a separate mark on each date.
const transformEvents = (rawEvents = []) => {
  const listEventsByDate = {};
  const multiDayBars = [];

  rawEvents.forEach((raw) => {
    const startDate = parseApiDate(raw.starts_at);
    const endDate = parseApiDate(raw.ends_at) || startDate;
    if (!startDate) return;

    const startKey = dateOnlyKey(startDate);
    const endKey = endDate ? dateOnlyKey(endDate) : startKey;
    const meta = getCategoryMeta(raw.category);
    const isMultiDay = startKey !== endKey;
    const isAllDayOrMultiDay = Boolean(raw.is_all_day) || isMultiDay;

    const entry = {
      id: raw.id,
      icon: meta.icon,
      iconBg: meta.iconBg,
      iconColor: meta.iconColor,
      title: raw.title,
      description: raw.description || "",
      timeLabel: isAllDayOrMultiDay
        ? isMultiDay
          ? formatDateRange(startDate, endDate)
          : "All day"
        : formatTimeRange(startDate, endDate),
      meetingUrl: raw.meeting_url || null,
      category: raw.category,
      categoryLabel: formatCategoryLabel(raw.category),
      categoryMeta: meta,
      startDate,
      endDate,
      isAllDay: Boolean(raw.is_all_day),
      isAllDayOrMultiDay,
      isMultiDay,
    };

    // Populate every day the event spans (multi-day → many keys, single → one)
    const cursor = new Date(startDate);
    const end = new Date(endDate);
    while (cursor <= end) {
      const key = dateOnlyKey(cursor);
      if (!listEventsByDate[key]) listEventsByDate[key] = [];
      listEventsByDate[key].push(entry);
      cursor.setDate(cursor.getDate() + 1);
    }

    // Multi-day events get ONE spanning bar (start → end) instead of a mark
    // per date, so they visually connect across the days they cover.
    if (isMultiDay) {
      multiDayBars.push({
        id: raw.id,
        label: raw.title,
        start: startKey,
        end: endKey,
        color: meta.bannerColor,
        textColor: meta.bannerTextColor,
      });
    }
  });

  return { listEventsByDate, multiDayBars };
};

const parseDateKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const daysBetween = (a, b) => Math.round((b - a) / (1000 * 60 * 60 * 24));

// Greedy interval-stacking so overlapping spanning bars in the same week
// don't visually collide; each returned "row" is a list of non-overlapping
// bars.
const stackBars = (bars) => {
  const rows = [];
  bars
    .slice()
    .sort((a, b) => a.colStart - b.colStart)
    .forEach((bar) => {
      const row = rows.find((r) =>
        r.every(
          (b) =>
            bar.colStart >= b.colStart + b.colSpan ||
            bar.colStart + bar.colSpan <= b.colStart,
        ),
      );
      if (row) row.push(bar);
      else rows.push([bar]);
    });
  return rows;
};

const WEEKDAYS = [
  { full: "Sun", short: "S" },
  { full: "Mon", short: "M" },
  { full: "Tue", short: "T" },
  { full: "Wed", short: "W" },
  { full: "Thu", short: "T" },
  { full: "Fri", short: "F" },
  { full: "Sat", short: "S" },
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const fmtKey = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const fmtHeading = (y, m, d) => {
  const date = new Date(y, m, d);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return `${weekday}, ${d} ${MONTH_NAMES[m]} ${y}`;
};

// Small nested modal for events with no meeting_url — shows the full event
// details on top of the main calendar modal.
const EventDetailsModal = ({ event, onClose }) => {
  if (!event) return null;
  const Icon = event.icon;
  const meta = event.categoryMeta;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
          <div
            className={[
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
              event.iconBg,
              event.iconColor,
            ].join(" ")}
          >
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-base font-bold leading-tight text-gray-900">
              {event.title}
            </h3>
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: meta.bannerColor,
                color: meta.bannerTextColor,
              }}
            >
              {event.categoryLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 cursor-pointer rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="flex items-center gap-2 text-sm text-gray-700">
            <CalendarIcon size={15} className="text-gray-400" />
            {event.timeLabel}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {event.description || "No description provided for this event."}
          </p>
        </div>

        <div className="border-t border-gray-100 px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const EventCalendarModal = ({ onClose, initialDate = new Date() }) => {
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selected, setSelected] = useState({
    y: initialDate.getFullYear(),
    m: initialDate.getMonth(),
    d: initialDate.getDate(),
  });
  const [allEventsMode, setAllEventsMode] = useState(false);
  const [detailEvent, setDetailEvent] = useState(null);

  const [listEventsByDate, setListEventsByDate] = useState({});
  const [multiDayBars, setMultiDayBars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date();

  useEffect(() => {
    let isMounted = true;
    const fetchMonthEvents = async () => {
      setLoading(true);
      setError("");
      try {
        const month = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
        const response = await calendarEventsApi.getPublicEvents({ month });
        if (!isMounted) return;

        const rawEvents = Array.isArray(response?.data) ? response.data : [];
        const { listEventsByDate: byDate, multiDayBars: bars } =
          transformEvents(rawEvents);

        setListEventsByDate(byDate);
        setMultiDayBars(bars);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load calendar events.",
        );
        setListEventsByDate({});
        setMultiDayBars([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMonthEvents();
    return () => {
      isMounted = false;
    };
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const buildGrid = () => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    for (let i = 0; i < startOffset; i++) {
      const d = daysInPrevMonth - startOffset + 1 + i;
      cells.push({ day: d, inMonth: false, y: viewYear, m: viewMonth - 1 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, inMonth: true, y: viewYear, m: viewMonth });
    }
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        day: nextDay++,
        inMonth: false,
        y: viewYear,
        m: viewMonth + 1,
      });
    }
    return cells;
  };

  const cells = buildGrid();
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const isToday = (y, m, d) =>
    y === today.getFullYear() &&
    m === today.getMonth() &&
    d === today.getDate();

  const isSelected = (y, m, d) =>
    y === selected.y && m === selected.m && d === selected.d;

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const selectedDateObj = new Date(selected.y, selected.m, selected.d);
  const isSelectedPast = selectedDateObj < startOfToday;
  const selectedKey = fmtKey(selected.y, selected.m, selected.d);
  const selectedHasEvent = Boolean(listEventsByDate[selectedKey]?.length);

  const showPastEmptyMessage =
    !allEventsMode && isSelectedPast && !selectedHasEvent && !loading;

  const visibleKeys = allEventsMode
    ? Object.keys(listEventsByDate).sort()
    : selectedHasEvent
      ? [selectedKey]
      : [];

  const handleFooterButtonClick = () => {
    setAllEventsMode((prev) => !prev);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-full flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[92vh] sm:max-w-[640px] sm:rounded-2xl md:max-w-[820px] lg:max-w-[1020px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-start gap-3 border-b border-gray-100 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#9b1c1c] sm:h-12 sm:w-12">
            <CalendarIcon size={18} className="sm:hidden" />
            <CalendarIcon size={22} className="hidden sm:block" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-base font-bold leading-tight text-gray-900 sm:text-xl">
              Event Calendar
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 sm:mt-1 sm:text-sm">
              See your upcoming classes, quizzes and events.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 cursor-pointer rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <X size={20} className="sm:hidden" />
            <X size={22} className="hidden sm:block" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* LEFT: Calendar */}
          <div className="flex-shrink-0 border-b border-gray-100 px-5 py-5 sm:px-6 sm:py-6 md:w-[48%] md:overflow-y-auto md:border-b-0 md:border-r lg:w-[46%] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={goPrevMonth}
                aria-label="Previous month"
                className="cursor-pointer rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                disabled={loading}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
                {MONTH_NAMES[viewMonth]} {viewYear}
                {loading && (
                  <Loader2 size={15} className="animate-spin text-gray-400" />
                )}
              </span>
              <button
                type="button"
                onClick={goNextMonth}
                aria-label="Next month"
                className="cursor-pointer rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                disabled={loading}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}

            {/* Table-style grid with visible borders, like the reference screenshot */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              {/* Weekday header row */}
              <div className="grid grid-cols-7 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50/60">
                {WEEKDAYS.map((w, i) => (
                  <span
                    key={w.full + i}
                    className="py-2 text-center text-xs font-medium text-gray-400 sm:py-2.5 sm:text-sm"
                  >
                    <span className="inline sm:hidden">{w.short}</span>
                    <span className="hidden sm:inline">{w.full}</span>
                  </span>
                ))}
              </div>

              {/* Date cells, grouped by week */}
              <div>
                {weeks.map((week, wi) => {
                  const weekStart = new Date(week[0].y, week[0].m, week[0].day);
                  const weekEnd = new Date(week[6].y, week[6].m, week[6].day);

                  // Collect multi-day bars that overlap this week and
                  // compute their column span within the 7-col grid.
                  const overlapping = multiDayBars
                    .map((b) => {
                      const s = parseDateKey(b.start);
                      const e = parseDateKey(b.end);
                      return { b, s, e };
                    })
                    .filter(({ s, e }) => e >= weekStart && s <= weekEnd)
                    .map(({ b, s, e }) => {
                      const clippedStart = s < weekStart ? weekStart : s;
                      const clippedEnd = e > weekEnd ? weekEnd : e;
                      const colStart = daysBetween(weekStart, clippedStart);
                      const colSpan = daysBetween(clippedStart, clippedEnd) + 1;
                      return { event: b, colStart, colSpan };
                    });

                  const barRows = stackBars(overlapping);

                  return (
                    <div
                      key={wi}
                      className={
                        wi < weeks.length - 1 ? "border-b border-gray-200" : ""
                      }
                    >
                      {/* 7-day row: number + up to 3 category dots per day */}
                      <div className="grid grid-cols-7 divide-x divide-gray-200">
                        {week.map((cell, ci) => {
                          const y = cell.y;
                          const m = cell.m;
                          const todayCell = isToday(y, m, cell.day);
                          const selectedCell = isSelected(y, m, cell.day);
                          const cellEvents = cell.inMonth
                            ? listEventsByDate[fmtKey(y, m, cell.day)]
                            : null;

                          // Multi-day events already get their own spanning
                          // bar below the grid — only single-day events get
                          // a dot directly under the date number.
                          const singleDayEvents = (cellEvents ?? []).filter(
                            (ev) => !ev.isMultiDay,
                          );
                          const dotColors = [
                            ...new Set(
                              singleDayEvents.map(
                                (ev) => ev.categoryMeta.dotColor,
                              ),
                            ),
                          ].slice(0, 3);

                          return (
                            <div
                              key={ci}
                              className={[
                                "flex flex-col items-center gap-1 py-2 transition-colors",
                                selectedCell && !todayCell
                                  ? "rounded-xl bg-emerald-50 ring-1 ring-emerald-300"
                                  : "",
                              ].join(" ")}
                            >
                              <button
                                type="button"
                                disabled={!cell.inMonth}
                                onClick={() =>
                                  cell.inMonth &&
                                  (setSelected({ y, m, d: cell.day }),
                                  setAllEventsMode(false))
                                }
                                className={[
                                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm transition-colors sm:h-9 sm:w-9",
                                  !cell.inMonth
                                    ? "cursor-default text-gray-300"
                                    : "cursor-pointer text-gray-800",
                                  todayCell
                                    ? "bg-[#9b1c1c] font-bold text-white"
                                    : selectedCell
                                      ? "font-bold text-emerald-700"
                                      : "",
                                ].join(" ")}
                              >
                                {cell.day}
                              </button>

                              {/* Category dots — one per distinct event
                                  category on that date, up to 3 */}
                              <div className="flex h-[6px] items-center gap-1">
                                {dotColors.map((color) => (
                                  <span
                                    key={color}
                                    className="h-[6px] w-[6px] rounded-full"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Multi-day spanning bars: a single pill that
                          visually stretches from the event's start date
                          column to its end date column across the grid.
                          A bar starting on the selected date gets a matching
                          green ring so it reads as connected to the
                          highlighted day above it. */}
                      {barRows.map((row, ri) => (
                        <div
                          key={ri}
                          className="grid grid-cols-7 gap-x-1 px-1 pb-1.5"
                        >
                          {row.map((bar, bi) => {
                            const startsOnSelectedDay =
                              bar.event.start === selectedKey;
                            return (
                              <div
                                key={bar.event.id ?? bi}
                                style={{
                                  gridColumn: `${bar.colStart + 1} / span ${bar.colSpan}`,
                                  backgroundColor: bar.event.color,
                                  color: bar.event.textColor,
                                }}
                                className={[
                                  "flex items-center gap-1 justify-center overflow-hidden rounded-full px-2 py-1 text-[10px] font-semibold sm:text-[11px]",
                                  startsOnSelectedDay
                                    ? "ring-1 ring-emerald-300"
                                    : "",
                                ].join(" ")}
                                title={bar.event.label}
                              >
                                <span className="truncate">
                                  {bar.event.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-gray-600 sm:grid-cols-2 sm:text-xs">
              {CATEGORY_ORDER.map((key) => (
                <span key={key} className="flex items-center gap-1.5 sm:gap-2">
                  <span
                    className="h-[8px] w-[8px] flex-shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_META[key].dotColor }}
                  />
                  {CATEGORY_META[key].label}
                </span>
              ))}
              <span className="flex items-center gap-1.5 sm:gap-2">
                <span className="h-[8px] w-[8px] flex-shrink-0 rounded-full bg-gray-300" />
                No Event
              </span>
            </div>
          </div>

          {/* RIGHT: Events list */}
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6 md:overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {allEventsMode && (
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 sm:text-[15px]">
                  All Events — {MONTH_NAMES[viewMonth]} {viewYear}
                </h3>
                <button
                  type="button"
                  onClick={() => setAllEventsMode(false)}
                  className="cursor-pointer text-xs font-semibold text-[#9b1c1c] hover:underline"
                >
                  Back to selected day
                </button>
              </div>
            )}
            {!allEventsMode && (
              <h3 className="mb-3 text-sm font-bold text-gray-900 sm:text-[15px]">
                {fmtHeading(selected.y, selected.m, selected.d)}
              </h3>
            )}

            {loading && visibleKeys.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                Loading events...
              </div>
            )}
            {!loading && !allEventsMode && showPastEmptyMessage && (
              <p className="text-sm text-gray-500">
                This date has already passed with no recorded events.
              </p>
            )}
            {!loading &&
              !allEventsMode &&
              visibleKeys.length === 0 &&
              !showPastEmptyMessage && (
                <p className="text-sm text-gray-500">No upcoming events.</p>
              )}
            {!loading && allEventsMode && visibleKeys.length === 0 && (
              <p className="text-sm text-gray-500">
                No events scheduled this month.
              </p>
            )}
            {visibleKeys.map((key) => {
              const [y, m, d] = key.split("-").map(Number);
              return (
                <div key={key} className="mb-4 last:mb-0 sm:mb-5">
                  {allEventsMode && (
                    <h3 className="mb-2 text-sm font-bold text-gray-900 sm:mb-3 sm:text-[15px]">
                      {fmtHeading(y, m - 1, d)}
                    </h3>
                  )}
                  <div className="space-y-2.5 sm:space-y-3">
                    {listEventsByDate[key].map((ev) => {
                      const Icon = ev.icon;
                      // Buttons are only actionable on the day the event
                      // actually falls on — disable them for any other date
                      // (e.g. past events surfaced in "View Full Calendar").
                      const isTodayEvent =
                        ev.startDate &&
                        dateOnlyKey(ev.startDate) === dateOnlyKey(today);
                      // An event is "ended" once its last moment is behind
                      // the current time. Events with real times (even
                      // multi-day ones) compare against their actual end
                      // time (or start time if no end is set) — so an event
                      // ending today at 10:35 shows as ended at 10:36.
                      // True all-day events only end once their final day is
                      // fully over.
                      const lastMoment = ev.endDate || ev.startDate;
                      const isPastEvent =
                        lastMoment &&
                        (ev.isAllDay
                          ? new Date(
                              lastMoment.getFullYear(),
                              lastMoment.getMonth(),
                              lastMoment.getDate() + 1,
                            ) <= new Date()
                          : lastMoment < new Date());
                      return (
                        <div
                          key={ev.id}
                          className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3 sm:p-3.5 lg:flex-row lg:items-center"
                        >
                          <div className="flex flex-1 items-center gap-2.5 sm:gap-3">
                            <div
                              className={[
                                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11",
                                ev.iconBg,
                                ev.iconColor,
                              ].join(" ")}
                            >
                              <Icon size={16} className="sm:hidden" />
                              <Icon size={20} className="hidden sm:block" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold leading-tight text-gray-900 sm:text-[15px]">
                                  {ev.title}
                                </h4>
                                {ev.isMultiDay && (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    Multi-day Event
                                  </span>
                                )}
                                {isPastEvent && (
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                                    Ended
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs leading-tight text-gray-600 sm:mt-1 sm:text-sm">
                                {ev.timeLabel}
                              </p>
                              <p className="mt-0.5 text-xs leading-tight text-gray-400 sm:text-sm">
                                {ev.categoryLabel}
                              </p>
                            </div>
                          </div>
                          {isPastEvent ? (
                            <p className="flex h-9 w-full flex-shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-gray-50 px-3 text-xs font-semibold text-gray-500 sm:h-10 sm:text-sm lg:w-auto lg:self-center">
                              This event has ended
                            </p>
                          ) : ev.meetingUrl ? (
                            <button
                              type="button"
                              disabled={!isTodayEvent}
                              onClick={() =>
                                isTodayEvent &&
                                window.open(
                                  ev.meetingUrl,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                              className={[
                                "flex h-9 w-full flex-shrink-0 items-center justify-center whitespace-nowrap rounded-lg border text-xs font-semibold transition-colors sm:h-10 sm:text-sm lg:w-[132px] lg:self-center",
                                isTodayEvent
                                  ? "cursor-pointer border-[#9b1c1c] bg-white text-[#9b1c1c] hover:bg-[#9b1c1c] hover:text-white"
                                  : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400",
                              ].join(" ")}
                            >
                              Join Class
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDetailEvent(ev)}
                              className="flex h-9 w-full flex-shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:h-10 sm:text-sm lg:w-[132px] lg:self-center"
                            >
                              <Info size={14} />
                              View Details
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <button
          type="button"
          onClick={handleFooterButtonClick}
          className="flex flex-shrink-0 cursor-pointer items-center justify-center gap-2 border-t border-gray-100 bg-gray-50 py-3 text-xs font-semibold text-[#9b1c1c] hover:bg-gray-100 sm:py-4 sm:text-sm"
        >
          {allEventsMode ? (
            <>
              <ChevronLeft size={16} className="sm:hidden" />
              <ChevronLeft size={17} className="hidden sm:block" />
              View {formatDateShort(selectedDateObj)} Details
            </>
          ) : (
            <>
              <CalendarIcon size={16} className="sm:hidden" />
              <CalendarIcon size={17} className="hidden sm:block" />
              View Full Calendar
            </>
          )}
        </button>
      </div>

      <EventDetailsModal
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
      />
    </div>
  );
};

export default EventCalendarModal;
