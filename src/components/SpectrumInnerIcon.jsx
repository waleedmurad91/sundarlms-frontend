import practiceIcon from "@/assets/practice-icon.png";

const SpectrumInnerIcon = ({ variant }) => {
  if (!variant) return null;

  if (variant.key === "practice" || variant.usePracticeImage) {
    return <img src={practiceIcon} alt="" className="practice-icon" />;
  }

  if (variant.innerIconClass) {
    return <div className={variant.innerIconClass} />;
  }

  return null;
};

export default SpectrumInnerIcon;
