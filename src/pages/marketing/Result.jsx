// import React, { useState } from 'react';
// import './Result.css';
// import { studentsData } from '../../api/result';

// const ResultPMC = () => {
//     const [searchTerm, setSearchTerm] = useState('');
//     const [result, setResult] = useState(null);

//     // Button click hone par ye function chalega
//     const handleSearch = (e) => {
//         e.preventDefault(); // Page refresh hone se rokta hai

//         // Data mein se Form B ID match karna
//         const foundStudent = studentsData.find(
//             (s) => String(s.form_b_id).trim() === searchTerm.trim()
//         );

//         if (foundStudent) {
//             setResult(foundStudent);
//         } else {
//             setResult('not_found');
//         }
//     };

//     return (
//         <>
//             <div className="container">
//                 <div className="headingBg">
//                     <h2>Pakistan Mathematics Contest (PMC)</h2>
//                     <p>Official Online Results Verification Portal / نتائج پورٹل</p>
//                 </div>
//             </div>
//             <div className="results-container">
//                 <div className="results-header">
//                     <h4 className='heading'>Check Your Selection Status / اپنا رزلٹ چیک کریں</h4>
//                     <p>Please enter your Form-B number <b>without dashes (-)</b>.</p>
//                     <p>برائے مہربانی اپنا فارم بی نمبر<b> بغیر ڈیش (-)</b> کے درج کریں۔</p>
//                 </div>

//                 <div className="search-box">
//                     <form onSubmit={handleSearch}>
//                         <input
//                             type="text"
//                             placeholder="Enter form-B number (e.g. 123412345670)"
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                             required
//                         />
//                         <button onClick={() => handleSearch} type="submit" className="btn-search" >Search / تلاش کریں</button>
//                     </form>
//                 </div>

//                 <div className="result-display">
//                     {result === 'not_found' && (
//                         <div className="result-card status-violation">
//                             <div className="result-icon">
//                                 <i className="fas fa-exclamation-triangle"></i>
//                             </div>
//                             {/* <h3>Form B does not exist</h3> */}
//                             <p>The form-B number you entered does not match any records in our system. Please check the number and try again.</p>
//                         </div>
//                     )}

//                     {result && result !== 'not_found' && (
//                         <div className={`result-card ${result.status === 'Qualified' ? 'status-qualified' : 'status-not-qualified'}`}>
//                             <div className="result-icon">
//                                 <i className={`fas ${result.status === 'Qualified' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
//                             </div>

//                             <h3>{result.status === 'Qualified' ? 'Congratulations!' : " "}</h3>

//                             <div className="result-details">
//                                 <p><strong>Name:</strong> {result.student_name}</p>
//                                 {result.status === 'Qualified' && (
//                                     <>
//                                     <p>
//                                         <strong>Test City:</strong> {result.city}
//                                     </p>
//                                     <p>
//                                         <strong>PMC Type:</strong> {result.pmc}
//                                     </p>
//                                     </>
//                                 )}
//                                 <p><strong>Status:</strong> {result.status}</p>
//                             </div>

//                             {/* Logic for Qualified Students Only */}
//                             {result.status === 'Qualified' && (
//                                 <div className="qualification-notice" style={{ marginTop: '20px', paddingBotton: '20px', }}>
//                                     <hr />
//                                     <div className='pragh'>
//                                         <p>Please note that you will receive an SMS from NTS (National Testing Service) with a link to your admit slip, which contains your test center and time. Please follow the instructions on your admit slip.</p>
//                                     </div>
//                                     {/* <div className="test-details">
//                                         <h4>Test Details:</h4>
//                                         <ul>
//                                             <li><strong>Date:</strong> Monday, 23rd February 2026</li>
//                                             <li><strong>Time & Venue:</strong> As mentioned on your admit slip</li>
//                                             <li><strong>Reporting Time:</strong> Please arrive at the center at least 15 minutes before the test start time.</li>
//                                         </ul>
//                                     </div> */}
//                                 </div>
//                             )}
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </>
//     );
// }

// export default ResultPMC;


import React, { useState } from 'react';
import './Result.css';
import { studentsDataRound2 } from '../../api/resultRound2';

