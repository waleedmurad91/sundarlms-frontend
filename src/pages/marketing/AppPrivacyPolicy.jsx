import React from "react";
import "./AppPrivacyPolicy.css";

const AppPrivacyPolicy = () => {
  return (
    <div className="app-pp-page">
      {/* ── HERO ── */}
      <section className="app-pp-hero">
        <span className="app-pp-hero-badge">Legal &amp; Privacy</span>
        <h1>
          Privacy <span>Policy</span>
        </h1>
        <p>
          Protecting the privacy and security of every student, parent, teacher,
          and school on Virtual Sundar STEM.
        </p>
        <div className="app-pp-hero-curve">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none">
            <path
              d="M0,70 C360,0 1080,0 1440,70 L1440,70 L0,70 Z"
              fill="#f9f9f9"
            />
          </svg>
        </div>
      </section>

      <div className="container text-center">
        <span className="app-pp-date">Effective Date: July 20, 2026</span>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="container py-5" style={{ maxWidth: "860px" }}>
        {/* Intro */}
        <div className="app-pp-intro mb-5">
          At Virtual Sundar STEM ("we," "our," or "us"), we value the trust
          placed in us by students, parents, teachers, schools, and visitors who
          use our platform. Protecting the privacy and security of personal
          information is one of our highest priorities. This Privacy Policy
          explains what information we collect, how we use it, how we protect
          it, and the choices available to you regarding your personal
          information when using Virtual Sundar STEM, including our educational
          programs such as ILM (I Love Math), Pakistan Math Contest (PMC),
          Regional Math Clubs (RMC), and Virtual Sundar STEM (VSS).
        </div>

        {/* Timeline sections */}
        <div className="app-pp-timeline">
          {/* Section 1 */}
          <div className="app-pp-step">
            <div className="app-pp-step-num">01</div>
            <div className="app-pp-step-card">
              <h2 className="app-pp-step-title">Information We Collect</h2>
              <p>
                When you create an account, register for one of our programs,
                participate in competitions, or use our learning platform, we
                may collect personal information such as:
              </p>
              <ul className="app-pp-list">
                <li>Name, email address, and mobile number</li>
                <li>Date of birth and gender</li>
                <li>School name, grade level, city, and district</li>
                <li>Parent or guardian information</li>
                <li>
                  Any additional information required for registration or
                  verification
                </li>
              </ul>
              <p className="mt-3 mb-0">
                We also collect educational information, including assessment
                results, quiz scores, practice history, certificates,
                competition participation, assignments, and progress reports to
                provide personalized learning experiences and monitor academic
                performance.
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="app-pp-step">
            <div className="app-pp-step-num">02</div>
            <div className="app-pp-step-card">
              <h2 className="app-pp-step-title">
                Technical Information We Collect Automatically
              </h2>
              <p>
                Like most online platforms, we automatically collect certain
                technical information when you visit our website. This may
                include:
              </p>
              <ul className="app-pp-list">
                <li>IP address, browser type, and operating system</li>
                <li>Device information</li>
                <li>Pages visited and session duration</li>
                <li>Referral source and cookies</li>
              </ul>
              <p className="mt-3 mb-0">
                This information helps us improve website performance, maintain
                security, diagnose technical issues, understand how our services
                are used, and enhance the overall user experience.
              </p>
            </div>
          </div>

          {/* Section 3 */}
          <div className="app-pp-step">
            <div className="app-pp-step-num">03</div>
            <div className="app-pp-step-card">
              <h2 className="app-pp-step-title">How We Use Your Information</h2>
              <p>
                The information we collect is used solely to provide and improve
                our educational services. We use your information to:
              </p>
              <ul className="app-pp-list">
                <li>Create and manage user accounts and authenticate users</li>
                <li>Deliver learning materials and conduct assessments</li>
                <li>Track academic progress and issue certificates</li>
                <li>Organize competitions</li>
                <li>
                  Communicate important announcements and respond to support
                  requests
                </li>
                <li>
                  Improve our platform, maintain security, and prevent
                  unauthorized access
                </li>
                <li>Comply with applicable legal obligations</li>
              </ul>
              <div className="app-pp-note">
                We do not sell, rent, or trade personal information to
                advertisers, data brokers, or other third parties.
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="app-pp-step">
            <div className="app-pp-step-num">04</div>
            <div className="app-pp-step-card">
              <h2 className="app-pp-step-title">Student Privacy</h2>
              <p className="mb-0">
                Student privacy is fundamental to our mission. All student
                information is collected and processed only for educational
                purposes. Access to student records is restricted to authorized
                personnel, including the student's school, assigned teachers,
                authorized administrators, and parents or guardians where
                applicable. We take reasonable measures to ensure that student
                data remains confidential and is only accessible to individuals
                who require it to support the student's education or the
                operation of the platform.
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="app-pp-step">
            <div className="app-pp-step-num">05</div>
            <div className="app-pp-step-card">
              <h2 className="app-pp-step-title">
                Information Sharing &amp; Disclosure
              </h2>
              <p>
                We may share limited information with trusted third-party
                service providers that assist us in operating our services,
                including:
              </p>
              <ul className="app-pp-list">
                <li>Cloud hosting providers</li>
                <li>Email delivery services</li>
                <li>Security monitoring tools</li>
                <li>Analytics providers</li>
                <li>Technical support partners</li>
              </ul>
              <p className="mt-3 mb-0">
                These providers are required to maintain the confidentiality of
                the information they process and may use it only for the
                services they provide on our behalf. We may also disclose
                information if required to do so by law, court order, or a
                lawful request from a government or regulatory authority.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="app-pp-step">
            <div className="app-pp-step-num">06</div>
            <div className="app-pp-step-card">
              <h2 className="app-pp-step-title">
                Cookies &amp; Similar Technologies
              </h2>
              <p className="mb-0">
                Virtual Sundar STEM uses cookies and similar technologies to
                provide essential website functionality, maintain secure login
                sessions, remember user preferences, improve website
                performance, and analyze usage trends. Users may disable cookies
                through their browser settings; however, doing so may affect
                certain features of the platform.
              </p>
            </div>
          </div>

          {/* Section 7 */}
          <div className="app-pp-step">
            <div className="app-pp-step-num">07</div>
            <div className="app-pp-step-card">
              <h2 className="app-pp-step-title">Data Security</h2>
              <p>
                We implement appropriate administrative, technical, and
                organizational safeguards to protect personal information
                against unauthorized access, disclosure, alteration, or
                destruction. These safeguards include:
              </p>
              <ul className="app-pp-list">
                <li>Encrypted communications (HTTPS)</li>
                <li>Secure authentication and password encryption</li>
                <li>Access controls and routine monitoring</li>
                <li>Regular software updates</li>
                <li>Secure server infrastructure and periodic backups</li>
              </ul>
              <p className="mt-3 mb-0">
                Although we continuously work to protect user information, no
                online service can guarantee absolute security, and users should
                also take reasonable precautions to protect their account
                credentials.
              </p>
            </div>
          </div>

          {/* Section 8 */}
          <div className="app-pp-step">
            <div className="app-pp-step-num">08</div>
            <div className="app-pp-step-card">
              <h2 className="app-pp-step-title">Data Retention</h2>
              <p className="mb-0">
                We retain personal information only for as long as it is
                necessary to provide our educational services, maintain academic
                records, comply with legal obligations, resolve disputes,
                enforce our policies, and improve our platform. When information
                is no longer required, it is securely deleted or anonymized
                using appropriate procedures.
              </p>
            </div>
          </div>

          {/* Section 9 */}
          <div className="app-pp-step">
            <div className="app-pp-step-num">09</div>
            <div className="app-pp-step-card">
              <h2 className="app-pp-step-title">Children's Privacy</h2>
              <p className="mb-0">
                Virtual Sundar STEM is designed primarily for school-age
                students. Student accounts may be created by schools, parents,
                guardians, or authorized administrators depending on the
                program. We collect only the information necessary to provide
                educational services and encourage parents and schools to
                supervise children's online activities. Parents or authorized
                schools may request access to, correction of, or deletion of
                student information, subject to applicable legal and
                institutional requirements.
              </p>
            </div>
          </div>

          {/* Section 10 */}
          <div className="app-pp-step">
            <div className="app-pp-step-num">10</div>
            <div className="app-pp-step-card">
              <h2 className="app-pp-step-title">Your Rights &amp; Choices</h2>
              <p className="mb-0">
                Users may request access to their personal information, update
                inaccurate details, request corrections, or ask for deletion of
                their account where permitted by law and operational
                requirements. We will make reasonable efforts to respond to such
                requests in a timely manner while ensuring that academic records
                required for educational or legal purposes are retained where
                necessary.
              </p>
            </div>
          </div>

          {/* Section 11 */}
          <div className="app-pp-step">
            <div className="app-pp-step-num">11</div>
            <div className="app-pp-step-card">
              <h2 className="app-pp-step-title">
                Changes to This Privacy Policy
              </h2>
              <p className="mb-0">
                From time to time, we may update this Privacy Policy to reflect
                changes in our services, technology, legal requirements, or
                operational practices. Any changes will be published on this
                page with an updated effective date. Continued use of the
                Virtual Sundar STEM platform after such updates constitutes
                acceptance of the revised Privacy Policy.
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="app-pp-contact my-5">
          <h2>Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy or our privacy
            practices, or if you wish to exercise your privacy rights, please
            contact us. We are committed to maintaining a secure, transparent,
            and trusted educational environment for every student, parent,
            teacher, and school that uses Virtual Sundar STEM.
          </p>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="app-pp-contact-item">
                <div className="label">Email</div>
                <div>info@virtual.sundarstem.edu.pk</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="app-pp-contact-item">
                <div className="label">Location</div>
                <div>Pakistan</div>
              </div>
            </div>
          </div>
        </div>

        {/* Agreement */}
        <div className="app-pp-agreement">
          By using the Virtual Sundar STEM platform, you agree to this Privacy
          Policy.
        </div>
      </div>
    </div>
  );
};

export default AppPrivacyPolicy;
