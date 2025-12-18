import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Trash2,
  Search,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import "./AdminPostManagement.css";
import {
  getPendingPosts,
  subscribeToPendingPosts,
  approvePost,
  rejectPost,
  deletePost,
} from "../services/admin";

const PostManagement = ({ user: currentUser }) => {
  const [posts, setPostsState] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [rejectionReason, setRejectionReason] = useState({});
  const [showReasonInput, setShowReasonInput] = useState({});

  // Load pending posts
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPendingPosts((loadedPosts) => {
      setPostsState(loadedPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter posts
  useEffect(() => {
    let filtered = posts.filter(
      (p) =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.userName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredPosts(filtered);
  }, [posts, searchQuery]);

  const handleApprovePost = async (postId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [postId]: true }));
      await approvePost(postId);
      alert("✅ Phê duyệt bài viết thành công!");
      setPostsState((prev) => prev.filter((p) => p.id !== postId));
    } catch (error) {
      alert("❌ Lỗi: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleRejectPost = async (postId) => {
    const reason = rejectionReason[postId] || "";

    if (!window.confirm("Bạn chắc chắn muốn từ chối bài viết này?")) {
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [postId]: true }));
      await rejectPost(postId, reason);
      alert("✅ Từ chối bài viết thành công!");
      setPostsState((prev) => prev.filter((p) => p.id !== postId));
    } catch (error) {
      alert("❌ Lỗi: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [postId]: false }));
      setShowReasonInput((prev) => ({ ...prev, [postId]: false }));
      setRejectionReason((prev) => ({ ...prev, [postId]: "" }));
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa bài viết này?")) {
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [postId]: true }));
      await deletePost(postId);
      alert("✅ Xóa bài viết thành công!");
      setPostsState((prev) => prev.filter((p) => p.id !== postId));
    } catch (error) {
      alert("❌ Lỗi: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateText = (text, length = 100) => {
    if (!text) return "";
    return text.length > length ? text.substring(0, length) + "..." : text;
  };

  const getContentPreview = (content) => {
    if (!content || !Array.isArray(content)) return "";
    const textBlock = content.find((block) => block.type === "text");
    return textBlock
      ? truncateText(textBlock.content)
      : truncateText(content[0]?.caption || "");
  };

  return (
    <div className="post-management">
      <h2 className="section-title">Quản Lý Bài Viết</h2>

      {/* Search */}
      <div className="post-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề, địa điểm hoặc tác giả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="loading-state">Đang tải danh sách bài viết...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>Không có bài viết nào chờ phê duyệt</p>
        </div>
      ) : (
        <div className="posts-list">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className={`post-item ${
                expandedPostId === post.id ? "expanded" : ""
              }`}
            >
              <div
                className="post-header"
                onClick={() =>
                  setExpandedPostId(expandedPostId === post.id ? null : post.id)
                }
              >
                <div className="post-info">
                  <img
                    src={
                      post.userPhotoURL ||
                      "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
                    }
                    alt={post.userName}
                    className="post-author-avatar"
                  />
                  <div className="post-details">
                    <h3 className="post-title">{post.title}</h3>
                    <div className="post-meta">
                      <span className="post-author">📝 {post.userName}</span>
                      <span className="post-location">📍 {post.location}</span>
                      <span className="post-date">
                        🕐 {formatDate(post.createdAt)}
                      </span>
                    </div>
                    <p className="post-preview">
                      {getContentPreview(post.content)}
                    </p>
                  </div>
                </div>
                <button className="expand-btn">
                  {expandedPostId === post.id ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </button>
              </div>

              {expandedPostId === post.id && (
                <div className="post-details-expanded">
                  <div className="post-content-preview">
                    <h4>Nội dung bài viết:</h4>
                    <div className="content-blocks">
                      {post.content &&
                        Array.isArray(post.content) &&
                        post.content.map((block, idx) => (
                          <div
                            key={idx}
                            className={`content-block ${block.type}`}
                          >
                            {block.type === "text" && (
                              <p className="text-content">{block.content}</p>
                            )}
                            {(block.type === "image" ||
                              block.type === "video") && (
                              <div className="media-content">
                                {block.type === "image" ? (
                                  <img src={block.url} alt="Content" />
                                ) : (
                                  <video src={block.url} controls width="300" />
                                )}
                                {block.caption && (
                                  <p className="caption">{block.caption}</p>
                                )}
                              </div>
                            )}
                            {block.type === "youtube" && (
                              <div className="youtube-content">
                                <iframe
                                  width="300"
                                  height="200"
                                  src={`https://www.youtube.com/embed/${block.videoId}`}
                                  frameBorder="0"
                                  allowFullScreen
                                ></iframe>
                                {block.caption && (
                                  <p className="caption">{block.caption}</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="post-actions">
                    <button
                      className="action-btn approve-btn"
                      onClick={() => handleApprovePost(post.id)}
                      disabled={actionLoading[post.id]}
                    >
                      <CheckCircle size={16} />
                      {actionLoading[post.id] ? "Đang xử lý..." : "Phê Duyệt"}
                    </button>

                    <div className="reject-section">
                      {!showReasonInput[post.id] ? (
                        <button
                          className="action-btn reject-btn"
                          onClick={() =>
                            setShowReasonInput((prev) => ({
                              ...prev,
                              [post.id]: true,
                            }))
                          }
                        >
                          <XCircle size={16} />
                          Từ Chối
                        </button>
                      ) : (
                        <div className="reject-reason-input">
                          <textarea
                            placeholder="Nhập lý do từ chối (tùy chọn)..."
                            value={rejectionReason[post.id] || ""}
                            onChange={(e) =>
                              setRejectionReason((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            className="reason-textarea"
                          />
                          <div className="reason-buttons">
                            <button
                              className="btn-confirm"
                              onClick={() => handleRejectPost(post.id)}
                              disabled={actionLoading[post.id]}
                            >
                              {actionLoading[post.id]
                                ? "Đang xử lý..."
                                : "Xác Nhận"}
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={() => {
                                setShowReasonInput((prev) => ({
                                  ...prev,
                                  [post.id]: false,
                                }));
                                setRejectionReason((prev) => ({
                                  ...prev,
                                  [post.id]: "",
                                }));
                              }}
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDeletePost(post.id)}
                      disabled={actionLoading[post.id]}
                    >
                      <Trash2 size={16} />
                      {actionLoading[post.id] ? "Đang xử lý..." : "Xóa"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="posts-count">
        Tổng cộng: <strong>{filteredPosts.length}</strong> bài viết chờ phê
        duyệt
      </div>
    </div>
  );
};

export default PostManagement;
