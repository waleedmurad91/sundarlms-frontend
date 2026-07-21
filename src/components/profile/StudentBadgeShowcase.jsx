// import React from "react";
// import { AlertCircleIcon, Loader2, Lock } from "lucide-react";
// import { Alert, AlertTitle } from "@/components/ui/alert";
// import { getBadgesShowcase } from "@/api/badgesApi";
// import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
// import {
//   BADGE_SUMMARY_ORDER,
//   resolveBadgeCount,
//   resolveBadgeIcon,
//   resolveBadgeLabel,
// } from "@/utils/studentBadgeConfig";

// const DEFAULT_SHOWCASE = {
//   top_strip: {
//     total_points: 0,
//     badge_counts: {},
//   },
//   badge_tabs: [],
//   sections: [],
// };

// const BADGE_SECTION_COPY = {
//   level_badges: "Level badges mark milestones in your learning journey.",
//   skills_badges:
//     "Skills badges are special awards for completing topic challenges.",
//   mastery_badges:
//     "Mastery badges celebrate strong and consistent performance milestones.",
//   course_completion_badge:
//     "Course completion badges unlock when a full course path is completed.",
//   course_mastery_badges:
//     "Course mastery badges reward high mastery across complete courses.",
//   practice_badges:
//     "Practice badges are earned from topic practice progress and accuracy.",
//   class_topper_badges:
//     "Class topper badges highlight your ranking achievements in class.",
// };

// const toArray = (value) => (Array.isArray(value) ? value : []);

// const toSafeNumber = (value, fallback = 0) => {
//   const parsedValue = Number(value ?? fallback);
//   return Number.isFinite(parsedValue) ? parsedValue : fallback;
// };

// const normalizeShowcasePayload = (payload) => {
//   const data = payload?.data ?? payload ?? {};
//   const topStrip = data?.top_strip ?? {};

//   return {
//     top_strip: {
//       total_points: toSafeNumber(topStrip?.total_points),
//       badge_counts:
//         topStrip?.badge_counts && typeof topStrip.badge_counts === "object"
//           ? topStrip.badge_counts
//           : {},
//     },
//     badge_tabs: toArray(data?.badge_tabs),
//     sections: toArray(data?.sections),
//   };
// };

// const resolveTabCount = (tab, badgeCounts) => {
//   const tabCount = Number(tab?.count);
//   if (Number.isFinite(tabCount)) return tabCount;
//   return resolveBadgeCount(badgeCounts, tab?.key);
// };

// const resolveCardIcon = (card, badgeKey) => {
//   if (card?.icon_path) {
//     return buildBackendFileUrl(card.icon_path);
//   }

//   return resolveBadgeIcon(badgeKey);
// };

// const StudentBadgeShowcase = () => {
//   const [showcase, setShowcase] = React.useState(DEFAULT_SHOWCASE);
//   const [activeTabKey, setActiveTabKey] = React.useState(
//     BADGE_SUMMARY_ORDER[0],
//   );
//   const [loading, setLoading] = React.useState(true);
//   const [error, setError] = React.useState("");

//   const loadShowcase = React.useCallback(async () => {
//     try {
//       setLoading(true);
//       setError("");
//       const response = await getBadgesShowcase();
//       const normalized = normalizeShowcasePayload(response);
//       setShowcase(normalized);

//       const firstTabKey =
//         normalized.badge_tabs[0]?.key ??
//         normalized.sections[0]?.key ??
//         BADGE_SUMMARY_ORDER[0];
//       setActiveTabKey((previousKey) => previousKey || firstTabKey);
//     } catch (err) {
//       setError(err?.message || "Failed to fetch badge showcase.");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   React.useEffect(() => {
//     loadShowcase();
//   }, [loadShowcase]);

//   const badgeTabs = React.useMemo(() => {
//     if (showcase.badge_tabs.length > 0) {
//       return showcase.badge_tabs.map((tab) => ({
//         ...tab,
//         key: tab?.key ?? "",
//         title: tab?.title ?? resolveBadgeLabel(tab?.key, "Badges"),
//         count: resolveTabCount(tab, showcase.top_strip.badge_counts),
//         total: toSafeNumber(tab?.total),
//       }));
//     }

