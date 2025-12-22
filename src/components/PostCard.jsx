import React, { useState, useRef, useEffect } from "react";
import {
  MapPin,
  Heart,
  MessageCircle,
  Video,
  Image as ImageIcon,
  User,
  MoreVertical,
  Trash2,
  Edit,
} from "lucide-react";
import Rating from "./Rating";
import WishlistButton from "./WishlistButton";
import { checkAdminStatus } from "../services/adminAuth";
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

const PostCard = ({
  post,
  onLike,
  onClick,
  currentUserId,
  currentUser,
  onDelete,
  onEdit,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef(null);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (currentUser?.uid) {
        const adminStatus = await checkAdminStatus(currentUser.uid);
        setIsAdmin(adminStatus);
      }
    };
    checkAdmin();
  }, [currentUser]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const isOwner = currentUser && post.userId === currentUser.uid;
  const canEdit = isOwner || isAdmin;

  const handleDelete = async (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onDelete && post.id) {
      await onDelete(post.id);
    }
  };
  const mediaType = post.mediaType || "image";
  const authorName = post.userName || post.author?.displayName || "Reviewer";
  const authorAvatar = post.userPhotoURL || post.author?.avatarUrl || null;

  const isLiked =
    currentUserId && post.likedBy && post.likedBy.includes(currentUserId);

  const rating = post.rating || 0;
  const ratingCount = post.ratingCount || 0;

  const firstImage = post.content?.find((c) => c.type === "image")?.url;
  const coverUrl = firstImage || post.imageUrl;

  const textBlock = post.content?.find((c) => c.type === "text");

  return (
    <div onClick={onClick} className="post-card">
      {/* MEDIA */}
      <div className="post-media-container">
        {mediaType === "video" ? (
          <div className="post-media post-media-video">
            <Video size={30} />
          </div>
        ) : coverUrl ? (
          <img
            src={coverUrl}
            alt={post.location}
            className="post-media post-media-image"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div
            className="post-media post-media-placeholder"
            style={{
              backgroundColor: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              width: "100%",
            }}
          >
            <ImageIcon size={48} color="#cbd5e1" />
          </div>
        )}

        {currentUserId && (
          <div className="post-wishlist-button">
            <WishlistButton postId={post.id} userId={currentUserId} size={18} />
          </div>
        )}

        {/* Delete Menu - Only show for post owner */}
        {canEdit && (
          <div className="post-menu-container" ref={menuRef}>
            <button
              className="post-menu-button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              title="Tùy chọn"
            >
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="post-menu-dropdown">
                <button
                  className="post-menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit && onEdit(post);
                  }}
                >
                  <Edit size={16} />
                  <span>Chỉnh sửa</span>
                </button>
                <button
                  className="post-menu-item delete-item"
                  onClick={handleDelete}
                >
                  <Trash2 size={16} />
                  <span>Xóa bài viết</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="post-content-area">
        <div className="post-location">
          <MapPin size={12} className="location-icon" />
          <span className="location-text">{post.location}</span>
        </div>

        <h3 className="post-title">{post.title}</h3>

        {/* Rating */}
        {rating > 0 && (
          <div className="post-rating">
            <Rating
              rating={rating}
              showText={true}
              showCount={true}
              ratingCount={ratingCount}
              size={16}
            />
          </div>
        )}

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
            <span
              className="author-name"
              data-full-name={authorName}
              title={authorName}
            >
              {authorName}
            </span>
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
