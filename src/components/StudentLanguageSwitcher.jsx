import { useSyncExternalStore } from "react";
import {
  persistLanguage,
  readStoredLanguage,
  subscribeLanguageChange,
} from "@/utils/studentLanguageStore";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ur", label: "اردو", ariaLabel: "Urdu", useNastaleeq: true },
  { code: "sd", label: "سنڌي", ariaLabel: "Sindhi", useNastaleeq: true },
];

const StudentLanguageSwitcher = ({ className = "" }) => {
  const language = useSyncExternalStore(
    subscribeLanguageChange,
    readStoredLanguage,
    () => "en",
  );

  return (
    <div
      className={`mobileScreen inline-flex items-center rounded-sm border border-[#d7d7d7] bg-white p-0.5 ${className}`.trim()}
      role="group"
      aria-label="Select language"
    >
      {LANGUAGES.map((option) => {
        const isActive = language === option.code;

        return (
          <button
            key={option.code}
            type="button"
            onClick={() => persistLanguage(option.code)}
            aria-label={option.ariaLabel ?? option.label}
            className={`student-language-switcher-btn inline-flex min-h-[28px] min-w-[52px] items-center justify-center rounded-sm px-3 py-1.5 text-xs font-semibold leading-none transition-colors cursor-pointer ${
              option.useNastaleeq ? (option.code === "ur" ? 'font-nastaleeq' : 'font-lateefi') : ''
            } ${
              isActive
                ? "bg-[#AD474B] text-white"
                : "!text-[#66686D] hover:bg-slate-100"
            }`}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default StudentLanguageSwitcher;