const ResultPMC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [result, setResult] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();

        const foundStudent = studentsDataRound2.find(
            (s) => String(s.FormB_ID).trim() === searchTerm.trim()
        );

        if (foundStudent) {
            setResult(foundStudent);
        } else {
            setResult('not_found');
        }
    };

    const isQualifiedOnCampus = result && result.Stutus === 'Call to Sundar + VSS Admission';
    const isQualifiedVSSOnly = result && result.Stutus === 'VSS Admission';
    const isQualified = isQualifiedOnCampus || isQualifiedVSSOnly;
    const isNotQualified = result && result.Stutus === 'Not Qualified';
    const isAbsent = result && result.Stutus === 'Absent';

    // extra details (Test City, Form-B, Paper/PMC Type) ab Qualified + Not Qualified + Absent teeno ke liye show honge
    const showExtraDetails = isQualified || isNotQualified || isAbsent;

    let displayStatus = '';
    if (isQualifiedOnCampus) displayStatus = 'Qualified for On-Campus Contest & VSS Admission';
    else if (isQualifiedVSSOnly) displayStatus = 'Qualified for VSS Admission';
    else if (isNotQualified) displayStatus = 'Not Qualified';
    else if (isAbsent) displayStatus = 'Absent';

    return (
        <>
            <div className="container">
                <div className="headingBg">
                     <h2>Pakistan Mathematics Contest (PMC) - Round 2</h2>
                     <p>Official Online Results Verification Portal / نتائج پورٹل</p>
                 </div>
            </div>
            <div className="results-container">
                <div className="results-header">
                     <h4 className='heading'>Check Your Selection Status / اپنا رزلٹ چیک کریں</h4>
                     <p>Please enter your Form-B number <b>without dashes (-)</b>.</p>
                     <p>برائے مہربانی اپنا فارم بی نمبر<b> بغیر ڈیش (-)</b> کے درج کریں۔</p>
                 </div>

                <div className="search-box">
                    <form onSubmit={handleSearch}>
                        <input
                            type="text"
                            placeholder="Enter form-B number (e.g. 123412345670)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            required
                        />
                        <button onClick={() => handleSearch} type="submit" className="btn-search" >Search / تلاش کریں</button>
                    </form>
                </div>

                <div className="result-display">
                    {result === 'not_found' && (
                        <div className="result-card status-violation">
                            <div className="result-icon">
                                <i className="fas fa-exclamation-triangle"></i>
                            </div>
                            <p>The form-B number you entered does not match any records in our system. Please check the number and try again.</p>
                        </div>
                    )}

                    {result && result !== 'not_found' && (
                        <div className={`result-card ${isQualified ? 'status-qualified' : isAbsent ? 'status-violation' : 'status-not-qualified'}`}>
                            <div className="result-icon">
                                <i className={`fas ${isQualified ? 'fa-check-circle' : isAbsent ? 'fa-exclamation-triangle' : 'fa-times-circle'}`}></i>
                            </div>

                            <h3>{isQualified ? 'Congratulations!' : " "}</h3>

                            <div className="result-details">
                                <p><strong>Name:</strong> {result.Name}</p>
                                {showExtraDetails && (
                                    <>
                                    <p>
                                        <strong>Test City:</strong> {result.TestCity}
                                    </p>
                                    <p>
                                        <strong>Form-B Number:</strong> {result.FormB_ID}
                                    </p>
                                    <p>
                                        <strong>PMC Type:</strong> {result.Paper}
                                    </p>
                                    </>
                                )}
                                <p><strong>Status:</strong> {displayStatus}</p>
                            </div>

                            {isQualifiedOnCampus && (
                                <div className="qualification-notice" style={{ marginTop: '20px', paddingBotton: '20px', }}>
                                    <hr />
                                    <div className='pragh'>
                                        <p>Congratulations! You have qualified for admission into the Virtual SundarSTEM (VSS) One-Year Online Program.</p>
                                        <br />
                                        <p>Furthermore, you are cordially invited to participate in the upcoming On-Campus Contest at SundarSTEM School, Lahore, where you will compete for exciting prizes and scholarships for admission to SundarSTEM School. (Please note: SundarSTEM School is a residential boarding school, and the physical campus program is exclusively for boys).</p>
                                        <br />
                                        <p><strong>Next Steps:</strong> You will be added to an official WhatsApp group shortly for further coordinates, event details, and guidelines.</p>
                                    </div>
                                </div>
                            )}

                            {isQualifiedVSSOnly && (
                                <div className="qualification-notice" style={{ marginTop: '20px', paddingBotton: '20px', }}>
                                    <hr />
                                    <div className='pragh'>
                                        <p>Congratulations! You have successfully secured admission into the Virtual SundarSTEM (VSS) One-Year Online Program.</p>
                                        <br />
                                        <p><strong>Next Steps:</strong> You will be added to an official WhatsApp group shortly, where we will share further details regarding the orientation and program registration.</p>
                                    </div>
                                </div>
                            )}

                            {isNotQualified && (
                                <div className="qualification-notice" style={{ marginTop: '20px', paddingBotton: '20px', }}>
                                    <hr />
                                    <div className='pragh'>
                                        <p>Thank you for participating in PMC Summer 2026. Unfortunately, you did not qualify for the next stage this time. We highly appreciate your effort and dedication. Better luck next time, and keep problem-solving!</p>
                                    </div>
                                </div>
                            )}

                            {/* {isAbsent && (
                                <div className="qualification-notice" style={{ marginTop: '20px', paddingBotton: '20px', }}>
                                    <hr />
                                    <div className='pragh'>
                                        <p>Our records show that you were absent for the PMC test.</p>
                                    </div>
                                </div>
                            )} */}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default ResultPMC;