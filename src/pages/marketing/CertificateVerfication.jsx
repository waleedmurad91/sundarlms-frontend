import React, { useState } from "react";
import { Search, CheckCircle, FileText, Shield } from "lucide-react";
import axios from "axios";
import Certificate from "@/components/Certificate";
import "../marketing/CertificateVerfication.css";

const CertificateVerification = () => {
  const [ssid, setSsid] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState("");

  const handleVerify = async (event) => {
    event?.preventDefault?.();
    setError("");
    setCertificate(null);

    if (!ssid.trim()) {
      setError("Please enter a valid SSID");
      return;
    }

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/certificate/verify?ssid=${ssid}`,
      );
      const { status, data, message } = response.data || {};

      if (status && data) {
        setCertificate({
          ...data,
          studentName: data.student_name,
          completionDate: data.completion_date,
          issueDate: data.issue_date,
        });
        return;
      }

      if (message?.toLowerCase().includes("blocked")) {
        setCertificate({ certificate_status: "blocked" });
        return;
      }

      setError(
        message ||
          "Certificate not found. Please check your SSID and try again.",
      );
    } catch (requestError) {
      console.log("Certificate error", requestError);
      setError(
        requestError?.response?.data?.message ||
          "Unable to verify the certificate right now. Please try again.",
      );
    }
  };

  const isBlocked = certificate?.certificate_status === "blocked";

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-50 to-purple-50 py-10 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-10 text-center sm:mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-white">
            <Shield size={20} />
            <span className="font-semibold">Certificate Verification</span>
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
            VSS Program Certificate
          </h1>
          <p className="mx-auto max-w-2xl text-base text-gray-600 sm:text-lg">
            Enter your SSID (SundarSTEM ID) to verify and download your VSS
            completion certificate.
          </p>
        </div>

        <div className="mx-auto mb-8 max-w-2xl rounded-[28px] border-2 border-gray-100 bg-white p-5 shadow-xl sm:p-8">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label
                htmlFor="ssid"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Enter Your SSID
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  id="ssid"
                  value={ssid}
                  onChange={(event) =>
                    setSsid(event.target.value.toUpperCase())
                  }
                  placeholder="e.g., SS2024001"
                  className="w-full flex-1 rounded-2xl border-2 border-gray-300 px-4 py-3 font-mono text-base focus:border-red-500 focus:outline-none sm:text-lg"
                  style={{ textTransform: "uppercase" }}
                />
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700"
                >
                  <Search size={20} />
                  Verify
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Your SSID can be found in your VSS enrollment confirmation email
              or student portal.
            </p>
          </form>

          {error ? (
            <div className="mt-4 border-l-4 border-red-500 bg-red-50 p-4 text-red-700">
              <p className="font-semibold">{error}</p>
            </div>
          ) : null}
        </div>

        {certificate ? (
          <div className="space-y-6">
            {!isBlocked ? (
              <div className="mx-auto max-w-2xl border-2 border-green-500 bg-green-50 p-6 text-center rounded-[28px]">
                <h3 className="mb-2 flex items-center justify-center gap-2 text-2xl font-bold text-green-800">
                  <CheckCircle className="text-green-600" size={32} />
                  Certificate Verified!
                </h3>
                <p className="text-green-700">
                  This certificate is valid and has been issued by SundarSTEM
                  School.
                </p>
              </div>
            ) : null}

            {isBlocked ? (
              <div className="mx-auto max-w-2xl rounded-2xl border-l-4 border-red-500 bg-red-50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-red-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-3 text-xl font-bold text-red-900">
                      Laptop Return Required
                    </h4>
                    <p className="mb-4 text-base font-semibold text-red-800">
                      Please return the laptop to get your certificate.
                    </p>
                    <div className="rounded-lg border-2 border-red-300 bg-white p-4">
                      <p className="mb-2 font-semibold text-gray-900">
                        Already returned your laptop?
                      </p>
                      <p className="mb-2 text-sm text-gray-700">
                        Send your proof (courier slip or return receipt) to:
                      </p>
                      <p className="text-lg font-bold text-red-700">
                        WhatsApp: +92-321-7276806
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isBlocked ? (
              <div className="mx-auto max-w-2xl rounded-[28px] border-2 border-red-500 bg-red-100 p-6 text-center sm:p-12">
                <div className="mb-4">
                  <svg
                    className="mx-auto h-20 w-20 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="mb-4 text-3xl font-bold text-red-800">
                  Certificate Not Available
                </h3>
                <p className="mb-2 text-lg text-red-700">
                  Your certificate cannot be downloaded until you return the
                  laptop.
                </p>
                <p className="text-base text-red-600">
                  Please contact us on WhatsApp:{" "}
                  <strong>+92-321-7276806</strong>
                </p>
              </div>
            ) : (
              <>
                <div className="mx-auto w-full max-w-[980px]">
                  <Certificate
                    studentName={certificate.studentName}
                    batch={certificate.batch}
                    completionDate={certificate.completionDate}
                    issueDate={certificate.issueDate}
                  />
                </div>

                <div className="mx-auto max-w-2xl rounded-[28px] border-2 border-blue-200 bg-blue-50 p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <FileText
                      className="mt-1 flex-shrink-0 text-blue-600"
                      size={24}
                    />
                    <div>
                      <h4 className="mb-2 font-bold text-gray-900">
                        About This Certificate
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>
                          This is an official certificate from SundarSTEM
                          School.
                        </li>
                        <li>Each certificate has a unique SSID.</li>
                        <li>
                          Certificates can be verified online at any time.
                        </li>
                        <li>
                          For queries, contact{" "}
                          <span className="font-medium">
                            info@virtual.sundarstem.edu.pk
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}

        {!certificate && !error ? (
          <div className="mx-auto mt-8 max-w-2xl rounded-[28px] border-2 border-gray-100 bg-white p-5 shadow-lg sm:p-8">
            <h3 className="mb-4 text-xl font-bold text-gray-900">How to Use</h3>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-red-600 text-sm font-bold text-white">
                  1
                </span>
                <span>
                  Enter your SSID (SundarSTEM ID) in the search box above.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-red-600 text-sm font-bold text-white">
                  2
                </span>
                <span>Click Verify to validate your certificate.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-red-600 text-sm font-bold text-white">
                  3
                </span>
                <span>
                  Once verified, you can download your certificate as a PDF.
                </span>
              </li>
            </ol>
            <div className="mt-6 border-l-4 border-yellow-500 bg-yellow-50 p-4">
              <p className="text-sm text-gray-700">
                <strong>Don't have your SSID?</strong> Contact us at{" "}
                <span className="font-medium">
                  info@virtual.sundarstem.edu.pk
                </span>
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CertificateVerification;
