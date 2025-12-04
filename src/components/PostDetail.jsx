import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Heart,
  MapPin,
  User,
  Video,
  ImageIcon,
  MessageCircle,
  Share2,
} from "lucide-react";
import "./PostDetail.css";
import { addComment, listenComments } from "../services/posts";

// Hàm định dạng ngày
const formatTimeAgo = (date) => {
  let postDate;
  if (!date) return "";
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

const PostDetail = ({ post, onBack, onLike, currentUserId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  if (!post) {
    return <div className="post-detail-empty">Bài viết không tìm thấy</div>;
  }

  const isLiked =
    currentUserId && post.likedBy && post.likedBy.includes(currentUserId);

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      await onLike(post.id);
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  useEffect(() => {
    if (!post?.id) return;
    const unsub = listenComments(post.id, (items) => {
      setComments(items);
    });
    return () => unsub && unsub();
  }, [post]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!currentUser) {
      alert("Bạn cần đăng nhập để bình luận");
      return;
    }

    setIsSubmittingComment(true);
    try {
      await addComment(post.id, {
        author: currentUser.displayName || "Ẩn danh",
        avatar: currentUser.photoURL || null,
        userId: currentUser.uid || null,
        content: newComment.trim(),
      });
      setNewComment("");
      // comments will update via listener
    } catch (error) {
      console.error("Add comment failed:", error);
      alert("Bình luận thất bại");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // *** Loại bỏ logic lấy firstMedia, textContent, v.v. ***

  return (
    <div className="post-detail-wrapper">
      {/* Header - ĐÃ XÓA */}

      {/* Main Content */}
      <div className="post-detail-container">
        {/* Nút Quay Lại (Thay thế cho Header) */}
        <button onClick={onBack} className="back-button-floating">
          <ArrowLeft size={24} />
        </button>

        {/* Post Info - (Chứa tiêu đề và thông tin tác giả) */}
        <div className="detail-post-info">
          {/* Location & Title */}
          <div className="detail-location-section">
            <div className="detail-location-badge">
              <MapPin size={16} />
              <span>{post.location}</span>
            </div>
          </div>

          <h1 className="detail-title">{post.title}</h1>

          {/* Author Info */}
          <div className="detail-author-section">
            <div className="author-card">
              {post.userPhotoURL ? (
                <img
                  src={post.userPhotoURL}
                  alt={post.userName}
                  className="author-avatar-large"
                />
              ) : (
                <div className="author-avatar-large author-avatar-placeholder">
                  <User size={24} />
                </div>
              )}
              <div className="author-info">
                <p className="author-name">{post.userName}</p>
                <p className="post-date">
                  {post.createdAt ? formatTimeAgo(post.createdAt) : "Mới đây"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* HIỂN THỊ TOÀN BỘ NỘI DUNG THEO ĐÚNG THỨ TỰ GỐC */}
        {/* ============================================== */}
        {post.content && (
          <div className="detail-content-blocks">
            {post.content.map((block, index) => {
              if (block.type === "text") {
                return (
                  <div key={index} className="content-block-text">
                    <p>{block.content}</p>
                  </div>
                );
              } else if (block.type === "image") {
                return (
                  <div key={index} className="content-block-media">
                    <img
                      src={block.url}
                      alt={`Content ${index}`}
                      className="detail-media-image"
                    />
                    {block.caption && (
                      <p className="media-caption">{block.caption}</p>
                    )}
                  </div>
                );
              } else if (block.type === "video") {
                return (
                  <div key={index} className="content-block-media">
                    <video
                      src={block.url}
                      controls
                      className="detail-media-video"
                    />
                    {block.caption && (
                      <p className="media-caption">{block.caption}</p>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* ============================================== */}
        {/* LƯỢT THÍCH VÀ BÌNH LUẬN (Đã di chuyển xuống cuối) */}
        {/* ============================================== */}
        <div className="interaction-section">
          {/* Stats */}
          <div className="detail-stats">
            <div className="stat-item">
              <Heart
                size={18}
                className={isLiked ? "stat-icon liked" : "stat-icon"}
              />
              <span>{post.likes || 0} lượt thích</span>
            </div>
            <div className="stat-item">
              <MessageCircle size={18} className="stat-icon" />
              <span>{comments.length} bình luận</span>
            </div>
          </div>

          {/* Like Button */}
          <button
            onClick={handleLike}
            className={`detail-like-button ${isLiked ? "liked" : ""}`}
          >
            <Heart
              size={20}
              className={isLiked ? "heart-icon liked" : "heart-icon"}
            />
            <span>{isLiked ? "Bỏ thích" : "Thích"}</span>
          </button>
        </div>

        {/* Comments Section */}
        <div className="detail-comments-section">
          <h3>Bình luận ({comments.length})</h3>

          {/* Comment Form */}
          {currentUser && (
            <form onSubmit={handleAddComment} className="comment-form">
              <div className="comment-input-wrapper">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="comment-avatar"
                  />
                ) : (
                  <div className="comment-avatar comment-avatar-placeholder">
                    <User size={16} />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Viết bình luận..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="comment-input"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="comment-submit-button"
                >
                  Gửi
                </button>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments">
                Chưa có bình luận nào. Hãy là người bình luận đầu tiên!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    {comment.avatar ? (
                      <img
                        src={comment.avatar}
                        alt={comment.author}
                        className="comment-avatar"
                      />
                    ) : (
                      <div className="comment-avatar comment-avatar-placeholder">
                        <User size={16} />
                      </div>
                    )}
                    <div className="comment-meta">
                      <p className="comment-author">{comment.author}</p>
                      <p className="comment-time">
                        {formatTimeAgo(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="comment-content">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
