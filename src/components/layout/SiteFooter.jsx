import { useState } from "react";
import { Facebook, Instagram, Youtube, Mail, Phone, Copy, Check, Calendar } from "lucide-react";
import footerLogo from "../../assets/ilm-logo.png";
import EventCalendarModal from "../../components/common/EventCalendarModal";
import "./FooterNew.css";

const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Small popup card shown on hover, with the value + copy button
const ContactPopup = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="footer-contact-popup">
      <span className="footer-contact-popup-text">{value}</span>
      <button
        type="button"
        className="footer-contact-popup-copy"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
};

const SiteFooter = () => {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <>
      <footer className="footer">
        <div className="container">
          <div className="footer-bar">
            {/* LEFT: Social Icons */}
            <div className="footer-socials">
              <a
                href="https://www.facebook.com/share/1EQguxrfhe/?mibextid=wwXIf"
                target="_blank"
                rel="noreferrer"
                className="footer-social-icon"
              >
                <Facebook size={16} />
              </a>

              <a
                href="https://x.com/SundarSschool"
                target="_blank"
                rel="noreferrer"
                className="footer-social-icon"
              >
                <XIcon size={16} />
              </a>

              <a
                href="https://www.youtube.com/@sundarstem1600"
                target="_blank"
                rel="noreferrer"
                className="footer-social-icon"
              >
                <Youtube size={16} />
              </a>

              <a
                href="https://www.instagram.com/sundarstem/"
                target="_blank"
                rel="noreferrer"
                className="footer-social-icon"
              >
                <Instagram size={16} />
              </a>

              <button
                type="button"
                className="footer-social-icon"
                onClick={() => setShowCalendar(true)}
                aria-label="Open event calendar"
              >
                <Calendar size={16} />
              </button>
            </div>

            {/* CENTER: Logo + Copyright */}
            <div className="footer-brand">
              <img
                src={footerLogo}
                alt="Sundar Stem Logo"
                className="footer-logo"
              />
              <span className="footer-copy">
                © 2026 Virtual SundarSTEM. All rights reserved.
              </span>
            </div>

            {/* RIGHT: Contact Info */}
            <div className="footer-contact-info">
              {/* Desktop (>768px): original text + icon links, no popup */}
              <a
                href="mailto:info@virtual.sundarstem.edu.pk"
                className="footer-contact-item footer-contact-desktop"
              >
                <Mail size={14} />
                info@virtual.sundarstem.edu.pk
              </a>

              <a
                href="tel:+923217276806"
                className="footer-contact-item footer-contact-desktop"
              >
                <Phone size={14} />
                +92 321 7276806
              </a>
            </div>

            <div className="footer-contact-info2 flex gap-[10px]">
              {/* ≥769px: icon only, hover opens popup floating to the left */}
              <div className="footer-contact-wrapper footer-contact-mobile footer-contact-email">
                <button
                  type="button"
                  className="footer-contact-item footer-contact-icon-btn"
                  aria-label="Show email"
                >
                  <Mail size={16} />
                </button>
                <ContactPopup value="info@virtual.sundarstem.edu.pk" />
              </div>

              <div className="footer-contact-wrapper footer-contact-mobile footer-contact-phone">
                <button
                  type="button"
                  className="footer-contact-item footer-contact-icon-btn"
                  aria-label="Show phone number"
                >
                  <Phone size={16} />
                </button>
                <ContactPopup value="+92 321 7276806" />
              </div>
            </div>
          </div>
        </div>
      </footer>

      {showCalendar && (
        <EventCalendarModal onClose={() => setShowCalendar(false)} />
      )}
    </>
  );
};

export default SiteFooter;