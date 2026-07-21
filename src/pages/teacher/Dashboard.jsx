import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getActivityOverview } from "@/api/masteryAssignmentApi";
import { useAuthStore } from "@/store/auth";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, Loader2, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { linkTeacherToSchool, unlinkTeacherFromSchool } from "@/api/teacherApi";
import StudentRow from "@/components/StudentRow";
import AccessModeSwitcher from "@/components/common/AccessModeSwitcher";

import toast from "react-hot-toast";

const TeacherDashboard = () => {
  const { user, school, updateUser } = useAuthStore();
  const teacherId = user?.id;

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [activityData, setActivityData] = React.useState([]);
  const [schoolModalOpen, setSchoolModalOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getActivityOverview(teacherId);
        if (res?.status && Array.isArray(res?.data)) {
          setActivityData(res.data);
        } else {
          setError("Failed to load activity overview.");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to fetch activity overview. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    if (teacherId) fetchData();
  }, [teacherId]);

  return (
    <>
      {error && (
        <Alert variant="destructive" className="alert-custom mb-4 bg-[#FDF7EC]">
          <AlertCircleIcon size={18} />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Teacher Dashboard</h4>
          <h1>Activity Overview</h1>
          <p className="text-slate-600 text-md">
            See all of your students' activity on SunderSTEM. It may take up to
            10 minutes for student activity to update.
          </p>
        </div>
        <div className="dh-right">
          <AccessModeSwitcher />
        </div>
      </div>

      <Tabs
        defaultValue="activity"
        className="mt-5 tab-overview dashboard-body-card"
      >
        <TabsList className="tab-overview-list">
          <TabsTrigger value="activity" className="tab-overview-trigger">
            Activity
          </TabsTrigger>
          {/* <TabsTrigger value="skills" className="tab-overview-trigger">
            Skills
          </TabsTrigger>
          <TabsTrigger value="mastery" className="tab-overview-trigger">
            Mastery
          </TabsTrigger> */}
        </TabsList>

        {/* ACTIVITY */}
        <TabsContent value="activity">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            </div>
          ) : (
            <div className="activity-table">
              {/* your top “legend” / scale bar */}
              <div className="activity-header-top">
                <div className="w-[35%]" />
                <div className="w-[10%] text-right">
                  <span className="activity-header-top-title">Last Login</span>
                </div>
                <div className="w-[10%] text-right">
                  <span className="activity-header-top-title">
                    Skills worked on
                  </span>
                </div>
                <div className="w-[10%] text-right">
                  <span className="activity-header-top-title">
                    Current skill level
                  </span>
                </div>
                <div className="w-[35%]">
                  <p>Breakdown of skills worked on</p>
                  <div className="breakdown-scale">
                    <div className="attempted breakdown-scale-wrap">
                      <div
                        className="progress"
                        style={{ backgroundColor: "#C66024" }}
                      />
                      <span>Attempted</span>
                    </div>
                    <div className="familiar breakdown-scale-wrap">
                      <div
                        className="progress"
                        style={{ backgroundColor: "#D57601" }}
                      />
                      <span>Familiar</span>
                    </div>
                    <div className="proficient breakdown-scale-wrap">
                      <div
                        className="progress"
                        style={{ backgroundColor: "#948EBE" }}
                      />
                      <span>Proficient</span>
                    </div>
                    <div className="mastered breakdown-scale-wrap">
                      <div
                        className="progress"
                        style={{ backgroundColor: "#594094" }}
                      />
                      <span>Mastered</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* table column headers */}
              <div className="activity-header">
                <div className="w-[35%]">
                  <span>Student</span>
                </div>
                <div className="w-[10%] text-right">
                  <span>Total</span>
                </div>
                <div className="w-[10%] text-right">
                  <span>Total</span>
                </div>
                <div className="w-[10%] text-right">
                  <span>Total</span>
                </div>
                <div className="w-[35%]">
                  <span>Proficiency</span>
                </div>
              </div>

              {/* data rows */}
              {activityData.length === 0 ? (
                <p className="text-gray-500 p-5 text-sm text-center">
                  No data found.
                </p>
              ) : (
                activityData.map((row) => (
                  <StudentRow key={row?.student?.id} studentData={row} />
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="skills">
          <p className="text-gray-500 text-sm mt-4">
            Skills data coming soon...
          </p>
        </TabsContent>

        <TabsContent value="mastery">
          <p className="text-gray-500 text-sm mt-4">
            Mastery data coming soon...
          </p>
        </TabsContent>
      </Tabs>
      {/* <SchoolLinkModal
        open={schoolModalOpen}
        onClose={() => {
          setSchoolModalOpen(false);
        }}
        onLink={handleLinkSchool}
        onUnlink={handleUnlinkSchool}
        isLinked={!!school}
        currentSchool={user.school}
        role="teacher"
      /> */}
    </>
  );
};

export default TeacherDashboard;
