import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMetaTags } from "../hooks/useMetaTags";
import {
  ArrowLeft,
  Heart,
  MapPin,
  User,
  Video,
  ImageIcon,
  MessageCircle,
  Share2,
  MoreVertical,
  Trash2,
  Reply,
  ThumbsUp,
  Edit,
} from "lucide-react";
import WishlistButton from "./WishlistButton";
import MapForLocation from "./MapForLocation";
import PostDetailLeftSidebar from "./PostDetailLeftSidebar";
import PostDetailRightSidebar from "./PostDetailRightSidebar";
import { checkAdminStatus } from "../services/adminAuth";
import "./PostDetail.css";
import { addComment, addReply, listenComments, ratePost, getUserRating, incrementPostViews, likeReply, unlikeReply } from "../services/posts";

// Hàm định dạng ngày - giống Facebook
const formatTimeAgo = (date) => {
  if (!date) return "Vừa xong";
  
  let postDate;
  if (date && typeof date.toDate === "function") {
    postDate = date.toDate();
  } else if (date && date.seconds) {
    postDate = new Date(date.seconds * 1000);
  } else {
    postDate = new Date(date);
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} phút trước`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} giờ trước`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ngày trước`;
  }
  // Nếu quá 7 ngày, hiển thị ngày tháng
  return postDate.toLocaleDateString("vi-VN", { 
    day: "numeric", 
    month: "numeric",
    year: postDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  });
};

const PostDetail = ({ post, onBack, onLike, currentUserId, currentUser, posts = [], onPostClick, onDelete, onEdit }) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState({});
  const [likingComment, setLikingComment] = useState({});
  const [likingReply, setLikingReply] = useState({});
  const [userRating, setUserRating] = useState(0);
  const [postRating, setPostRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
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

  const isOwner = currentUser && post && post.userId === currentUser.uid;
  const canEdit = isOwner || isAdmin;

  // Get first image from post content for preview
  const getFirstImage = () => {
    if (!post?.content || !Array.isArray(post.content)) return null;
    const imageBlock = post.content.find((block) => block.type === "image");
    return imageBlock?.url || null;
  };

  const previewImage = getFirstImage() || 
    "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&q=80";

  // Get description from first text block
  const getDescription = () => {
    if (!post?.content || !Array.isArray(post.content)) return null;
    const textBlock = post.content.find((block) => block.type === "text");
    if (textBlock?.content) {
      // Remove markdown headers and get first 200 characters
      const text = textBlock.content.replace(/^#+\s*/gm, "").trim();
      return text.substring(0, 200) + (text.length > 200 ? "..." : "");
    }
    return null;
  };

  // Update meta tags for social sharing
  useMetaTags({
    title: post?.title ? `${post.title} - ExploreViet` : "ExploreViet - Khám phá Việt Nam",
    description: getDescription() || `Khám phá ${post?.location || "Việt Nam"} với ExploreViet`,
    image: previewImage,
    url: typeof window !== "undefined" ? window.location.href : "",
  });

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) {
      return;
    }
    setShowMenu(false);
    if (onDelete && post && post.id) {
      try {
        await onDelete(post.id);
      } catch (error) {
        console.error("Error deleting post:", error);
      }
    }
  };

  // Safely get post data with defaults
  const safePost = post || {};
  const safeRating = safePost.rating || 0;
  const safeRatingCount = safePost.ratingCount || 0;

  if (!post || !post.id) {
    return (
      <div className="post-detail-empty">
        <h2>Bài viết không tìm thấy</h2>
        <p>Bài viết này có thể đã bị xóa hoặc không tồn tại.</p>
        <button onClick={() => navigate("/")} className="create-first-post-button">
          Về trang chủ
        </button>
      </div>
    );
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

  // Increment views when post is viewed
  useEffect(() => {
    if (!post?.id) return;
    
    // Increment views (async, don't wait)
    incrementPostViews(post.id).catch((err) => {
      console.error("Error incrementing views:", err);
    });
  }, [post?.id]);

  useEffect(() => {
    if (!post?.id) return;
    const unsub = listenComments(post.id, (items) => {
      setComments(items);
    });
    return () => unsub && unsub();
  }, [post]);

  // Scroll to comment or reply when hash fragment is present in URL
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    // Wait for comments to load and DOM to render
    const scrollToElement = () => {
      // Check for reply hash: #reply-commentId-replyId
      if (hash.startsWith('#reply-')) {
        const parts = hash.replace('#reply-', '').split('-');
        if (parts.length >= 2) {
          const commentId = parts[0];
          const replyId = parts.slice(1).join('-'); // In case replyId has dashes
          const replyElement = document.getElementById(`reply-${commentId}-${replyId}`);
          if (replyElement) {
            console.log(`📍 Scrolling to reply: reply-${commentId}-${replyId}`);
            replyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the reply briefly
            replyElement.style.backgroundColor = 'rgba(13, 148, 136, 0.1)';
            setTimeout(() => {
              replyElement.style.backgroundColor = '';
            }, 2000);
            return true;
          }
        }
      }
      
      // Check for comment hash: #comment-commentId
      if (hash.startsWith('#comment-')) {
        const commentId = hash.replace('#comment-', '');
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
          console.log(`📍 Scrolling to comment: comment-${commentId}`);
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the comment briefly
          commentElement.style.backgroundColor = 'rgba(13, 148, 136, 0.1)';
          setTimeout(() => {
            commentElement.style.backgroundColor = '';
          }, 2000);
          return true;
        } else {
          console.log(`⚠️ Comment element not found: comment-${commentId}`, {
            commentsCount: comments.length,
            commentIds: comments.map(c => c.id)
          });
        }
      }
      return false;
    };

    // Try immediately if comments are already loaded
    if (comments.length > 0) {
      const timer1 = setTimeout(() => {
        if (!scrollToElement()) {
          // If not found, try again after a longer delay
          setTimeout(scrollToElement, 500);
        }
      }, 300);
      return () => clearTimeout(timer1);
    } else {
      // If comments not loaded yet, wait longer
      const timer2 = setTimeout(() => {
        scrollToElement();
      }, 1000);
      return () => clearTimeout(timer2);
    }
  }, [comments, post?.id]);

  useEffect(() => {
    if (post?.id && currentUserId) {
      getUserRating(post.id, currentUserId)
        .then((rating) => {
          if (rating) setUserRating(rating);
        })
        .catch((error) => {
          console.error("Error getting user rating:", error);
          // Ignore error, user just hasn't rated yet
        });
    }
    setPostRating(safeRating);
    setRatingCount(safeRatingCount);
  }, [post, currentUserId, safeRating, safeRatingCount]);

  const handleRate = async (rating) => {
    if (!currentUserId) {
      alert("Bạn cần đăng nhập để đánh giá");
      return;
    }
    try {
      await ratePost(post.id, currentUserId, rating);
      setUserRating(rating);
      // Update local rating (simplified - in production, fetch from server)
      const newCount = ratingCount + (userRating === 0 ? 1 : 0);
      const newAvg = userRating === 0
        ? (postRating * ratingCount + rating) / newCount
        : (postRating * ratingCount - userRating + rating) / ratingCount;
      setPostRating(newAvg);
      setRatingCount(newCount);
    } catch (error) {
      console.error("Error rating post:", error);
      alert(error.message || "Có lỗi xảy ra khi đánh giá");
    }
  };

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

  const handleStartReply = (commentId) => {
    console.log("Starting reply to comment:", commentId);
    setReplyingTo(commentId);
    setReplyText("");
  };

  const handleCancelReply = () => {
    console.log("Canceling reply");
    setReplyingTo(null);
    setReplyText("");
  };

  const handleSubmitReply = async (e, commentId) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    if (!currentUser) {
      alert("Bạn cần đăng nhập để trả lời");
      return;
    }

    setSubmittingReply((prev) => ({ ...prev, [commentId]: true }));
    try {
      await addReply(post.id, commentId, {
        author: currentUser.displayName || "Người dùng",
        content: replyText.trim(),
        avatar: currentUser.photoURL || null,
        userId: currentUser.uid,
      });
      setReplyText("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Error adding reply:", error);
      alert("Trả lời thất bại");
    } finally {
      setSubmittingReply((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  // *** Loại bỏ logic lấy firstMedia, textContent, v.v. ***

  return (
    <div className="post-detail-wrapper">
        {/* Nút Quay Lại (Thay thế cho Header) */}
        <button onClick={() => navigate(-1)} className="back-button-floating">
          <ArrowLeft size={24} />
        </button>

      {/* Layout 3 cột */}
      <div className="post-detail-layout">
        {/* Left Sidebar */}
        <PostDetailLeftSidebar
          post={post}
          currentUser={currentUser}
          onPostClick={onPostClick}
          currentUserId={currentUserId}
          postRating={postRating}
          ratingCount={ratingCount}
          userRating={userRating}
          onRate={handleRate}
          postId={post.id}
        />

        {/* Main Content */}
        <div className="post-detail-main-content">
          <div className="post-detail-container">

        {/* Post Info - (Chứa tiêu đề và thông tin tác giả) */}
        <div className="detail-post-info">
          {/* Location & Title */}
          {post.location && (
            <div className="detail-location-section">
              <div className="detail-location-badge">
                <MapPin size={16} />
                <span>{post.location}</span>
              </div>
            </div>
          )}

          <div className="detail-title-wrapper">
            <h1 className="detail-title">{post.title || "Không có tiêu đề"}</h1>
            
            {/* Delete Menu - Only show for post owner or admin */}
            {canEdit && (
              <div className="post-detail-menu-container" ref={menuRef}>
                <button
                  className="post-detail-menu-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  title="Tùy chọn"
                >
                  <MoreVertical size={20} />
                </button>
                {showMenu && (
                  <div className="post-detail-menu-dropdown">
                    <button
                      className="post-detail-menu-item"
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
                      className="post-detail-menu-item delete-item"
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
        {post.content && Array.isArray(post.content) && post.content.length > 0 && (
          <div className="detail-content-blocks">
            {post.content.map((block, index) => {
              // Extract heading from text block for TOC
              let sectionId = null;
              let headingText = null;
              if (block.type === "text" && block.content) {
                const lines = block.content.split("\n");
                lines.forEach((line, lineIndex) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith("# ") || trimmed.startsWith("## ")) {
                    sectionId = `section-${index}-${lineIndex}`;
                    headingText = trimmed.substring(trimmed.indexOf(" ") + 1).trim();
                  }
                });
              }

              if (block.type === "text" && block.content) {
                // Split text by headings for TOC
                const lines = typeof block.content === 'string' ? block.content.split("\n") : [];
                return (
                  <div key={index} className="content-block-text">
                    {lines.map((line, lineIndex) => {
                      const trimmed = line.trim();
                      if (trimmed.startsWith("# ")) {
                        const heading = trimmed.substring(2).trim();
                        return (
                          <h2
                            key={lineIndex}
                            id={`section-${index}-${lineIndex}`}
                            className="content-heading h1"
                          >
                            {heading}
                          </h2>
                        );
                      } else if (trimmed.startsWith("## ")) {
                        const heading = trimmed.substring(3).trim();
                        return (
                          <h3
                            key={lineIndex}
                            id={`section-${index}-${lineIndex}`}
                            className="content-heading h2"
                          >
                            {heading}
                          </h3>
                        );
                      } else if (trimmed) {
                        return (
                          <p key={lineIndex}>{line}</p>
                        );
                      }
                      return null;
                    })}
                  </div>
                );
              } else if (block.type === "image" && block.url) {
                return (
                  <div key={index} className="content-block-media">
                    <img
                      src={block.url}
                      alt={block.caption || `Content ${index}`}
                      className="detail-media-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        console.error('Failed to load image:', block.url);
                      }}
                    />
                    {block.caption && (
                      <p className="media-caption">{block.caption}</p>
                    )}
                  </div>
                );
              } else if (block.type === "video" && block.url) {
                return (
                  <div key={index} className="content-block-media">
                    <video
                      src={block.url}
                      controls
                      className="detail-media-video"
                      onError={(e) => {
                        console.error('Failed to load video:', block.url);
                      }}
                    />
                    {block.caption && (
                      <p className="media-caption">{block.caption}</p>
                    )}
                  </div>
                );
              } else if (block.type === "youtube" && block.videoId) {
                return (
                  <div key={index} className="content-block-media content-block-youtube">
                    <div className="youtube-embed-wrapper">
                      <iframe
                        width="100%"
                        height="500"
                        src={`https://www.youtube.com/embed/${block.videoId}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="youtube-iframe"
                      />
                    </div>
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
        {/* LƯỢT THÍCH VÀ BÌNH LUẬN - Facebook Style */}
        {/* ============================================== */}
        <div className="interaction-section">
          {/* Stats - Hiển thị số lượt thích và bình luận */}
          {(post.likes > 0 || comments.length > 0) && (
            <div className="detail-stats">
              {post.likes > 0 && (
                <span className="stat-text">
                  <Heart size={2} className={isLiked ? "stat-icon liked" : "stat-icon"} />
                  {post.likes} lượt thích
                </span>
              )}
              {comments.length > 0 && (
                <span className="stat-text">
                  <MessageCircle size={2} className="stat-icon" />
                  {comments.length} bình luận
                </span>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="interaction-divider"></div>

          {/* Action Buttons - Facebook Style */}
          <div className="action-buttons-row">
            <button
              onClick={handleLike}
              className={`action-button action-like-btn ${isLiked ? "liked" : ""}`}
            >
              <Heart
                size={27}
                className={isLiked ? "heart-icon liked" : "heart-icon"}
              />
              <span>{isLiked ? "Bỏ thích" : "Thích"}</span>
            </button>
            <button
              className="action-button action-comment-btn"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('.comment-input')?.focus();
              }}
            >
              <MessageCircle size={27} className="action-icon" />
              <span>Bình luận</span>
            </button>
          </div>
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
                <div key={comment.id} id={`comment-${comment.id}`} className="comment-item">
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
                  <div className="comment-content-wrapper">
                    <div className="comment-meta">
                      <span className="comment-author">{comment.author}</span>
                      <span className="comment-content">{comment.content}</span>
                    </div>
                    <div className="comment-footer">
                      {currentUser && (
                        <button
                          onClick={() => handleStartReply(comment.id)}
                          className="reply-button"
                          title="Trả lời"
                        >
                          <Reply size={14} />
                          <span>Trả lời</span>
                        </button>
                      )}
                      <span className="comment-time">
                        {formatTimeAgo(comment.createdAt)}
                      </span>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="replies-list">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} id={`reply-${comment.id}-${reply.id}`} className="reply-item">
                            {reply.avatar ? (
                              <img
                                src={reply.avatar}
                                alt={reply.author}
                                className="reply-avatar"
                              />
                            ) : (
                              <div className="reply-avatar reply-avatar-placeholder">
                                <User size={12} />
                              </div>
                            )}
                            <div className="reply-content-wrapper">
                              <div className="reply-meta">
                                <span className="reply-author">{reply.author}</span>
                                <span className="reply-content">{reply.content}</span>
                              </div>
                              <div className="reply-footer">
                                <button
                                  onClick={() => handleLikeReply(comment.id, reply.id)}
                                  className={`like-button ${reply?.likedBy?.includes(currentUser?.uid) ? "liked" : ""}`}
                                  disabled={likingReply[`reply-${comment.id}-${reply.id}`]}
                                  title="Thích"
                                >
                                  <ThumbsUp size={12} />
                                  <span>Thích</span>
                                  {reply.likes > 0 && (
                                    <span className="like-count">{reply.likes}</span>
                                  )}
                                </button>
                                {currentUser && (
                                  <button
                                    onClick={() => handleStartReply(comment.id)}
                                    className="reply-button"
                                    title="Trả lời"
                                  >
                                    <Reply size={12} />
                                    <span>Trả lời</span>
                                  </button>
                                )}
                                <span className="reply-time">
                                  {formatTimeAgo(reply.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Form */}
                    {replyingTo === comment.id && (
                      <form
                        onSubmit={(e) => handleSubmitReply(e, comment.id)}
                        className="reply-form"
                      >
                        <div className="reply-input-wrapper">
                          {currentUser?.photoURL ? (
                            <img
                              src={currentUser.photoURL}
                              alt={currentUser.displayName}
                              className="reply-avatar"
                            />
                          ) : (
                            <div className="reply-avatar reply-avatar-placeholder">
                              <User size={12} />
                            </div>
                          )}
                          <input
                            type="text"
                            placeholder="Viết trả lời..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="reply-input"
                            autoFocus
                          />
                          <button
                            type="submit"
                            disabled={!replyText.trim() || submittingReply[comment.id]}
                            className="reply-submit-button"
                          >
                            Gửi
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelReply}
                            className="reply-cancel-button"
                          >
                            Hủy
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map for Location - Hiển thị ở cuối bài viết */}
        {post.location && (
          <MapForLocation 
            locationName={post.location}
            coordinates={post.coordinates || null}
          />
        )}

          </div>
        </div>

        {/* Right Sidebar */}
        <PostDetailRightSidebar
          post={post}
          posts={posts}
          onPostClick={onPostClick}
          views={post.views || 0}
          commentCount={comments.length}
        />
      </div>
    </div>
  );
};

export default PostDetail;
