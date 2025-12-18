import React from "react";
import { Users, Clock, Star, TrendingUp, User } from "lucide-react";
import "./RightSidebar.css";

const RightSidebar = ({ posts, users, onPostClick }) => {
  // Top Contributors
  const getTopContributors = () => {
    const userPostCounts = {};
    posts.forEach((post) => {
      const userId = post.userId;
      const userName = post.authorName || "Anonymous";
      const userPhoto = post.authorPhoto || null;
      
      if (userId && userId !== "gemini_ai") {
        if (!userPostCounts[userId]) {
          userPostCounts[userId] = {
            name: userName,
            photo: userPhoto,
            count: 0,
          };
        }
        userPostCounts[userId].count++;
      }
    });

    return Object.values(userPostCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // Recent Activity
  const getRecentActivity = () => {
    return posts
      .filter((post) => post.createdAt)
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  };

  // Featured Posts (high rating or many likes)
  const getFeaturedPosts = () => {
    return posts
      .map((post) => ({
        ...post,
        score: (post.rating || 0) * 10 + (post.likedBy?.length || 0) * 2,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  const topContributors = getTopContributors();
  const recentActivity = getRecentActivity();
  const featuredPosts = getFeaturedPosts();

  const formatTimeAgo = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "Vừa xong";
    
    const now = new Date();
    const postDate = new Date(timestamp.seconds * 1000);
    const diffMs = now - postDate;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Vừa xong";
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return postDate.toLocaleDateString("vi-VN");
  };

  return (
    <aside className="right-sidebar">
      {/* Top Contributors */}
      <div className="sidebar-widget">
        <div className="widget-header">
          <Users size={20} />
          <h3>Top đóng góp</h3>
        </div>
        <div className="widget-content">
          {topContributors.length > 0 ? (
            <ul className="contributors-list">
              {topContributors.map((contributor, index) => (
                <li key={index} className="contributor-item">
                  <span className="contributor-rank">#{index + 1}</span>
                  <div className="contributor-avatar">
                    {contributor.photo ? (
                      <img
                        src={contributor.photo}
                        alt={contributor.name}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="contributor-avatar-placeholder"
                      style={{ display: contributor.photo ? "none" : "flex" }}
                    >
                      <User size={16} />
                    </div>
                  </div>
                  <div className="contributor-info">
                    <span className="contributor-name">{contributor.name}</span>
                    <span className="contributor-count">
                      {contributor.count} bài viết
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Chưa có dữ liệu</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="sidebar-widget">
        <div className="widget-header">
          <Clock size={20} />
          <h3>Hoạt động gần đây</h3>
        </div>
        <div className="widget-content">
          {recentActivity.length > 0 ? (
            <ul className="activity-list">
              {recentActivity.map((post) => (
                <li
                  key={post.id}
                  className="activity-item"
                  onClick={() => onPostClick && onPostClick(post)}
                >
                  <div className="activity-content">
                    <span className="activity-title">
                      {post.title || post.location || "Bài viết mới"}
                    </span>
                    <span className="activity-meta">
                      {post.authorName || "Anonymous"} • {formatTimeAgo(post.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Chưa có hoạt động</p>
          )}
        </div>
      </div>

      {/* Featured Posts */}
      <div className="sidebar-widget">
        <div className="widget-header">
          <Star size={20} />
          <h3>Bài viết nổi bật</h3>
        </div>
        <div className="widget-content">
          {featuredPosts.length > 0 ? (
            <div className="featured-posts">
              {featuredPosts.map((post) => (
                <div
                  key={post.id}
                  className="featured-post-item"
                  onClick={() => onPostClick && onPostClick(post)}
                >
                  {post.contents && post.contents.length > 0 && (
                    <div className="featured-post-image">
                      {post.contents.find((c) => c.type === "image") ? (
                        <img
                          src={
                            post.contents.find((c) => c.type === "image")?.value
                          }
                          alt={post.title || post.location}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="featured-post-placeholder">
                          <MapPin size={24} />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="featured-post-info">
                    <h4 className="featured-post-title">
                      {post.title || post.location || "Bài viết"}
                    </h4>
                    <div className="featured-post-stats">
                      {post.rating && (
                        <span className="featured-rating">
                          <Star size={14} />
                          {post.rating.toFixed(1)}
                        </span>
                      )}
                      {post.likedBy && (
                        <span className="featured-likes">
                          ❤️ {post.likedBy.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Chưa có bài viết nổi bật</p>
          )}
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;