//     return BADGE_SUMMARY_ORDER.map((badgeKey) => ({
//       key: badgeKey,
//       title: resolveBadgeLabel(badgeKey),
//       count: resolveBadgeCount(showcase.top_strip.badge_counts, badgeKey),
//       total: 0,
//     }));
//   }, [showcase.badge_tabs, showcase.top_strip.badge_counts]);

//   React.useEffect(() => {
//     if (!badgeTabs.length) return;
//     const hasActiveTab = badgeTabs.some((tab) => tab.key === activeTabKey);
//     if (!hasActiveTab) {
//       setActiveTabKey(badgeTabs[0].key);
//     }
//   }, [badgeTabs, activeTabKey]);

//   const activeSection = React.useMemo(
//     () =>
//       showcase.sections.find((section) => section?.key === activeTabKey) ??
//       showcase.sections[0] ??
//       null,
//     [showcase.sections, activeTabKey],
//   );

//   const sectionCards = toArray(activeSection?.cards);
//   const sectionKey = activeSection?.key ?? activeTabKey;
//   const sectionTitle =
//     activeSection?.title ??
//     badgeTabs.find((tab) => tab.key === activeTabKey)?.title ??
//     resolveBadgeLabel(sectionKey, "Badges");
//   const sectionDescription =
//     BADGE_SECTION_COPY[sectionKey] ??
//     `${sectionTitle} are special awards that celebrate your progress.`;

//   return (
//     <>
//       <div className="dashboard-header">
//         <div className="dh-left">
//           <h4>My Account</h4>
//           <h1>Badges</h1>
//         </div>
//       </div>

//       {error ? (
//         <Alert variant="destructive" className="alert-custom mb-4 bg-[#FDF7EC]">
//           <AlertCircleIcon size={18} />
//           <AlertTitle className="mr-2">{error}</AlertTitle>
//           <button
//             type="button"
//             onClick={loadShowcase}
//             className="text-sm font-semibold underline"
//           >
//             Retry
//           </button>
//         </Alert>
//       ) : null}

//       {loading ? (
//         <div className="flex h-44 items-center justify-center rounded-xl border border-slate-200">
//           <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
//         </div>
//       ) : (
//         <>
//           <div className="dashboard-body dashboard-body-card !mb-4">
//             <div className="">
//               <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
//                 {badgeTabs.map((tab) => {
//                   const isActive = tab.key === activeTabKey;
//                   return (
//                     <button
//                       key={tab.key}
//                       type="button"
//                       onClick={() => setActiveTabKey(tab.key)}
//                       className={`flex h-full flex-col items-center rounded-lg border px-3 py-3 text-center transition cursor-pointer ${
//                         isActive
//                           ? "border-[#AD474B] bg-white shadow-sm"
//                           : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
//                       }`}
//                     >
//                       <img
//                         src={resolveBadgeIcon(tab.key)}
//                         alt={tab.title}
//                         className="h-16 w-16 object-scale-down rounded-full"
//                       />
//                       <span className="mt-2 text-sm font-semibold text-slate-800">
//                         {tab.title}
//                       </span>
//                       {/* <span className="text-xs text-slate-500">
//                         {tab.count}
//                         {tab.total > 0 ? ` / ${tab.total}` : ""}
//                       </span> */}
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           <div className="dashboard-body dashboard-body-card">
//             <div className="space-y-6">
//               {/* <div>
//             <h2 className="text-3xl font-semibold text-slate-900">Badges</h2>
//             <p className="text-sm text-slate-500">
//               Total Points:{" "}
//               <span className="font-semibold text-slate-800">
//                 {showcase.top_strip.total_points}
//               </span>
//             </p>
//           </div> */}

//               <>
//                 <div>
//                   <h3 className="text-2xl font-semibold text-slate-900">
//                     {sectionTitle}
//                   </h3>
//                   <p className="mt-1 text-base text-slate-600">
//                     {sectionDescription}
//                   </p>
//                 </div>

//                 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
//                   {sectionCards.length === 0 ? (
//                     <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
//                       No badges are available in this section yet.
//                     </div>
//                   ) : (
//                     sectionCards.map((card, index) => {
//                       const isEarned = Boolean(card?.is_earned ?? card?.earned);
//                       const cardTitle = card?.title ?? card?.name ?? "Badge";
//                       const cardSubtitle =
//                         card?.description ??
//                         card?.how_to_get ??
//                         card?.subtitle ??
//                         "Complete required milestones to unlock this badge.";
//                       const iconSrc = resolveCardIcon(card, sectionKey);

