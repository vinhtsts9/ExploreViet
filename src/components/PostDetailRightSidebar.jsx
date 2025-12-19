import React, { useMemo } from "react";
import {
  MapPin,
  Heart,
  Eye,
  MessageCircle,
  TrendingUp,
  Star,
  Clock,
  Navigation,
  Share2,
  Lightbulb,
  Cloud,
} from "lucide-react";
import "./PostDetailRightSidebar.css";

const PostDetailRightSidebar = ({
  post,
  posts = [],
  onPostClick,
  views = 0,
  commentCount = 0,
}) => {
  // Related Posts - Same Location
  const relatedPosts = useMemo(() => {
    if (!post?.location || !posts) return [];
    return posts
      .filter(
        (p) =>
          p.id !== post.id &&
          p.location &&
          p.location.toLowerCase() === post.location.toLowerCase()
      )
      .slice(0, 5);
  }, [post, posts]);

  // Popular Posts - High rating or many likes
  const popularPosts = useMemo(() => {
    if (!posts) return [];
    return posts
      .filter((p) => p.id !== post.id)
      .map((p) => ({
        ...p,
        score: (p.rating || 0) * 10 + (p.likes || 0) * 2 + (p.commentCount || 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [post, posts]);

  // Similar Locations - Based on category or tags
  const similarLocations = useMemo(() => {
    if (!post?.location || !posts) return [];
    
    // Get posts with similar characteristics
    const postCategory = post.category || "";
    const postTags = post.tags || [];
    
    return posts
      .filter((p) => {
        if (p.id === post.id) return false;
        if (p.location === post.location) return false;
        
        // Check if same category
        if (postCategory && p.category === postCategory) return true;
        
        // Check if has common tags
        if (postTags.length > 0 && p.tags) {
          const commonTags = postTags.filter((tag) => p.tags.includes(tag));
          if (commonTags.length > 0) return true;
        }
        
        return false;
      })
      .slice(0, 5);
  }, [post, posts]);

  const formatTimeAgo = (date) => {
    if (!date) return "Mới đây";
    let postDate;
    if (date && typeof date.toDate === "function") {
      postDate = date.toDate();
    } else if (date && date.seconds) {
      postDate = new Date(date.seconds * 1000);
    } else {
      postDate = new Date(date);
    }
    const now = new Date();
    const diffInDays = Math.abs(now.getTime() - postDate.getTime()) / (1000 * 3600 * 24);

    if (diffInDays < 1) return `${Math.round(diffInDays * 24)} giờ trước`;
    if (diffInDays < 7) return `${Math.round(diffInDays)} ngày trước`;
    return postDate.toLocaleDateString("vi-VN");
  };

  const getFirstImage = (post) => {
    if (!post.content) return null;
    const imageBlock = post.content.find((c) => c.type === "image");
    return imageBlock?.url || null;
  };

  return (
    <aside className="post-detail-right-sidebar">
      {/* Statistics */}
      <div className="sidebar-widget stats-widget">
        <div className="widget-header">
          <TrendingUp size={18} />
          <h3>Thống kê</h3>
        </div>
        <div className="stats-grid">
          <div className="stat-item-compact">
            <Eye size={16} />
            <div className="stat-info">
              <span className="stat-value">{views || 0}</span>
              <span className="stat-label">Lượt xem</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="sidebar-widget related-posts-widget">
          <div className="widget-header">
            <MapPin size={18} />
            <h3>Bài viết cùng địa điểm</h3>
          </div>
          <div className="related-posts-list">
            {relatedPosts.map((relatedPost) => (
              <div
                key={relatedPost.id}
                className="related-post-item"
                onClick={() => onPostClick && onPostClick(relatedPost)}
              >
                {getFirstImage(relatedPost) ? (
                  <img
                    src={getFirstImage(relatedPost)}
                    alt={relatedPost.title}
                    className="related-post-image"
                  />
                ) : (
                  <div className="related-post-image related-post-image-placeholder">
                    <MapPin size={20} />
                  </div>
                )}
                <div className="related-post-info">
                  <h4 className="related-post-title">{relatedPost.title}</h4>
                  <div className="related-post-meta">
                    {relatedPost.likes > 0 && (
                      <span className="related-post-likes">
                        <Heart size={12} />
                        {relatedPost.likes}
                      </span>
                    )}
                    {relatedPost.rating && (
                      <span className="related-post-rating">
                        <Star size={12} />
                        {relatedPost.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Posts */}
      {popularPosts.length > 0 && (
        <div className="sidebar-widget popular-posts-widget">
          <div className="widget-header">
            <TrendingUp size={18} />
            <h3>Bài viết nổi bật</h3>
          </div>
          <div className="popular-posts-list">
            {popularPosts.map((popularPost) => (
              <div
                key={popularPost.id}
                className="popular-post-item"
                onClick={() => onPostClick && onPostClick(popularPost)}
              >
                {getFirstImage(popularPost) ? (
                  <img
                    src={getFirstImage(popularPost)}
                    alt={popularPost.title}
                    className="popular-post-image"
                  />
                ) : (
                  <div className="popular-post-image popular-post-image-placeholder">
                    <TrendingUp size={20} />
                  </div>
                )}
                <div className="popular-post-info">
                  <h4 className="popular-post-title">{popularPost.title}</h4>
                  <div className="popular-post-meta">
                    {popularPost.location && (
                      <span className="popular-post-location">
                        <MapPin size={12} />
                        {popularPost.location}
                      </span>
                    )}
                    {popularPost.rating && (
                      <span className="popular-post-rating">
                        <Star size={12} />
                        {popularPost.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar Locations */}
      {similarLocations.length > 0 && (
        <div className="sidebar-widget similar-locations-widget">
          <div className="widget-header">
            <Navigation size={18} />
            <h3>Địa điểm tương tự</h3>
          </div>
          <div className="similar-locations-list">
            {similarLocations.map((similarPost) => (
              <div
                key={similarPost.id}
                className="similar-location-item"
                onClick={() => onPostClick && onPostClick(similarPost)}
              >
                <div className="similar-location-info">
                  <h4 className="similar-location-title">{similarPost.title}</h4>
                  {similarPost.location && (
                    <p className="similar-location-name">
                      <MapPin size={14} />
                      {similarPost.location}
                    </p>
                  )}
                  {similarPost.rating && (
                    <div className="similar-location-rating">
                      <Star size={14} />
                      <span>{similarPost.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Travel Tips */}
      {post.location && (
        <div className="sidebar-widget travel-tips-widget">
          <div className="widget-header">
            <Lightbulb size={18} />
            <h3>Mẹo du lịch</h3>
          </div>
          <div className="travel-tips-content">
            <div className="travel-tip-item">
              <Clock size={16} />
              <div className="tip-content">
                <strong>Thời gian tốt nhất:</strong>
                <span>Quanh năm, tránh mùa mưa (tháng 9-11)</span>
              </div>
            </div>
            <div className="travel-tip-item">
              <Navigation size={16} />
              <div className="tip-content">
                <strong>Thời gian tham quan:</strong>
                <span>2-3 giờ cho chuyến tham quan cơ bản</span>
              </div>
            </div>
            <div className="travel-tip-item">
              <Cloud size={16} />
              <div className="tip-content">
                <strong>Lưu ý thời tiết:</strong>
                <span>Kiểm tra dự báo thời tiết trước khi đi</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </aside>
  );
};

export default PostDetailRightSidebar;

