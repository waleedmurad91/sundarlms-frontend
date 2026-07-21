import { useLayoutEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import sundarLogo from "../assets/sundar-logo.webp";
import headSignature from "../assets/head-signature.png";
import principalSignature from "../assets/signature.jpeg";

const EXPORT_WIDTH = 1122;
const EXPORT_HEIGHT = 794;
const PDF_PAGE_MARGIN = 7;
const CERTIFICATE_BODY_TEXT =
  "In recognition of their successful completion of the Virtual SundarSTEM Online Program. By learning a curriculum in Olympiad Mathematics, Competitive Programming, and English Language, has exhibited a profound aptitude for logical reasoning and analytical problem-solving.";
const HEAD_SIGNATURE_ROLE = "Head of Virtual SundarSTEM";
const PRINCIPAL_SIGNATURE_ROLE = "Principal of Virtual SundarSTEM";

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Failed to load certificate asset: ${src}`));
    image.src = src;
  });

const imageToDataUrl = async (src, filter) => {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context is unavailable for PDF asset rendering.");
  }

  if (filter) {
    context.filter = filter;
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/png");
};

const setHexColor = (pdf, method, hex) => {
  const normalized = hex.replace("#", "");
  const channels = normalized.match(/.{1,2}/g)?.map((channel) => {
    return Number.parseInt(channel, 16);
  });

  if (!channels || channels.length !== 3) return;

  pdf[method](...channels);
};

const formatDate = (value) => {
  if (!value) return "";

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
};

const buildFileName = (studentName) => {
  const normalized = String(studentName ?? "certificate")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalized || "certificate"}.pdf`;
};

const SignatureBlock = ({ alt, imageClassName = "", name, role, src }) => (
  <div className="signature-block">
    <div className="signature-image-wrap">
      <img
        src={src}
        className={`signature-img ${imageClassName}`.trim()}
        alt={alt}
      />
    </div>
    <div className="signature-line" />
    <div className="signature-name">{name || "\u00A0"}</div>
    <div className="signature-role">{role}</div>
  </div>
);

const CertificateArtwork = ({
  completionDate,
  headSignatureName,
  issueDate,
  signature,
  studentName,
}) => (
  <div className="certificate-border">
    <div className="corner tl" />
    <div className="corner tr" />
    <div className="corner bl" />
    <div className="corner br" />

    <div className="certificate-content">
      <img
        src={sundarLogo}
        className="certificate-logo"
        alt="SundarSTEM Logo"
      />

      <div className="school-name">SundarSTEM School</div>
      <div className="school-subtitle">Virtual SundarSTEM Program</div>

      <div className="certificate-title">Certificate of Completion</div>

      <div className="presented-text">This is proudly presented to</div>

      <div className="student-name">{studentName}</div>

      <div className="program-text">{CERTIFICATE_BODY_TEXT}</div>

      <div className="date-row">
        <div className="date-box">
          <div className="date-label">COMPLETION DATE</div>
          <div className="date-value">{formatDate(completionDate)}</div>
        </div>
        <div className="date-box">
          <div className="date-label">ISSUE DATE</div>
          <div className="date-value">{formatDate(issueDate)}</div>
        </div>
      </div>

      <div className="signature-section">
        <div className="signature-grid">
          <SignatureBlock
            src={headSignature}
            alt="Head Signature"
            imageClassName="signature-img--head"
            name={headSignatureName}
            role={HEAD_SIGNATURE_ROLE}
          />
          <SignatureBlock
            src={principalSignature}
            alt="Principal Signature"
            name={signature}
            role={PRINCIPAL_SIGNATURE_ROLE}
          />
        </div>
      </div>
    </div>
  </div>
);

