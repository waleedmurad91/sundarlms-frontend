import { Link, useLocation } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { roleLinks } from "../../utils/roleLinks";
import { cn } from "../../lib/utils";

const ROLE_TITLES = {
  admin: "Administrator",
  staff: "Staff",
  teacher: "Teacher",
  student: "Student",
  school: "School",
  data_entry: "Data Entry",
  reviewer: "Reviewer",
};

const Sidebar = ({
  role = "admin",
  sections: sectionsProp,
  title,
  isDesktop = true,
  isOpen = true,
  onLinkClick,
}) => {
  const location = useLocation();
  const sections = sectionsProp ?? roleLinks[role] ?? [];
  const roleTitle = title ?? ROLE_TITLES[role] ?? "User";

  const isActivePath = (path) =>
    path && location.pathname.toLowerCase().startsWith(path.toLowerCase());

  const handleLinkSelect = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <aside
      className={cn(
        "sidebar flex flex-col h-[calc(100dvh-64px)] overflow-hidden",
        isDesktop ? "sidebar--static" : "sidebar--floating",
        isOpen && "sidebar--open"
      )}
    >
      <div className="sidebar-title flex-shrink-0">
        <h1>{roleTitle}</h1>
      </div>

      <div className="sidebar-links flex-1 overflow-y-auto overflow-x-hidden pb-10 scroll-pb-6">
        {/* Loop through each section */}
        {sections.map((section) => (
          <div key={section.section} className="sidebar-section">
            {/* Section heading */}
            <h2 className="sidebar-section-heading">{section.section}</h2>

            <ul>
              {section.items.map((item) => {
                const hasChildren =
                  Array.isArray(item.children) && item.children.length > 0;
                const childActive = hasChildren
                  ? item.children.some((child) => isActivePath(child.path))
                  : false;

                // Render direct link (no children)
                if (!hasChildren) {
                  return (
                    <li key={item.path ?? item.label}>
                      <Link
                        to={item.path ?? "#"}
                        className={cn(
                          "sidebar-link",
                          isActivePath(item.path) && "active"
                        )}
                        onClick={handleLinkSelect}
                      >
                        {item.label}
                        {/* <ChevronRight size={14} /> */}
                      </Link>
                    </li>
                  );
                }

                // Render accordion group
                return (
                  <li key={item.label}>
                    <Accordion
                      type="multiple"
                      collapsible
                      defaultValue={[item.label]}
                      className="sidebar-accordion"
                    >
                      <AccordionItem value={item.label}>
                        <AccordionTrigger
                          className={cn(
                            "sidebar-trigger",
                            childActive && "active"
                          )}
                        >
                          {item.label}
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="sidebar-submenu">
                            {item.children.map((child) => (
                              <li key={child.path ?? child.label}>
                                <Link
                                  to={child.path ?? "#"}
                                  className={cn(
                                    "sidebar-link",
                                    isActivePath(child.path) && "active"
                                  )}
                                  onClick={handleLinkSelect}
                                >
                                  {child.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;