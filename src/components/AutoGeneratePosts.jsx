import React, { useState } from "react";
import { 
  Sparkles, 
  Loader2, 
  Search,
  CheckCircle2, 
  X, 
  Eye,
  Trash2,
  Save,
  Clock,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { searchGoogleAndExtractContent } from "../services/googleSearch";
import { createPost } from "../services/posts";
import "./AutoGeneratePosts.css";

const AutoGeneratePosts = ({ onPostCreated, user }) => {
  const [keyword, setKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [pendingPosts, setPendingPosts] = useState([]); // Queue bài viết chờ duyệt
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert("Bạn cần đăng nhập để tạo bài viết");
      return;
    }

    if (!keyword.trim()) {
      alert("Vui lòng nhập từ khóa");
      return;
    }

    setIsSearching(true);
    
    try {
      console.log(`🔍 Searching Google for: "${keyword}"`);
      
      const postData = await searchGoogleAndExtractContent(keyword.trim());
      
      if (!postData || !postData.content || postData.content.length === 0) {
        alert("Không tìm thấy nội dung phù hợp. Vui lòng thử từ khóa khác.");
        return;
      }

      // Thêm vào queue chờ duyệt
      const newPendingPost = {
        id: Date.now().toString(),
        ...postData,
        createdAt: new Date(),
        status: "pending", // pending, approved, rejected
      };

      setPendingPosts(prev => [newPendingPost, ...prev]);
      setKeyword(""); // Clear input
      
      // Tự động mở preview
      setSelectedPost(newPendingPost);
      setShowPreview(true);
      
    } catch (error) {
      console.error("Error searching:", error);
      
      // More user-friendly error messages
      let errorMessage = error.message;
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        errorMessage = "Không thể kết nối đến server. Vui lòng:\n- Kiểm tra kết nối mạng\n- Kiểm tra cấu hình API trong file .env\n- Thử lại sau";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request quá thời gian chờ. Vui lòng thử lại.";
      } else if (error.message.includes("not configured")) {
        errorMessage = "API chưa được cấu hình. Vui lòng kiểm tra file .env và thêm VITE_N8N_GEMINI_WEBHOOK_URL";
      }
      
      alert(`Lỗi khi tìm kiếm:\n${errorMessage}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleApprove = async (post) => {
    if (!user) return;

    try {
      // Transform to createPost format
      const contents = post.content.map((block) => {
        if (block.type === "text") {
          return {
            type: "text",
            value: block.content,
          };
        } else if (block.type === "image") {
          return {
            type: "image",
            value: block.url,
            caption: block.caption || "",
          };
        }
        return null;
      }).filter(Boolean);

      if (contents.length === 0) {
        alert("Bài viết không có nội dung hợp lệ");
        return;
      }

      const postData = {
        title: post.title,
        location: post.location,
        contents: contents,
      };

      // Create post with AI user identity
      const aiUser = {
        uid: "gemini_ai",
        displayName: "✨ AI Travel Guide",
        photoURL: null,
      };

      await createPost(postData, "gemini_ai", aiUser, true);
      
      // Update status
      setPendingPosts(prev => 
        prev.map(p => p.id === post.id ? { ...p, status: "approved" } : p)
      );
      
      setShowPreview(false);
      setSelectedPost(null);
      
      if (onPostCreated) {
        onPostCreated();
      }
      
      alert("✅ Đã đăng bài viết thành công!");
    } catch (error) {
      console.error("Error approving post:", error);
      alert(`Lỗi khi đăng bài: ${error.message}`);
    }
  };

  const handleReject = (post) => {
    setPendingPosts(prev => 
      prev.map(p => p.id === post.id ? { ...p, status: "rejected" } : p)
    );
    setShowPreview(false);
    setSelectedPost(null);
  };

  const handleDelete = (postId) => {
    if (window.confirm("Bạn có chắc muốn xóa bài viết này?")) {
      setPendingPosts(prev => prev.filter(p => p.id !== postId));
      if (selectedPost && selectedPost.id === postId) {
        setShowPreview(false);
        setSelectedPost(null);
      }
    }
  };

  const handleViewPreview = (post) => {
    setSelectedPost(post);
    setShowPreview(true);
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="ai-generate-container">
      {/* Header */}
      <div className="ai-generate-header">
        <div className="header-left">
          <div className="header-icon">
            <Sparkles size={28} />
          </div>
          <div>
            <h2>AI Tạo Bài Viết</h2>
            <p>Nhập từ khóa, AI sẽ tìm kiếm Google và tạo bài viết cho bạn</p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="keyword-search-form">
          <div className="input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Nhập từ khóa (VD: Hà Nội, Sapa, Phú Quốc...)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="keyword-input"
              disabled={isSearching}
            />
          </div>
          <button 
            type="submit" 
            className="search-btn"
            disabled={isSearching || !keyword.trim()}
          >
            {isSearching ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Đang tìm kiếm...</span>
              </>
            ) : (
              <>
                <Search size={18} />
                <span>Tìm kiếm</span>
              </>
            )}
          </button>
        </form>
        <p className="search-hint">
          AI sẽ tìm kiếm Google với từ khóa "giới thiệu {keyword || '...'}" và tạo bài viết từ kết quả tìm kiếm
        </p>
      </div>

      {/* Pending Posts Queue */}
      {pendingPosts.length > 0 && (
        <div className="pending-posts-section">
          <div className="section-header">
            <h3>Bài viết chờ duyệt ({pendingPosts.filter(p => p.status === "pending").length})</h3>
            <span className="queue-count">
              Tổng: {pendingPosts.length} | 
              Đã duyệt: {pendingPosts.filter(p => p.status === "approved").length} | 
              Đã từ chối: {pendingPosts.filter(p => p.status === "rejected").length}
            </span>
          </div>
          
          <div className="pending-posts-grid">
            {pendingPosts.map((post) => (
              <div 
                key={post.id} 
                className={`pending-post-card ${post.status}`}
              >
                <div className="post-card-header">
                  <div className="post-title-section">
                    <h4>{post.title}</h4>
                    <span className="post-location">📍 {post.location}</span>
                  </div>
                  <div className="post-status-badge">
                    {post.status === "pending" && (
                      <span className="badge pending">Chờ duyệt</span>
                    )}
                    {post.status === "approved" && (
                      <span className="badge approved">✓ Đã duyệt</span>
                    )}
                    {post.status === "rejected" && (
                      <span className="badge rejected">✗ Đã từ chối</span>
                    )}
                  </div>
                </div>

                <div className="post-card-content">
                  <div className="post-preview-text">
                    {post.content.find(b => b.type === "text")?.content?.substring(0, 150) || "Không có nội dung"}...
                  </div>
                  <div className="post-meta">
                    <span className="post-time">
                      <Clock size={12} />
                      {formatTime(post.createdAt)}
                    </span>
                    <span className="post-blocks">
                      {post.content.filter(b => b.type === "text").length} đoạn văn, {post.content.filter(b => b.type === "image").length} ảnh
                    </span>
                  </div>
                </div>

                <div className="post-card-actions">
                  {post.status === "pending" && (
                    <>
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleViewPreview(post)}
                        title="Xem trước"
                      >
                        <Eye size={16} />
                        Xem
                      </button>
                      <button
                        className="action-btn approve-btn"
                        onClick={() => handleApprove(post)}
                        title="Duyệt và đăng"
                      >
                        <CheckCircle2 size={16} />
                        Duyệt
                      </button>
                      <button
                        className="action-btn reject-btn"
                        onClick={() => handleReject(post)}
                        title="Từ chối"
                      >
                        <X size={16} />
                        Từ chối
                      </button>
                    </>
                  )}
                  {post.status !== "pending" && (
                    <button
                      className="action-btn view-btn"
                      onClick={() => handleViewPreview(post)}
                      title="Xem lại"
                    >
                      <Eye size={16} />
                      Xem lại
                    </button>
                  )}
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(post.id)}
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {post.sources && post.sources.length > 0 && (
                  <div className="post-sources">
                    <span className="sources-label">Nguồn tham khảo:</span>
                    {post.sources.slice(0, 2).map((source, idx) => (
                      <a 
                        key={idx} 
                        href={source} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="source-link"
                      >
                        <ExternalLink size={12} />
                        {new URL(source).hostname}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingPosts.length === 0 && !isSearching && (
        <div className="empty-state">
          <Search size={48} className="empty-icon" />
          <h3>Chưa có bài viết nào</h3>
          <p>Nhập từ khóa và tìm kiếm để AI tạo bài viết cho bạn</p>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedPost && (
        <div className="preview-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <div>
                <h3>{selectedPost.title}</h3>
                <p className="preview-location">
                  <span>📍 {selectedPost.location}</span>
                  {selectedPost.sources && selectedPost.sources.length > 0 && (
                    <span className="sources-count">
                      {selectedPost.sources.length} nguồn tham khảo
                    </span>
                  )}
                </p>
              </div>
              <button className="icon-btn" onClick={() => setShowPreview(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="preview-content">
              <div className="preview-blocks">
                {selectedPost.content.map((block, index) => (
                  <div key={index} className="preview-block">
                    {block.type === "text" ? (
                      <p>{block.content}</p>
                    ) : (
                      <div className="preview-image">
                        <img src={block.url} alt={block.caption || selectedPost.location} />
                        {block.caption && <p className="image-caption">{block.caption}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedPost.sources && selectedPost.sources.length > 0 && (
                <div className="preview-sources">
                  <h4>Nguồn tham khảo:</h4>
                  <ul>
                    {selectedPost.sources.map((source, idx) => (
                      <li key={idx}>
                        <a href={source} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={14} />
                          {source}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="preview-actions">
              <button className="cancel-btn" onClick={() => setShowPreview(false)}>
                Đóng
              </button>
              {selectedPost.status === "pending" && (
                <>
                  <button 
                    className="reject-btn-modal" 
                    onClick={() => {
                      handleReject(selectedPost);
                      setShowPreview(false);
                    }}
                  >
                    <X size={18} />
                    Từ chối
                  </button>
                  <button 
                    className="approve-btn-modal" 
                    onClick={() => {
                      handleApprove(selectedPost);
                      setShowPreview(false);
                    }}
                  >
                    <CheckCircle2 size={18} />
                    Duyệt và đăng
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoGeneratePosts;
