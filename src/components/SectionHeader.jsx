export const SectionHeader = ({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
}) => (
  <div className="flex flex-wrap flex-col items-start justify-between gap-3">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {subtitle}
      </p>
      <h2 className="text-3xl font-semibold capitalize text-slate-900">
        {title}
      </h2>
    </div>
    <div className="inline-flex rounded-sm border border-slate-200 mt-3 text-sm font-semibold tab-students">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onTabChange(tab.value)}
          className={`custom-tab-std ${
            activeTab === tab.value ? "active" : ""
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);