const Certificate = ({
  studentName,
  completionDate,
  headSignatureName = "Muhammad Saffi Ullah",
  issueDate,
  signature = "Muhammad Ishaq",
}) => {
  const previewShellRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  useLayoutEffect(() => {
    const element = previewShellRef.current;
    if (!element) return undefined;

    const updateScale = () => {
      const availableWidth = element.clientWidth;
      if (!availableWidth) return;

      setPreviewScale(Math.min(availableWidth / EXPORT_WIDTH, 1));
    };

    updateScale();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateScale);
      return () => window.removeEventListener("resize", updateScale);
    }

    const observer = new ResizeObserver(updateScale);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const handleDownload = async () => {
    try {
      setLoading(true);

      const pdf = new jsPDF({
        compress: true,
        format: "a4",
        orientation: "landscape",
        unit: "mm",
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const availableWidth = pdfWidth - PDF_PAGE_MARGIN * 2;
      const availableHeight = pdfHeight - PDF_PAGE_MARGIN * 2;
      const scale = Math.min(
        availableWidth / EXPORT_WIDTH,
        availableHeight / EXPORT_HEIGHT,
      );
      const certificateWidth = EXPORT_WIDTH * scale;
      const certificateHeight = EXPORT_HEIGHT * scale;
      const certificateX = (pdfWidth - certificateWidth) / 2;
      const certificateY = (pdfHeight - certificateHeight) / 2;
      const toX = (value) => certificateX + value * scale;
      const toY = (value) => certificateY + value * scale;
      const toSize = (value) => value * scale;
      const centerX = certificateX + certificateWidth / 2;

      const [
        logoImageData,
        headSignatureImageData,
        principalSignatureImageData,
      ] = await Promise.all([
        imageToDataUrl(sundarLogo),
        imageToDataUrl(headSignature, "brightness(0.1)"),
        imageToDataUrl(principalSignature),
      ]);

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdfWidth, pdfHeight, "F");

      const setScaledFontPx = (pixels) => {
        pdf.setFontSize(pixels * scale * 2.8346456693);
      };

      const drawSignatureBlock = ({
        imageData,
        imageHeight,
        imageWidth,
        lineCenter,
        name,
        role,
      }) => {
        const pdfImageWidth = toSize(imageWidth);
        const pdfImageHeight = toSize(imageHeight);
        const lineY = toY(690);
        const imageBottomY = lineY - toSize(6);
        const imageY = imageBottomY - pdfImageHeight;

        pdf.addImage(
          imageData,
          "PNG",
          lineCenter - pdfImageWidth / 2,
          imageY,
          pdfImageWidth,
          pdfImageHeight,
        );

        setHexColor(pdf, "setDrawColor", "#111827");
        pdf.setLineWidth(toSize(1));
        pdf.line(
          lineCenter - toSize(85),
          lineY,
          lineCenter + toSize(85),
          lineY,
        );

        setScaledFontPx(15);
        pdf.setFont("helvetica", "bold");
        setHexColor(pdf, "setTextColor", "#111827");
        if (name) {
          pdf.text(name, lineCenter, toY(700), {
            align: "center",
            baseline: "top",
          });
        }

        setScaledFontPx(14);
        pdf.setFont("helvetica", "normal");
        setHexColor(pdf, "setTextColor", "#374151");
        pdf.text(role, lineCenter, toY(724), {
          align: "center",
          baseline: "top",
        });
      };

      const outerBorderWidth = toSize(4);
      setHexColor(pdf, "setDrawColor", "#b91c1c");
      pdf.setLineWidth(outerBorderWidth);
      pdf.rect(
        certificateX + outerBorderWidth / 2,
        certificateY + outerBorderWidth / 2,
        certificateWidth - outerBorderWidth,
        certificateHeight - outerBorderWidth,
      );

      const cornerOffset = toSize(12);
      const cornerLength = toSize(24);
      const cornerStroke = toSize(3);

      pdf.setLineWidth(cornerStroke);
      pdf.line(
        certificateX + cornerOffset,
        certificateY + cornerOffset,
        certificateX + cornerOffset + cornerLength,
        certificateY + cornerOffset,
      );
      pdf.line(
        certificateX + cornerOffset,
        certificateY + cornerOffset,
        certificateX + cornerOffset,
        certificateY + cornerOffset + cornerLength,
      );
      pdf.line(
        certificateX + certificateWidth - cornerOffset,
        certificateY + cornerOffset,
        certificateX + certificateWidth - cornerOffset - cornerLength,
        certificateY + cornerOffset,
      );
      pdf.line(
        certificateX + certificateWidth - cornerOffset,
        certificateY + cornerOffset,
        certificateX + certificateWidth - cornerOffset,
        certificateY + cornerOffset + cornerLength,
      );
      pdf.line(
        certificateX + cornerOffset,
        certificateY + certificateHeight - cornerOffset,
        certificateX + cornerOffset + cornerLength,
        certificateY + certificateHeight - cornerOffset,
      );
      pdf.line(
        certificateX + cornerOffset,
        certificateY + certificateHeight - cornerOffset,
        certificateX + cornerOffset,
        certificateY + certificateHeight - cornerOffset - cornerLength,
      );
      pdf.line(
        certificateX + certificateWidth - cornerOffset,
        certificateY + certificateHeight - cornerOffset,
        certificateX + certificateWidth - cornerOffset - cornerLength,
        certificateY + certificateHeight - cornerOffset,
      );
      pdf.line(
        certificateX + certificateWidth - cornerOffset,
        certificateY + certificateHeight - cornerOffset,
        certificateX + certificateWidth - cornerOffset,
        certificateY + certificateHeight - cornerOffset - cornerLength,
      );

      const logoWidth = toSize(120);
      const logoHeight = toSize(120);
      const logoY = toY(40);
      pdf.addImage(
        logoImageData,
        "PNG",
        centerX - logoWidth / 2,
        logoY,
        logoWidth,
        logoHeight,
      );

      setScaledFontPx(33);
      pdf.setFont("helvetica", "bold");
      setHexColor(pdf, "setTextColor", "#b91c1c");
      pdf.text("SundarSTEM School", centerX, toY(170), {
        align: "center",
        baseline: "top",
      });

      setScaledFontPx(14);
      pdf.setFont("helvetica", "normal");
      setHexColor(pdf, "setTextColor", "#374151");
      pdf.text("Virtual SundarSTEM Program", centerX, toY(208), {
        align: "center",
        baseline: "top",
      });

      setScaledFontPx(21);
      pdf.setFont("helvetica", "bold");
      setHexColor(pdf, "setTextColor", "#111827");
      pdf.text("CERTIFICATE OF COMPLETION", centerX, toY(242), {
        align: "center",
        baseline: "top",
      });

      setScaledFontPx(14);
      pdf.setFont("helvetica", "normal");
      setHexColor(pdf, "setTextColor", "#4b5563");
      pdf.text("This is proudly presented to", centerX, toY(286), {
        align: "center",
        baseline: "top",
      });

      setScaledFontPx(28);
      pdf.setFont("helvetica", "bold");
      const studentNameLines = pdf.splitTextToSize(
        String(studentName ?? "").trim() || "Certificate Recipient",
        toSize(820),
      );
      const studentNameWidths = studentNameLines.map((line) =>
        pdf.getTextWidth(line),
      );
      const studentNameBoxWidth = Math.min(
        Math.max(...studentNameWidths, 0) + toSize(44),
        toSize(930),
      );
      const studentNameLineHeight = toSize(28 * 1.16);
      const studentNamePaddingY = toSize(8);
      const studentNameBoxHeight =
        studentNameLines.length * studentNameLineHeight +
        studentNamePaddingY * 2;
      const studentNameBoxX = centerX - studentNameBoxWidth / 2;
      const studentNameBoxY = toY(322);

      pdf.setFillColor(254, 243, 242);
      pdf.rect(
        studentNameBoxX,
        studentNameBoxY,
        studentNameBoxWidth,
        studentNameBoxHeight,
        "F",
      );
      setHexColor(pdf, "setDrawColor", "#b91c1c");
      pdf.setLineWidth(toSize(3));
      pdf.line(
        studentNameBoxX,
        studentNameBoxY,
        studentNameBoxX,
        studentNameBoxY + studentNameBoxHeight,
      );
      pdf.line(
        studentNameBoxX + studentNameBoxWidth,
        studentNameBoxY,
        studentNameBoxX + studentNameBoxWidth,
        studentNameBoxY + studentNameBoxHeight,
      );

      setHexColor(pdf, "setTextColor", "#111827");
      pdf.setLineHeightFactor(1.16);
      pdf.text(
        studentNameLines,
        centerX,
        studentNameBoxY + studentNamePaddingY,
        {
          align: "center",
          baseline: "top",
        },
      );

      setScaledFontPx(14);
      pdf.setFont("helvetica", "normal");
      setHexColor(pdf, "setTextColor", "#374151");
      const programTextLines = pdf.splitTextToSize(
        CERTIFICATE_BODY_TEXT,
        toSize(900),
      );
      const programTextY = studentNameBoxY + studentNameBoxHeight + toSize(24);
      const programLineHeight = toSize(14 * 1.45);
      pdf.setLineHeightFactor(1.45);
      pdf.text(programTextLines, centerX, programTextY, {
        align: "center",
        baseline: "top",
      });
      pdf.setLineHeightFactor(1.15);

      const dateBoxWidth = toSize(205);
      const dateBoxGap = toSize(16);
      const dateBoxHeight = toSize(48);
      const dateBoxY =
        programTextY + programTextLines.length * programLineHeight + toSize(26);
      const dateRowWidth = dateBoxWidth * 2 + dateBoxGap;
      const dateBoxX = centerX - dateRowWidth / 2;

      const drawDateBox = (x, label, value) => {
        pdf.setLineWidth(toSize(1));
        setHexColor(pdf, "setDrawColor", "#e5e7eb");
        pdf.rect(x, dateBoxY, dateBoxWidth, dateBoxHeight);

        setScaledFontPx(9);
        pdf.setFont("helvetica", "normal");
        setHexColor(pdf, "setTextColor", "#6b7280");
        pdf.text(label, x + dateBoxWidth / 2, dateBoxY + toSize(10), {
          align: "center",
          baseline: "top",
        });

        setScaledFontPx(13);
        pdf.setFont("helvetica", "bold");
        setHexColor(pdf, "setTextColor", "#111827");
        pdf.text(value || "-", x + dateBoxWidth / 2, dateBoxY + toSize(24), {
          align: "center",
          baseline: "top",
          maxWidth: dateBoxWidth - toSize(16),
        });
      };

      drawDateBox(dateBoxX, "COMPLETION DATE", formatDate(completionDate));
      drawDateBox(
        dateBoxX + dateBoxWidth + dateBoxGap,
        "ISSUE DATE",
        formatDate(issueDate),
      );

      drawSignatureBlock({
        imageData: headSignatureImageData,
        imageWidth: 100,
        imageHeight: 100,
        lineCenter: toX(285),
        name: headSignatureName,
        role: HEAD_SIGNATURE_ROLE,
      });
      drawSignatureBlock({
        imageData: principalSignatureImageData,
        imageWidth: 90,
        imageHeight: 70,
        lineCenter: toX(837),
        name: signature,
        role: PRINCIPAL_SIGNATURE_ROLE,
      });

      pdf.save(buildFileName(studentName));
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const previewHeight = Math.max(EXPORT_HEIGHT * previewScale, 1);
  const previewTransform = `translateX(-50%) scale(${previewScale})`;
  const artworkProps = {
    completionDate,
    headSignatureName,
    issueDate,
    signature,
    studentName,
  };

  return (
    <div className="certificate-viewer">
      <div className="certificate-preview-shell">
        <div ref={previewShellRef} className="certificate-preview-shell__inner">
          <div
            className="certificate-preview-stage"
            style={{ height: `${previewHeight}px` }}
          >
            <div
              className="certificate-preview-transform"
              style={{ transform: previewTransform }}
            >
              <div
                className="certificate-pdf certificate-pdf--preview"
                style={{
                  height: `${EXPORT_HEIGHT}px`,
                  width: `${EXPORT_WIDTH}px`,
                }}
              >
                <CertificateArtwork {...artworkProps} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="download-btn-wrapper">
        <button
          className="download-btn"
          onClick={handleDownload}
          disabled={loading}
        >
          {loading ? "Generating PDF..." : "Download Certificate (PDF)"}
        </button>
      </div>
    </div>
  );
};

export default Certificate;
