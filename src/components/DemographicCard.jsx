import React from "react";

const DemographicCard = ({
  icon,
  title,
  titleSuffix,
  count,
  subheading,
  classname,
}) => {
  return (
    <article className={`metric-card ${classname}`}>
      <div className="metric-body">
        <div className="metric-body-left">
          <span className="metric-icon shrink-0">{icon}</span>
          <div className="metric-title-wrap">
            <span className="metric-title">{title}</span>
            {titleSuffix ? (
              <span className="metric-title-suffix">{titleSuffix}</span>
            ) : null}
          </div>
        </div>
        <div className="metric-body-right">
          <div className="metric-value">{count}</div>
        </div>
      </div>
      <p>{subheading}</p>
    </article>
  );
};

export default DemographicCard;
