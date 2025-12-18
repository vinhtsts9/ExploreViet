import React, { useState } from "react";
import { Filter as FilterIcon, X, SlidersHorizontal } from "lucide-react";
import "./Filter.css";

const Filter = ({ onFilterChange, posts = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    province: "",
    category: "",
    sortBy: "newest", // newest, popular, rating, likes
    minRating: 0,
  });

  // Extract unique provinces from posts
  const provinces = [
    ...new Set(
      posts
        .map((p) => p.location)
        .filter(Boolean)
        .map((loc) => {
          // Try to extract province from location string
          const parts = loc.split(",");
          return parts[parts.length - 1]?.trim() || loc;
        })
    ),
  ].sort();

  const categories = [
    { value: "", label: "Tất cả" },
    { value: "beach", label: "Biển" },
    { value: "mountain", label: "Núi" },
    { value: "culture", label: "Văn hóa" },
    { value: "food", label: "Ẩm thực" },
    { value: "adventure", label: "Phiêu lưu" },
    { value: "relax", label: "Nghỉ dưỡng" },
  ];

  const sortOptions = [
    { value: "newest", label: "Mới nhất" },
    { value: "popular", label: "Phổ biến nhất" },
    { value: "rating", label: "Đánh giá cao nhất" },
    { value: "likes", label: "Nhiều like nhất" },
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      province: "",
      category: "",
      sortBy: "newest",
      minRating: 0,
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const hasActiveFilters =
    filters.province || filters.category || filters.minRating > 0;

  return (
    <div className="filter-container">
      <button
        className="filter-toggle-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <SlidersHorizontal size={20} />
        <span>Bộ lọc</span>
        {hasActiveFilters && <span className="filter-badge"></span>}
      </button>

      {isOpen && (
        <div className="filter-panel">
          <div className="filter-header">
            <h3>Bộ lọc tìm kiếm</h3>
            <button className="filter-close" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="filter-content">
            {/* Province Filter */}
            <div className="filter-group">
              <label>Tỉnh/Thành phố</label>
              <select
                value={filters.province}
                onChange={(e) => handleFilterChange("province", e.target.value)}
                className="filter-select"
              >
                <option value="">Tất cả</option>
                {provinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="filter-group">
              <label>Loại địa điểm</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="filter-select"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div className="filter-group">
              <label>Đánh giá tối thiểu</label>
              <div className="rating-filter">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    className={`rating-option ${
                      filters.minRating >= rating ? "active" : ""
                    }`}
                    onClick={() =>
                      handleFilterChange(
                        "minRating",
                        filters.minRating === rating ? 0 : rating
                      )
                    }
                  >
                    ★
                  </button>
                ))}
                {filters.minRating > 0 && (
                  <span className="rating-text">
                    {filters.minRating}+ sao
                  </span>
                )}
              </div>
            </div>

            {/* Sort Options */}
            <div className="filter-group">
              <label>Sắp xếp theo</label>
              <div className="sort-options">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`sort-option ${
                      filters.sortBy === option.value ? "active" : ""
                    }`}
                    onClick={() => handleFilterChange("sortBy", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button className="filter-reset" onClick={handleReset}>
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Filter;
