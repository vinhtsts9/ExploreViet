import React from "react";
import {
  MapPin,
  Heart,
  MessageCircle,
  Video,
  Image as ImageIcon,
  User,
} from "lucide-react";
import "./PostCard.css";

// Format time and accept Firestore Timestamp
const formatTimeAgo = (date) => {
  if (!date) return "";
  let postDate;
  if (date && typeof date.toDate === "function") {
    postDate = date.toDate();
  } else if (date && date.seconds) {
    postDate = new Date(date.seconds * 1000);
  } else {
    postDate = new Date(date);
  }

  const now = new Date();
  const diffInDays =
    Math.abs(now.getTime() - postDate.getTime()) / (1000 * 3600 * 24);

  if (diffInDays < 1) return `${Math.round(diffInDays * 24)} giờ trước`;
  if (diffInDays < 7) return `${Math.round(diffInDays)} ngày trước`;
  return postDate.toLocaleDateString("vi-VN");
};

const PostCard = ({ post, onLike, onClick, currentUserId }) => {
  const mediaType = post.mediaType || "image";
  const authorName = post.userName || post.author?.displayName || "Reviewer";
  const authorAvatar = post.userPhotoURL || post.author?.avatarUrl || null;

  const isLiked =
    currentUserId && post.likedBy && post.likedBy.includes(currentUserId);

  const firstImage = post.content?.find((c) => c.type === "image")?.url;
  const coverUrl =
    firstImage ||
    post.imageUrl ||
    "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&q=80";

  const textBlock = post.content?.find((c) => c.type === "text");

  return (
    <div onClick={onClick} className="post-card">
      {/* MEDIA */}
      <div className="post-media-container">
        {mediaType === "video" ? (
          <div className="post-media post-media-video">
            <Video size={30} />
          </div>
        ) : (
          <img
            src={coverUrl}
            alt={post.location}
            className="post-media post-media-image"
            onError={(e) => {
              e.target.src =
                "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&q=80";
            }}
          />
        )}

        <div className="media-type-tag">
          {mediaType === "video" ? (
            <Video size={10} />
          ) : (
            <ImageIcon size={10} />
          )}
          <span className="media-type-text">
            {mediaType === "video" ? "Video" : "Ảnh"}
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="post-content-area">
        <div className="post-location">
          <MapPin size={12} className="location-icon" />
          <span className="location-text">{post.location}</span>
        </div>

        <h3 className="post-title">{post.title}</h3>

        {textBlock && (
          <div className="post-preview">
            <p className="post-preview-text">{textBlock.content}</p>
          </div>
        )}

        <div className="post-meta">
          <div className="post-author">
            {authorAvatar ? (
              <img
                src={authorAvatar}
                alt={authorName}
                className="author-avatar"
              />
            ) : (
              <div className="author-avatar author-avatar-placeholder">
                <User size={14} />
              </div>
            )}
            <span className="author-name">{authorName}</span>
          </div>

          <div className="post-date-tag">
            {post.isAiGenerated ? (
              <span className="ai-tag">✨ AI Gợi ý</span>
            ) : post.createdAt ? (
              <span className="date-text">{formatTimeAgo(post.createdAt)}</span>
            ) : null}
          </div>
        </div>

        <div className="post-actions-row">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike && onLike(post.id);
            }}
            className={`action-button action-like ${isLiked ? "liked" : ""}`}
          >
            <Heart size={16} className="action-icon" />
            <span className="action-count">{post.likes || 0}</span>
          </button>

          <button
            onClick={(e) => e.stopPropagation()}
            className="action-button action-comment"
          >
            <MessageCircle size={16} className="action-icon" />
            <span className="action-count">{post.commentCount || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