//                       return (
//                         <article
//                           key={card?.id ?? `${sectionKey}-${index}`}
//                           className={`rounded-xl border p-4 ${
//                             isEarned
//                               ? "border-emerald-200 bg-white"
//                               : "border-slate-200 bg-slate-50"
//                           }`}
//                         >
//                           <div className="flex items-center gap-3">
//                             <div
//                               className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border p-1 ${
//                                 isEarned
//                                   ? "border-emerald-200"
//                                   : "border-slate-200"
//                               }`}
//                             >
//                               {isEarned ? (
//                                 <img
//                                   src={iconSrc}
//                                   alt={cardTitle}
//                                   className="h-full w-full rounded-full object-contain"
//                                 />
//                               ) : (
//                                 <Lock
//                                   aria-hidden="true"
//                                   className="h-5 w-5 text-slate-500"
//                                 />
//                               )}
//                             </div>
//                             <div>
//                               <h4 className="text-[18px] font-medium leading-7 text-slate-700">
//                                 {cardTitle}
//                               </h4>
//                               <p className="mt-2 text-sm italic leading-5 text-slate-600">
//                                 {cardSubtitle}
//                               </p>
//                             </div>
//                           </div>
//                           {/* <span
//                             className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
//                               isEarned
//                                 ? "bg-emerald-100 text-emerald-700"
//                                 : "bg-slate-200 text-slate-600"
//                             }`}
//                           >
//                             {isEarned ? "Earned" : "Locked"}
//                           </span> */}
//                         </article>
//                       );
//                     })
//                   )}
//                 </div>
//               </>
//             </div>
//           </div>
//         </>
//       )}
//     </>
//   );
// };

// export default StudentBadgeShowcase;


import React from "react";
import { AlertCircleIcon, Loader2, Lock } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { getBadgesShowcase } from "@/api/badgesApi";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import {
  BADGE_SUMMARY_ORDER,
  resolveBadgeCount,
  resolveBadgeIcon,
  resolveBadgeLabel,
} from "@/utils/studentBadgeConfig";

const DEFAULT_SHOWCASE = {
  top_strip: {
    total_points: 0,
    badge_counts: {},
  },
  badge_tabs: [],
  sections: [],
};

const BADGE_SECTION_COPY = {
  level_badges: "Level badges mark milestones in your learning journey.",
  skills_badges:
    "Skills badges are special awards for completing topic challenges.",
  mastery_badges:
    "Mastery badges celebrate strong and consistent performance milestones.",
  course_completion_badge:
    "Course completion badges unlock when a full course path is completed.",
  course_mastery_badges:
    "Course mastery badges reward high mastery across complete courses.",
  practice_badges:
    "Practice badges are earned from topic practice progress and accuracy.",
  class_topper_badges:
    "Class topper badges highlight your ranking achievements in class.",
};

// Number of badge cards to show per page
const CARDS_PER_PAGE = 12;

const toArray = (value) => (Array.isArray(value) ? value : []);

