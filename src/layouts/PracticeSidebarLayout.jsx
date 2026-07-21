import React from "react";
import { UnitSidebar } from "@/components/UnitSidebar";

const PracticeSidebarLayout = ({ sidebarProps, children }) => {
  return (
    <div className="bg-[#FBFBFB]">
      <div className="grid lg:grid-cols-[400px_1fr]">
        <UnitSidebar {...sidebarProps} />
        <div className="space-y-6 pl-0 md:pl-12 pr-0 md:pr-14 pb-[4rem] bg-[#FBFBFB] customPad">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PracticeSidebarLayout;
