import React from "react";
import { TrendingUp, Filter, Tag, MapPin, Sparkles } from "lucide-react";
import "./LeftSidebar.css";

const LeftSidebar = ({ posts, onFilterClick, onTagClick, activeCategory = "", user = null }) => {
  // Filter posts giống như logic trong App.jsx - chỉ đếm approved posts
  const getVisiblePosts = () => {
    return posts.filter((p) => {
      // Show all posts for the post owner
      if (p.userId === user?.uid) return true;
      // Show only approved posts for other users
      return p.status === "approved" || !p.status; // !p.status for backward compatibility
    });
  };

  // Normalize location name để group các biến thể (ví dụ: "Hà Nội" và "Hà Nội, Việt Nam")
  const normalizeLocationForGrouping = (location) => {
    if (!location) return "Unknown";
    // Lấy phần đầu tiên trước dấu phẩy, trim và lowercase
    const parts = location.split(",");
    return parts[0].trim().toLowerCase();
  };

  // Tính toán trending destinations từ posts đã filter
  const getTrendingDestinations = () => {
    const visiblePosts = getVisiblePosts();
    const locationCounts = {};
    
    visiblePosts.forEach((post) => {
      const location = post.location || "Unknown";
      // Normalize location để group các biến thể
      const locationKey = normalizeLocationForGrouping(location);
      
      if (!locationCounts[locationKey]) {
        locationCounts[locationKey] = {
          displayName: location.split(",")[0].trim(), // Lấy phần đầu để hiển thị
          count: 0
        };
      }
      locationCounts[locationKey].count++;
    });

    return Object.entries(locationCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([locationKey, data]) => ({ 
        location: data.displayName, 
        count: data.count 
      }));
  };

  // Lấy popular tags từ posts đã filter
  const getPopularTags = () => {
    const visiblePosts = getVisiblePosts();
    const tagCounts = {};
    
    visiblePosts.forEach((post) => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
  };

  const trendingDestinations = getTrendingDestinations();
  const popularTags = getPopularTags();

  const quickFilters = [
    { id: "beach", label: "🏖️ Biển", icon: "🌊" },
    { id: "mountain", label: "⛰️ Núi", icon: "🏔️" },
    { id: "culture", label: "🏛️ Văn hóa", icon: "🎭" },
    { id: "food", label: "🍜 Ẩm thực", icon: "🍽️" },
    { id: "adventure", label: "🎯 Phiêu lưu", icon: "🧗" },
  ];

  return (
    <aside className="left-sidebar">
      {/* Trending Destinations */}
      <div className="sidebar-widget">
        <div className="widget-header">
          <TrendingUp size={20} />
          <h3>Địa điểm nổi bật</h3>
        </div>
        <div className="widget-content">
          {trendingDestinations.length > 0 ? (
            <ul className="trending-list">
              {trendingDestinations.map((item, index) => (
                <li
                  key={index}
                  className="trending-item"
                  onClick={() => onFilterClick && onFilterClick(item.location)}
                >
                  <span className="trending-rank">#{index + 1}</span>
                  <div className="trending-info">
                    <span className="trending-location">{item.location}</span>
                    <span className="trending-count">{item.count} bài viết</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Chưa có dữ liệu</p>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="sidebar-widget">
        <div className="widget-header">
          <Filter size={20} />
          <h3>Lọc nhanh</h3>
        </div>
        <div className="widget-content">
          <div className="quick-filters">
            {quickFilters.map((filter) => (
              <button
                key={filter.id}
                className={`quick-filter-btn ${activeCategory === filter.id ? "active" : ""}`}
                onClick={() => onFilterClick && onFilterClick(filter.id)}
              >
                <span className="filter-icon">{filter.icon}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Tags */}
      {popularTags.length > 0 && (
        <div className="sidebar-widget">
          <div className="widget-header">
            <Tag size={20} />
            <h3>Tags phổ biến</h3>
          </div>
          <div className="widget-content">
            <div className="tags-list">
              {popularTags.map((item, index) => (
                <button
                  key={index}
                  className="tag-item"
                  onClick={() => onTagClick && onTagClick(item.tag)}
                >
                  {item.tag}
                  <span className="tag-count">{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Travel Tips */}
      <div className="sidebar-widget">
        <div className="widget-header">
          <Sparkles size={20} />
          <h3>Mẹo du lịch</h3>
        </div>
        <div className="widget-content">
          <div className="travel-tips">
            <div className="tip-item">
              <span className="tip-icon">💡</span>
              <p>Nên đặt vé sớm để có giá tốt nhất</p>
            </div>
            <div className="tip-item">
              <span className="tip-icon">📱</span>
              <p>Lưu bản đồ offline để tiết kiệm data</p>
            </div>
            <div className="tip-item">
              <span className="tip-icon">🌤️</span>
              <p>Kiểm tra thời tiết trước khi đi</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;





