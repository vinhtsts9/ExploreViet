import React, { useState, useEffect, useRef } from "react";
import {
  List,
  Share2,
  Tag,
  MapPin,
  Clock,
  Navigation,
  Copy,
  Check,
  Facebook,
  Twitter,
} from "lucide-react";
import Rating from "./Rating";
import WishlistButton from "./WishlistButton";
import WeatherForLocation from "./WeatherForLocation";
import "./PostDetailLeftSidebar.css";

const PostDetailLeftSidebar = ({
  post,
  currentUser,
  onPostClick,
  currentUserId,
  postRating = 0,
  ratingCount = 0,
  userRating = 0,
  onRate,
  postId,
}) => {
  const [tableOfContents, setTableOfContents] = useState([]);
  const [activeSection, setActiveSection] = useState("");
  const [copied, setCopied] = useState(false);

  // Generate Table of Contents from content blocks
  useEffect(() => {
    if (!post?.content || !Array.isArray(post.content)) return;

    const toc = [];
    post.content.forEach((block, index) => {
      if (block.type === "text" && block.content) {
        // Extract headings from text (lines starting with #)
        const lines = block.content.split("\n");
        lines.forEach((line, lineIndex) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("# ")) {
            toc.push({
              id: `section-${index}-${lineIndex}`,
              title: trimmed.substring(2).trim(),
              level: 1,
            });
          } else if (trimmed.startsWith("## ")) {
            toc.push({
              id: `section-${index}-${lineIndex}`,
              title: trimmed.substring(3).trim(),
              level: 2,
            });
          }
        });
      }
    });
    setTableOfContents(toc);
  }, [post]);

  // Track scroll position for active section
  useEffect(() => {
    if (tableOfContents.length === 0) return;

    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      let current = "";

      tableOfContents.forEach((item) => {
        const element = document.getElementById(item.id);
        if (element && element.offsetTop <= scrollPos) {
          current = item.id;
        }
      });

      setActiveSection(current || tableOfContents[0]?.id);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, [tableOfContents]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = post.title;
    const text = `${post.title} - ${post.location}`;

    switch (platform) {
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          "_blank"
        );
        break;
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
          "_blank"
        );
        break;
      case "copy":
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        break;
      default:
        break;
    }
  };

  // Get tags from post (if available)
  const tags = post.tags || [];
  const categories = post.category ? [post.category] : [];

  return (
    <aside className="post-detail-left-sidebar">
      {/* Weather Widget */}
      {post.location && (
        <div className="sidebar-widget weather-widget-sidebar">
          <WeatherForLocation 
            locationName={post.location}
            coordinates={post.coordinates}
            postId={postId}
          />
        </div>
      )}

      {/* Rating Section */}
      <div className="sidebar-widget rating-widget">
        <div className="widget-header">
          <span>⭐</span>
          <h3>Đánh giá</h3>
        </div>
        <div className="rating-widget-content">
          <div className="rating-display-compact">
            <Rating
              rating={postRating}
              showText={true}
              showCount={true}
              ratingCount={ratingCount}
              size={20}
            />
          </div>
          {currentUserId && (
            <div className="rating-input-compact">
              <span className="rating-label-compact">Đánh giá của bạn:</span>
              <Rating
                rating={userRating}
                onRate={onRate}
                interactive={true}
                size={24}
              />
            </div>
          )}
          {currentUserId && (
            <div className="wishlist-section-compact">
              <WishlistButton postId={post.id} userId={currentUserId} size={20} />
              <span>Thêm vào yêu thích</span>
            </div>
          )}
        </div>
      </div>

      {/* Table of Contents */}
      {tableOfContents.length > 0 && (
        <div className="sidebar-widget toc-widget">
          <div className="widget-header">
            <List size={18} />
            <h3>Mục lục</h3>
          </div>
          <nav className="toc-list">
            {tableOfContents.map((item) => {
              const paddingLeft = `${(item.level - 1) * 1 + 0.5}rem`;
              return (
                <button
                  key={item.id}
                  className={`toc-item ${activeSection === item.id ? "active" : ""}`}
                  onClick={() => scrollToSection(item.id)}
                  style={{ paddingLeft }}
                >
                  {item.title}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Social Share */}
      <div className="sidebar-widget social-share-widget">
        <div className="widget-header">
          <Share2 size={18} />
          <h3>Chia sẻ</h3>
        </div>
        <div className="social-share-buttons">
          <button
            onClick={() => handleShare("facebook")}
            className="social-btn facebook-btn"
            title="Chia sẻ lên Facebook"
          >
            <Facebook size={18} />
          </button>
          <button
            onClick={() => handleShare("twitter")}
            className="social-btn twitter-btn"
            title="Chia sẻ lên Twitter"
          >
            <Twitter size={18} />
          </button>
          <button
            onClick={() => handleShare("copy")}
            className={`social-btn copy-btn ${copied ? "copied" : ""}`}
            title="Sao chép liên kết"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      {/* Tags */}
      {(tags.length > 0 || categories.length > 0) && (
        <div className="sidebar-widget tags-widget">
          <div className="widget-header">
            <Tag size={18} />
            <h3>Thẻ & Danh mục</h3>
          </div>
          <div className="tags-list">
            {categories.map((cat, idx) => (
              <span key={`cat-${idx}`} className="tag-item category-tag">
                {cat}
              </span>
            ))}
            {tags.map((tag, idx) => (
              <span key={`tag-${idx}`} className="tag-item">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Location Quick Info */}
      {post.location && (
        <div className="sidebar-widget location-info-widget">
          <div className="widget-header">
            <MapPin size={18} />
            <h3>Thông tin địa điểm</h3>
          </div>
          <div className="location-info-content">
            <div className="location-name-display">
              <MapPin size={16} />
              <span>{post.location}</span>
            </div>
            {post.coordinates && Array.isArray(post.coordinates) && (
              <div className="location-coords">
                <span className="coord-label">Tọa độ:</span>
                <span className="coord-value">
                  {post.coordinates[0].toFixed(6)}, {post.coordinates[1].toFixed(6)}
                </span>
              </div>
            )}
            <div className="location-tips">
              <Clock size={14} />
              <span>Thời gian tốt nhất: Quanh năm</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default PostDetailLeftSidebar;

