import React from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PortalFooter from "@/components/layout/PortalFooter";

const AuthLayout = ({ children }) => {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <PortalFooter />
    </>
  );
};

export default AuthLayout;