const toSafeNumber = (value, fallback = 0) => {
  const parsedValue = Number(value ?? fallback);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const normalizeShowcasePayload = (payload) => {
  const data = payload?.data ?? payload ?? {};
  const topStrip = data?.top_strip ?? {};

  return {
    top_strip: {
      total_points: toSafeNumber(topStrip?.total_points),
      badge_counts:
        topStrip?.badge_counts && typeof topStrip.badge_counts === "object"
          ? topStrip.badge_counts
          : {},
    },
    badge_tabs: toArray(data?.badge_tabs),
    sections: toArray(data?.sections),
  };
};

const resolveTabCount = (tab, badgeCounts) => {
  const tabCount = Number(tab?.count);
  if (Number.isFinite(tabCount)) return tabCount;
  return resolveBadgeCount(badgeCounts, tab?.key);
};

const resolveCardIcon = (card, badgeKey) => {
  if (card?.icon_path) {
    return buildBackendFileUrl(card.icon_path);
  }

  return resolveBadgeIcon(badgeKey);
};

const StudentBadgeShowcase = () => {
  const [showcase, setShowcase] = React.useState(DEFAULT_SHOWCASE);
  const [activeTabKey, setActiveTabKey] = React.useState(
    BADGE_SUMMARY_ORDER[0],
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  // Current page for the active section's badge cards (1-indexed)
  const [currentPage, setCurrentPage] = React.useState(1);

  const loadShowcase = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getBadgesShowcase();
      const normalized = normalizeShowcasePayload(response);
      setShowcase(normalized);

      const firstTabKey =
        normalized.badge_tabs[0]?.key ??
        normalized.sections[0]?.key ??
        BADGE_SUMMARY_ORDER[0];
      setActiveTabKey((previousKey) => previousKey || firstTabKey);
    } catch (err) {
      setError(err?.message || "Failed to fetch badge showcase.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadShowcase();
  }, [loadShowcase]);

  const badgeTabs = React.useMemo(() => {
    if (showcase.badge_tabs.length > 0) {
      return showcase.badge_tabs.map((tab) => ({
        ...tab,
        key: tab?.key ?? "",
        title: tab?.title ?? resolveBadgeLabel(tab?.key, "Badges"),
        count: resolveTabCount(tab, showcase.top_strip.badge_counts),
        total: toSafeNumber(tab?.total),
      }));
    }

    return BADGE_SUMMARY_ORDER.map((badgeKey) => ({
      key: badgeKey,
      title: resolveBadgeLabel(badgeKey),
      count: resolveBadgeCount(showcase.top_strip.badge_counts, badgeKey),
      total: 0,
    }));
  }, [showcase.badge_tabs, showcase.top_strip.badge_counts]);

  React.useEffect(() => {
    if (!badgeTabs.length) return;
    const hasActiveTab = badgeTabs.some((tab) => tab.key === activeTabKey);
    if (!hasActiveTab) {
      setActiveTabKey(badgeTabs[0].key);
    }
  }, [badgeTabs, activeTabKey]);

  // Reset to page 1 whenever the active tab/section changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTabKey]);

  const activeSection = React.useMemo(
    () =>
      showcase.sections.find((section) => section?.key === activeTabKey) ??
      showcase.sections[0] ??
      null,
    [showcase.sections, activeTabKey],
  );

  const sectionCards = toArray(activeSection?.cards);
  const sectionKey = activeSection?.key ?? activeTabKey;
  const sectionTitle =
    activeSection?.title ??
    badgeTabs.find((tab) => tab.key === activeTabKey)?.title ??
    resolveBadgeLabel(sectionKey, "Badges");
  const sectionDescription =
    BADGE_SECTION_COPY[sectionKey] ??
    `${sectionTitle} are special awards that celebrate your progress.`;

  // Pagination calculations for the current section's cards
  const totalPages = Math.max(
    1,
    Math.ceil(sectionCards.length / CARDS_PER_PAGE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCards = sectionCards.slice(
    (safeCurrentPage - 1) * CARDS_PER_PAGE,
    safeCurrentPage * CARDS_PER_PAGE,
  );

  const goToPage = (page) => {
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clampedPage);
  };

  // Build a compact list of page numbers with ellipsis for large page counts
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }

    pages.push(1);
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);

    if (start > 2) pages.push("ellipsis-start");
    for (let i = start; i <= end; i += 1) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis-end");
    pages.push(totalPages);

    return pages;
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4 className="text-xs sm:text-sm">My Account</h4>
          <h1 className="text-xl sm:text-2xl md:text-3xl">Badges</h1>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="alert-custom mb-4 bg-[#FDF7EC]">
          <AlertCircleIcon size={18} />
          <AlertTitle className="mr-2">{error}</AlertTitle>
          <button
            type="button"
            onClick={loadShowcase}
            className="text-sm font-semibold underline"
          >
            Retry
          </button>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex h-44 items-center justify-center rounded-xl border border-slate-200">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <>
          <div className="dashboard-body dashboard-body-card !mb-4">
            <div className="">
              <div className="grid grid-cols-2 gap-2 xs:grid-cols-3 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-7">
                {badgeTabs.map((tab) => {
                  const isActive = tab.key === activeTabKey;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTabKey(tab.key)}
                      className={`flex h-full flex-col items-center rounded-lg border px-2 py-2.5 text-center transition cursor-pointer sm:px-3 sm:py-3 ${
                        isActive
                          ? "border-[#AD474B] bg-white shadow-sm"
                          : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
                      }`}
                    >
                      <img
                        src={resolveBadgeIcon(tab.key)}
                        alt={tab.title}
                        className="h-12 w-12 object-scale-down rounded-full sm:h-16 sm:w-16"
                      />
                      <span className="mt-2 text-xs font-semibold text-slate-800 sm:text-sm">
                        {tab.title}
                      </span>
                      {/* <span className="text-xs text-slate-500">
                        {tab.count}
                        {tab.total > 0 ? ` / ${tab.total}` : ""}
                      </span> */}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="dashboard-body dashboard-body-card">
            <div className="space-y-6">
              {/* <div>
            <h2 className="text-3xl font-semibold text-slate-900">Badges</h2>
            <p className="text-sm text-slate-500">
              Total Points:{" "}
              <span className="font-semibold text-slate-800">
                {showcase.top_strip.total_points}
              </span>
            </p>
          </div> */}

              <>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 sm:text-xl md:text-2xl">
                    {sectionTitle}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 sm:text-base">
                    {sectionDescription}
                  </p>
                </div>

                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sectionCards.length === 0 ? (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 sm:p-6">
                      No badges are available in this section yet.
                    </div>
                  ) : (
                    paginatedCards.map((card, index) => {
                      const isEarned = Boolean(card?.is_earned ?? card?.earned);
                      const cardTitle = card?.title ?? card?.name ?? "Badge";
                      const cardSubtitle =
                        card?.description ??
                        card?.how_to_get ??
                        card?.subtitle ??
                        "Complete required milestones to unlock this badge.";
                      const iconSrc = resolveCardIcon(card, sectionKey);

                      return (
                        <article
                          key={
                            card?.id ??
                            `${sectionKey}-${(safeCurrentPage - 1) * CARDS_PER_PAGE + index}`
                          }
                          className={`rounded-xl border p-3 sm:p-4 ${
                            isEarned
                              ? "border-emerald-200 bg-white"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-3 sm:items-center">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border p-1 sm:h-12 sm:w-12 ${
                                isEarned
                                  ? "border-emerald-200"
                                  : "border-slate-200"
                              }`}
                            >
                              {isEarned ? (
                                <img
                                  src={iconSrc}
                                  alt={cardTitle}
                                  className="h-full w-full rounded-full object-contain"
                                />
                              ) : (
                                <Lock
                                  aria-hidden="true"
                                  className="h-4 w-4 text-slate-500 sm:h-5 sm:w-5"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-medium leading-6 text-slate-700 sm:text-[18px] sm:leading-7">
                                {cardTitle}
                              </h4>
                              <p className="mt-1 text-xs italic leading-5 text-slate-600 sm:mt-2 sm:text-sm">
                                {cardSubtitle}
                              </p>
                            </div>
                          </div>
                          {/* <span
                            className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              isEarned
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {isEarned ? "Earned" : "Locked"}
                          </span> */}
                        </article>
                      );
                    })
                  )}
                </div>

                {sectionCards.length > CARDS_PER_PAGE ? (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => goToPage(safeCurrentPage - 1)}
                      disabled={safeCurrentPage === 1}
                      className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-sm"
                    >
                      Prev
                    </button>

                    {/* Compact page indicator for small screens */}
                    <span className="text-xs font-medium text-slate-600 sm:hidden">
                      Page {safeCurrentPage} / {totalPages}
                    </span>

                    {/* Full numbered pagination from sm breakpoint up */}
                    <div className="hidden flex-wrap items-center justify-center gap-2 sm:flex">
                      {getPageNumbers().map((page, idx) =>
                        typeof page === "number" ? (
                          <button
                            key={page}
                            type="button"
                            onClick={() => goToPage(page)}
                            className={`min-w-[2.25rem] rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                              page === safeCurrentPage
                                ? "border-[#AD474B] bg-[#AD474B] text-white"
                                : "border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {page}
                          </button>
                        ) : (
                          <span
                            key={`${page}-${idx}`}
                            className="px-1 text-sm text-slate-400"
                          >
                            …
                          </span>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => goToPage(safeCurrentPage + 1)}
                      disabled={safeCurrentPage === totalPages}
                      className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-sm"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default StudentBadgeShowcase;