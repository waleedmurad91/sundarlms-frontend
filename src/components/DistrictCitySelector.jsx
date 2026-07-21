import React, { useState, useEffect } from "react";
import { getDistricts, getCitiesByDistrict } from "@/api/authApi";
import SearchableMultiSelect from "./common/SearchableMultiSelect";

const DistrictCitySelector = ({
  district,
  city,
  onDistrictChange,
  onCityChange,
  disabled = false,
  icon,
  labelClass,
  asterikColor,
}) => {
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);

  useEffect(() => {
    const fetchDistricts = async () => {
      setDistrictLoading(true);
      try {
        const response = await getDistricts();
        const data = response?.data || response || [];
        setDistricts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch districts:", error);
      } finally {
        setDistrictLoading(false);
      }
    };
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (district) {
      const fetchCities = async () => {
        setCityLoading(true);
        try {
          const response = await getCitiesByDistrict(district);
          const data =
            response?.data?.cities ||
            response?.cities ||
            response?.data ||
            response ||
            [];
          setCities(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Failed to fetch cities:", error);
        } finally {
          setCityLoading(false);
        }
      };
      fetchCities();
    } else {
      setCities([]);
    }
  }, [district]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <label
          className={`block text-sm font-medium text-gray-700 mb-1 ${labelClass || ""}`}
        >
          {icon} Province{" "}
          <span className={`${asterikColor || "text-black"}`}>*</span>
        </label>
        <SearchableMultiSelect
          options={districts}
          value={district}
          multiple={false}
          onChange={onDistrictChange}
          placeholder="Search province..."
          disabled={disabled || districtLoading}
          loading={districtLoading}
          emptyState="No province found"
          valueKey="id"
          labelKey="name"
        />
      </div>
      <div>
        <label
          className={`block text-sm font-medium text-gray-700 mb-1 ${labelClass || ""}`}
        >
          {icon} City{" "}
          <span className={`${asterikColor || "text-black"}`}>*</span>
        </label>
        <SearchableMultiSelect
          options={cities}
          value={city}
          multiple={false}
          onChange={onCityChange}
          placeholder="Search cities..."
          disabled={disabled || !district || cityLoading}
          loading={cityLoading}
          emptyState={district ? "No cities found" : "Select a district first"}
          valueKey="id"
          labelKey="name"
        />
      </div>
    </div>
  );
};

export default DistrictCitySelector;
