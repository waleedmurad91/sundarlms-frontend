import React from "react";
import {
  AlertCircleIcon,
  Check,
  Eye,
  EyeClosed,
  FileImage,
  Loader2,
  Lock,
  LogInIcon,
  Mail,
  Map,
  MapPin,
  MapPinCheck,
  Phone,
  School,
  User,
  IdCardLanyard,
} from "lucide-react";
import { Link } from "react-router-dom";
import loginBanner from "@/assets/signin-image.png";
import school from "@/assets/school.png";
import student from "@/assets/student.png";
import ilmLogo from "@/assets/ilm-logo-red.png";

const RoleSelection = () => {
  return (
    <div className="login-wrap">
      <div className="login-left relative">
        <img src={loginBanner} alt="Sketch" />
      </div>
      <div className="login-right p-[1rem] md:p-[4rem] md:!pr-0">
        <div className="heading_signIn">
          <h1 className="heading_signIn_h1 flex gap-2">
            <span>
              <img
                src={ilmLogo}
                alt="ILM logo"
                className="h-[40px] object-scale-down"
              />
            </span>
            Sign up for Virtual SundarSTEM!
          </h1>
          <p className="heading_signIn_para">
            Choose the option that fits you best and create your account.
          </p>
        </div>
        <div className="form-admin form-creation !pt-0">
          <div className="flex gap-8 justify-center  w-full flex-col md:flex-row mt-6">
            <Link
              to="/signup-student"
              className="p-5 bg-[#FFF5F4] rounded-3xl flex-[50%] border-2 border-transparent hover:border-[#912024] transition-all hover:scale-[1.05]"
            >
              <div className="flex justify-center items-center">
                <img src={student} alt="student" />
              </div>
              <div className="text-2xl font-bold bg-white pt-[2rem] px-[1rem] pb-[1rem] rounded-2xl text-center mt-[-1rem]">
                <span>Student</span> <span>Registration</span>
              </div>
            </Link>
            <Link
              to="/signup-school"
              className="p-5 bg-[#FFF5F4] rounded-3xl flex-[50%] border-2 border-transparent hover:border-[#912024] transition-all hover:scale-[1.05]"
            >
              <div className="flex justify-center items-center">
                <img src={school} alt="school" />
              </div>
              <div className="text-2xl font-bold bg-white pt-[2rem] px-[1rem] pb-[1rem] rounded-2xl text-center mt-[-1rem]">
                <span>School</span> <span>Registration</span>
              </div>
            </Link>
          </div>
          <p className="text-[16px] text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#AD474B] border-b border-[#AD474B]"
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
