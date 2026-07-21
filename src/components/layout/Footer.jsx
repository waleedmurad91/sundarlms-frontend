import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  TwitchIcon,
  Twitter,
  Youtube,
} from "lucide-react";
import footerLogo from "@/assets/sundar-footer-logo.png";

const Footer = () => {
  return (
    <footer>
      <div className="containerLayout">
        <div className="footer-wrap">
          <div className="footer-logo">
            <img src={footerLogo} alt="Sundar Stem Logo" />
            <p>
              Empowering young learners across Pakistan with world-class
              Mathematics and Computer Science education to build tomorrow's
              innovators.
            </p>
          </div>

          <div className="footer-links">
            <h1>Quick Links</h1>
            <ul className="footer-links-ul">
              <a href="/">Home</a>
              <a href="/sundarstem-lms/pmc">PMC</a>
              {/* <a href="#">Stage 5</a> */}
            </ul>
          </div>

          <div className="footer-links">
            <h1>Follow Us</h1>
            <ul className="social-links-ul">
              <div>
                <a href="https://www.facebook.com/share/1EQguxrfhe/?mibextid=wwXIfr">
                  <Facebook />
                </a>
                <a href="#">
                  <Linkedin />
                </a>
                <a href="#">
                  <Instagram />
                </a>
              </div>
              <div>
                <a href="#">
                  <Youtube />
                </a>
                <a href="#">
                  <Twitter />
                </a>
              </div>
            </ul>
          </div>

          <div className="footer-links">
            <h1>Contact Info</h1>
            <div className="footer-contact">
              <div className="fc-icon">
                <div className="icon-wrap">
                  <MapPin />
                </div>
              </div>
              <div className="fc-content">
                <h2>SundarStem School</h2>
                <p>Lahore, Pakistan</p>
              </div>
            </div>

            <div className="footer-contact">
              <div className="fc-icon">
                <div className="icon-wrap">
                  <Phone />
                </div>
              </div>
              <div className="fc-content">
                <h2>+92 329 4044024</h2>
              </div>
            </div>

            <div className="footer-contact">
              <div className="fc-icon">
                <div className="icon-wrap">
                  <Mail />
                </div>
              </div>
              <div className="fc-content">
                <h2>info@sundarstem.edu.pk</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="copyright-bar">
        &copy; 2021 - 2025 SundarSTEM School. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
