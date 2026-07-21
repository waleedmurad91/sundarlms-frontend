import { useState } from "react";
import PracticeSidebar from "./PracticeSidebar";

// Shell used for practice starter/player screens; keeps sidebar and main area separated.
// Adds manual toggle and independent scroll areas.
const PracticeShell = ({
  sidebarData,
  onSelectTopic,
  children,
  sidebarMeta = {},
  sidebarType,
  playerMode,
  basePath = "/student/challenge",
}) => {
  const {
    topics = [],
    selectedTopicId,
    unitCount,
    topicCount,
    subjectId,
    unitId,
  } = sidebarData || {};
  const [showSidebar, setShowSidebar] = useState(true);
  const viewportHeight = "calc(100vh - 8rem)";

  return (
    <div
      className={`relative flex bg-[#F7F8FA] practiceFlow-wrapper ${
        showSidebar ? "pl-5" : "pl-0"
      }`}
      style={{ minHeight: viewportHeight }}
    >
      {showSidebar && (
        <aside
          className="player-sidebar overflow-y-auto sticky top-0"
          style={{ maxHeight: viewportHeight }}
        >
          <PracticeSidebar
            topics={topics}
            selectedTopicId={selectedTopicId}
            onSelectTopic={onSelectTopic}
            gradeName={sidebarMeta.gradeName}
            subjectName={sidebarMeta.subjectName}
            subjectId={sidebarMeta.subjectId ?? subjectId}
            unitId={sidebarMeta.unitId ?? unitId}
            unitName={sidebarMeta.unitName}
            selectedTopicName={sidebarMeta.selectedTopicName}
            sidebarType={sidebarType}
            unitCount={sidebarMeta.unitCount ?? unitCount}
            topicCount={sidebarMeta.topicCount ?? topicCount ?? topics.length}
            basePath={basePath}
            playerMode={playerMode}
          />
        </aside>
      )}
      <main
        className="relative flex-1 overflow-y-auto bg-white"
        style={{ maxHeight: viewportHeight }}
      >
        <button
          type="button"
          onClick={() => setShowSidebar((prev) => !prev)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 collapse-aside-btn shadow p-2 hover:bg-slate-50"
        >
          {showSidebar ? "⟨" : "⟩"}
        </button>
        {children}
      </main>
    </div>
  );
};

export default PracticeShell;
