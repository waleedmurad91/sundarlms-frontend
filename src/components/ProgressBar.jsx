import React from "react";

const ProgressBar = ({ mastery, size = "sm" }) => {
  if (!mastery) return null;
  const {
    percentages = {},
    attempted = 0,
    familiar = 0,
    proficient = 0,
    mastered = 0,
  } = mastery;

  const segments = [
    {
      key: "attempted",
      color: "#C66024",
      value: attempted,
      width: percentages.attempted || 0,
    },
    {
      key: "familiar",
      color: "#D57601",
      value: familiar,
      width: percentages.familiar || 0,
    },
    {
      key: "proficient",
      color: "#948EBE",
      value: proficient,
      width: percentages.proficient || 0,
    },
    {
      key: "mastered",
      color: "#594094",
      value: mastered,
      width: percentages.mastered || 0,
    },
  ];

  const sizeClass = size === "lg" ? "progress-lg" : "progress-sm";

  return (
    <div className="breakdown-scale">
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <div key={s.key} className="breakdown-scale-wrap">
            <div
              className={`progress ${sizeClass}`}
              style={{ backgroundColor: s.color }}
            />
            <span>{s.value}</span>
          </div>
        ))}
    </div>
  );
};

export default ProgressBar;
