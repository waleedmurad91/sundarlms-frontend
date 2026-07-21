import { MASTERY_SPECTRUM } from "./MasterySpectrum";

export const getBucketKey = (value) => {
  if (!value) return "Not Started";
  const match = MASTERY_SPECTRUM.find(
    (entry) => entry.label.toLowerCase() === value.toLowerCase()
  );
  return match?.label ?? "Not Started";
};
