import React from 'react'
import "./PrivacyPolicy.css";
import ilmMath from '../../assets/ilm-pre-math.png';


const PrivacyPolicy = () => {
    return (
        <div>
            {/* <!-- ── HERO ── --> */}
            <section className="heroPrivacy text-center py-5">
                <span className="inline-block bg-[#000080] text-white px-4 py-2 text-sm font-semibold mb-4 rounded-4xl justify-center">LEGAL &amp; PRIVACY</span>
                <div className="container">
                    <div className="img_kidsilm">
                        <img src={ilmMath} alt="" />
                    </div>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-rmc-800 mb-6">Privacy Policy</h1>
                <p className="text-2xl text-gray-700 mb-4 ">Protecting your child's data and your trust</p>
            </section>

            {/* <!-- ── MAIN CONTENT ── --> */}
            <div className="container">
                <div className="py-5">


                    <p className="eff-date text-center mb-4">Effective Date: February 25, 2026</p>


                    <div className="intro-box p-4 mb-4 shadow-lg">
                        Thank you for using our Pre-K Math Learning App. Your privacy and your child's privacy are extremely important to us. This Privacy Policy explains how we collect, use, and protect information when you use our App.
                        <br /><br />
                        This App is designed specifically for children aged <strong>2–5</strong> and their parents/guardians in Pakistan, particularly Urdu-speaking families.
                    </div>

                    {/* <!-- Section 1 --> */}
                    <div className="card shadow-sm border pp-card mb-4 p-4">
                        <p className="pp-num mb-1">Section 01</p>
                        <h2 className="pp-title mb-3">Information We Collect</h2>
                        <p className="text">We intentionally collect as little information as possible.</p>

                        <div className="mt-3">
                            <h6 className="fw-bold">a) Personal Information</h6>
                            <p className="text">We do not require children to create accounts. We do not collect names, email addresses, phone numbers, photos, or precise location data from children.</p>
                        </div>

                        <div className="mt-3">
                            <h6 className="fw-bold">b) Parent Contact Information (if provided)</h6>
                            <p className="text mb-2">If a parent or guardian contacts us for support, we may collect:</p>
                            <ul className="pp-list">
                                <li>Name</li>
                                <li>Email address</li>
                                <li>Message content</li>
                            </ul>
                            <p className="text">This information is used only to respond to your inquiry.</p>
                        </div>

                        <div className="mt-3">
                            <h6 className="fw-bold">c) Device Information</h6>
                            <p className="text mb-2">We may collect limited non-personal technical data such as:</p>
                            <ul className="pp-list">
                                <li>Device type</li>
                                <li>Operating system version</li>
                                <li>Anonymous usage statistics</li>
                                <li>Crash reports</li>
                            </ul>
                            <p className="text">This data is used only to improve performance and stability.</p>
                        </div>
                    </div>

                    {/* <!-- Section 2 --> */}
                    <div className="card shadow-sm border pp-card mb-4 p-4">
                        <p className="pp-num mb-1">Section 02</p>
                        <h2 className="pp-title mb-3">No Ads, No Purchases, No Tracking</h2>
                        <div>
                            <span className="pp-pill"><i className="bi bi-check-circle-fill me-1"></i>Completely Free</span>
                            <span className="pp-pill"><i className="bi bi-check-circle-fill me-1"></i>No Subscriptions</span>
                            <span className="pp-pill"><i className="bi bi-check-circle-fill me-1"></i>No In-App Purchases</span>
                            <span className="pp-pill"><i className="bi bi-check-circle-fill me-1"></i>No Third-Party Ads</span>
                            <span className="pp-pill"><i className="bi bi-check-circle-fill me-1"></i>No Behavioral Tracking</span>
                        </div>
                    </div>

                    {/* <!-- Section 3 --> */}
                    <div className="card shadow-sm border pp-card mb-4 p-4">
                        <p className="pp-num mb-1">Section 03</p>
                        <h2 className="pp-title mb-3">Children's Privacy</h2>
                        <p className="text">We are committed to protecting children's privacy. We do not knowingly collect personal data from children under 13.</p>
                        <div className="highlight-box p-3 mt-3">
                            If you believe your child has provided personal information, please contact us and we will promptly delete it.
                        </div>
                    </div>

                    {/* <!-- Section 4 --> */}
                    <div className="card shadow-sm border pp-card mb-4 p-4">
                        <p className="pp-num mb-1">Section 04</p>
                        <h2 className="pp-title mb-3">How We Use Information</h2>
                        <p className="text mb-2">We use limited collected information to:</p>
                        <ul className="pp-list">
                            <li>Improve app performance</li>
                            <li>Fix bugs and crashes</li>
                            <li>Respond to parent inquiries</li>
                            <li>Enhance learning experience</li>
                        </ul>
                        <p className="fw-bold mt-3">
                            We do not sell, rent, or trade any information.
                        </p>
                    </div>

                    {/* <!-- Section 5 --> */}
                    <div className="card shadow-sm border pp-card mb-4 p-4">
                        <p className="pp-num mb-1">Section 05</p>
                        <h2 className="pp-title mb-3">Data Storage &amp; Security</h2>
                        <p className="text">We implement reasonable administrative and technical safeguards to protect information. Data (if any) is stored securely and access is restricted.</p>
                        <p className="text mt-2">While we strive to protect information, no digital system is 100% secure.</p>
                    </div>

                    {/* <!-- Section 6 --> */}
                    <div className="card shadow-sm border pp-card mb-4 p-4">
                        <p className="pp-num mb-1">Section 06</p>
                        <h2 className="pp-title mb-3">Third-Party Services</h2>
                        <p className="text mb-2">If analytics or crash reporting tools are used, they are configured to:</p>
                        <ul className="pp-list">
                            <li>Collect only anonymous, non-personal information</li>
                            <li>Comply with child-directed app requirements</li>
                            <li>Disable advertising identifiers</li>
                        </ul>
                        <p className="text mt-3">We ensure compliance with Apple and Google policies regarding child-directed services.</p>
                    </div>

                    {/* <!-- Section 7 --> */}
                    <div className="card shadow-sm border pp-card mb-4 p-4">
                        <p className="pp-num mb-1">Section 07</p>
                        <h2 className="pp-title mb-3">Data Retention</h2>
                        <p className="text">We retain non-personal technical data only as long as necessary to improve the App. Parent communications are deleted once resolved unless legally required to retain them.</p>
                    </div>

                    {/* <!-- Section 8 --> */}
                    <div className="card shadow-sm border pp-card mb-4 p-4">
                        <p className="pp-num mb-1">Section 08</p>
                        <h2 className="pp-title mb-3">International Users</h2>
                        <p className="text">The App is intended primarily for users in Pakistan. By using the App, you consent to processing of information in accordance with this Privacy Policy.</p>
                    </div>

                    {/* <!-- Section 9 --> */}
                    <div className="card shadow-sm border pp-card mb-4 p-4">
                        <p className="pp-num mb-1">Section 09</p>
                        <h2 className="pp-title mb-3">Changes to This Privacy Policy</h2>
                        <p className="text">We may update this Privacy Policy periodically. Changes will be posted on this page with a new effective date.</p>
                    </div>

                    {/* <!-- Section 10 – Contact --> */}
                    <div className="card shadow-sm border pp-card gold-top mb-4 p-4">
                        <p className="pp-num gold mb-1">Section 10</p>
                        <h2 className="pp-title mb-3">Contact Us</h2>
                        <p className="text mb-3">If you have questions about this Privacy Policy, please contact us:</p>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <div className="d-flex align-items-center gap-2">
                                    <div>
                                        <div className="fw-bold small">Email</div>
                                        <div className="text small">noreply@virtual.sundarstem.edu.pk</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                            </div>
                            <div className="col-md-4">
                                <div className="d-flex align-items-center gap-2">
                                    <div>
                                        <div className="fw-bold small">Location</div>
                                        <div className="text small">Pakistan</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* <!-- Agreement --> */}
                    <div className="agreement-box text-center p-4 mb-2">
                        By using the App, you agree to this Privacy Policy.
                    </div>

                </div>
            </div>

        </div>
    )
}

export default PrivacyPolicy