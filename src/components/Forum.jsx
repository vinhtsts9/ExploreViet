import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Plus, 
  TrendingUp, 
  Clock, 
  Eye, 
  Heart, 
  Pin,
  Lock,
  User,
  Search,
  Filter
} from "lucide-react";
import { createForumPost, listenForumPosts, addForumReply, incrementForumPostViews, listenForumReplies } from "../services/forum";
import "./Forum.css";

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

const Forum = ({ user, onBack }) => {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { value: "all", label: "Tất cả" },
    { value: "general", label: "Chung" },
    { value: "tips", label: "Mẹo du lịch" },
    { value: "itinerary", label: "Lịch trình" },
    { value: "accommodation", label: "Chỗ ở" },
    { value: "food", label: "Ẩm thực" },
    { value: "transport", label: "Di chuyển" },
  ];

  useEffect(() => {
    if (!selectedPost) {
      setReplies([]);
      return;
    }

    let unsub;
    try {
      unsub = listenForumReplies(selectedPost.id, (items) => {
        setReplies(items || []);
      });

      // Increment views (async, don't wait)
      incrementForumPostViews(selectedPost.id).catch(err => {
        console.error("Error incrementing views:", err);
      });
    } catch (error) {
      console.error("Error setting up replies listener:", error);
      setReplies([]);
    }

    return () => {
      if (unsub && typeof unsub === 'function') {
        unsub();
      }
    };
  }, [selectedPost]);

  useEffect(() => {
    setLoading(true);
    const filters = selectedCategory !== "all" ? { category: selectedCategory } : {};
    
    let unsub;
    try {
      unsub = listenForumPosts((items) => {
        setPosts(items || []);
        setLoading(false);
      }, filters);
    } catch (error) {
      console.error("Error setting up forum posts listener:", error);
      setPosts([]);
      setLoading(false);
    }

    return () => {
      if (unsub && typeof unsub === 'function') {
        unsub();
      }
    };
  }, [selectedCategory]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Bạn cần đăng nhập để tạo bài viết");
      return;
    }

    const formData = new FormData(e.target);
    const title = formData.get("title");
    const content = formData.get("content");
    const category = formData.get("category");

    try {
      await createForumPost(
        {
          title,
          content,
          category,
          tags: [],
        },
        user.uid,
        user
      );
      setShowCreateForm(false);
      e.target.reset();
      alert("Đăng bài thành công!");
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Lỗi: " + error.message);
    }
  };

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!user || !selectedPost) return;

    const formData = new FormData(e.target);
    const content = formData.get("reply");

    try {
      await addForumReply(selectedPost.id, { content }, user.uid, user);
      setShowReplyForm(false);
      e.target.reset();
    } catch (error) {
      console.error("Error adding reply:", error);
      alert("Lỗi: " + error.message);
    }
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (selectedPost) {
    return (
      <div className="forum-container">
        <div className="forum-header">
          <button onClick={() => setSelectedPost(null)} className="back-btn">
            ← Quay lại
          </button>
          <h2>Diễn đàn</h2>
        </div>

        <div className="forum-post-detail">
          <div className="forum-post-header">
            <div className="forum-post-meta">
              {selectedPost.userPhotoURL ? (
                <img src={selectedPost.userPhotoURL} alt={selectedPost.userName} className="forum-user-avatar" />
              ) : (
                <div className="forum-user-avatar forum-user-avatar-placeholder">
                  <User size={16} />
                </div>
              )}
              <div>
                <div className="forum-user-name">{selectedPost.userName}</div>
                <div className="forum-post-date">{formatTimeAgo(selectedPost.createdAt)}</div>
              </div>
            </div>
            {selectedPost.isPinned && <Pin size={16} className="pinned-icon" />}
            {selectedPost.isLocked && <Lock size={16} className="locked-icon" />}
          </div>

          <h1 className="forum-post-title">{selectedPost.title}</h1>
          <div className="forum-post-category">{selectedPost.category}</div>
          <div className="forum-post-content">{selectedPost.content}</div>

          <div className="forum-post-stats">
            <span><Eye size={14} /> {selectedPost.views || 0} lượt xem</span>
            <span><MessageSquare size={14} /> {replies.length} trả lời</span>
            <span><Heart size={14} /> {selectedPost.likes || 0} thích</span>
          </div>

          <div className="forum-replies-section">
            <h3>Trả lời ({replies.length})</h3>
            {user && (
              <form onSubmit={handleAddReply} className="forum-reply-form">
                <textarea
                  name="reply"
                  placeholder="Viết trả lời của bạn..."
                  required
                  rows="4"
                />
                <button type="submit" className="forum-reply-submit">Gửi trả lời</button>
              </form>
            )}

            <div className="forum-replies-list">
              {replies.map((reply) => (
                <div key={reply.id} className="forum-reply-item">
                  <div className="forum-reply-header">
                    {reply.userPhotoURL ? (
                      <img src={reply.userPhotoURL} alt={reply.userName} className="forum-user-avatar-small" />
                    ) : (
                      <div className="forum-user-avatar-small forum-user-avatar-placeholder">
                        <User size={12} />
                      </div>
                    )}
                    <div>
                      <div className="forum-user-name-small">{reply.userName}</div>
                      <div className="forum-post-date-small">{formatTimeAgo(reply.createdAt)}</div>
                    </div>
                  </div>
                  <div className="forum-reply-content">{reply.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-container">
      <div className="forum-header">
        <button onClick={onBack} className="back-btn">← Quay lại</button>
        <h2>Diễn đàn Du lịch</h2>
        {user && (
          <button onClick={() => setShowCreateForm(true)} className="create-post-btn">
            <Plus size={18} />
            <span>Tạo bài viết</span>
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="forum-modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="forum-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Tạo bài viết mới</h3>
            <form onSubmit={handleCreatePost}>
              <input
                type="text"
                name="title"
                placeholder="Tiêu đề..."
                required
                className="forum-input"
              />
              <select name="category" className="forum-select" required>
                {categories.filter(c => c.value !== "all").map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <textarea
                name="content"
                placeholder="Nội dung bài viết..."
                required
                rows="8"
                className="forum-textarea"
              />
              <div className="forum-modal-actions">
                <button type="button" onClick={() => setShowCreateForm(false)} className="cancel-btn">
                  Hủy
                </button>
                <button type="submit" className="submit-btn">Đăng bài</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="forum-filters">
        <div className="forum-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="forum-categories">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`category-btn ${selectedCategory === cat.value ? "active" : ""}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="forum-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải bài viết...</p>
        </div>
      ) : (
        <div className="forum-posts-list">
          {filteredPosts.length === 0 ? (
            <div className="forum-empty">
              <MessageSquare size={48} className="empty-icon" />
              <h3>Chưa có bài viết nào</h3>
              <p>Hãy là người đầu tiên tạo bài viết trong diễn đàn!</p>
              {user && (
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="create-first-post-btn"
                >
                  <Plus size={18} />
                  <span>Tạo bài viết đầu tiên</span>
                </button>
              )}
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className="forum-post-card"
                onClick={() => setSelectedPost(post)}
              >
                <div className="forum-post-card-header">
                  <div className="forum-post-card-meta">
                    {post.userPhotoURL ? (
                      <img src={post.userPhotoURL} alt={post.userName} className="forum-user-avatar-small" />
                    ) : (
                      <div className="forum-user-avatar-small forum-user-avatar-placeholder">
                        <User size={12} />
                      </div>
                    )}
                    <div>
                      <div className="forum-user-name-small">{post.userName}</div>
                      <div className="forum-post-date-small">{formatTimeAgo(post.createdAt)}</div>
                    </div>
                  </div>
                  <div className="forum-post-badges">
                    {post.isPinned && <Pin size={14} className="pinned-badge" />}
                    {post.isLocked && <Lock size={14} className="locked-badge" />}
                  </div>
                </div>
                <h3 className="forum-post-card-title">{post.title}</h3>
                <div className="forum-post-card-category">{post.category}</div>
                <p className="forum-post-card-content">{post.content.substring(0, 150)}...</p>
                <div className="forum-post-card-footer">
                  <span><Eye size={12} /> {post.views || 0}</span>
                  <span><MessageSquare size={12} /> {post.replies || 0}</span>
                  <span><Heart size={12} /> {post.likes || 0}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Forum;

