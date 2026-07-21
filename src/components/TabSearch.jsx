import React from "react";
import { Search } from "lucide-react";

const TabSearch = ({ value, onChange, placeholder = "Search..." }) => (
  <div className="tab-search">
    <Search size={16} className="text-[#767676]" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

export default TabSearch;
