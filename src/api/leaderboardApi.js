import axiosInstance from "./axiosInstance";

export const getRMCScoreOverview = async () => {
  try {
    const response = await axiosInstance.get("/leaderboard/overview");
    return response.data;
  } catch (error) {
    console.error("Error fetching RMC score overview:", error);
    throw error;
  }
};

