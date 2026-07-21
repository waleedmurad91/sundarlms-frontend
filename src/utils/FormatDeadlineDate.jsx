export const formatDeadlineForInput = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  // Convert to local ISO and trim seconds/milliseconds
  return date.toISOString().slice(0, 16);
};
