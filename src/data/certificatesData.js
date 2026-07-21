// Sample certificate data for verification
const certificates = [
  {
    ssid: "SS2024001",
    studentName: "Fatima Ali",
    program: "Virtual STEM School (VSS)",
    batch: "Batch 1",
    completionDate: "2024-12-15",
    issueDate: "2024-12-20",
    signature: "Muhammad Ishaq",
    laptopReturned: true,
  },
  {
    ssid: "SS2024002",
    studentName: "Ahmed Khan",
    program: "Virtual STEM School (VSS)",
    batch: "Batch 1",
    completionDate: "2024-12-15",
    issueDate: "2024-12-20",
    signature: "Muhammad Ishaq",
    laptopReturned: false,
  },
  {
    ssid: "SS2024003",
    studentName: "Sara Ahmed",
    program: "Virtual STEM School (VSS)",
    batch: "Batch 2",
    completionDate: "2024-12-20",
    issueDate: "2024-12-25",
    signature: "Muhammad Ishaq",
    laptopReturned: true,
  },
];

// Function to verify certificate by SSID
export const verifyCertificate = (ssid) => {
  return certificates.find(cert => cert.ssid.toUpperCase() === ssid.toUpperCase()) || null;
};