import React, { useState, useEffect } from "react";
import {
  Shield,
  Trash2,
  ShieldOff,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import "./AdminUserManagement.css";
import {
  getAllUsers,
  subscribeToUsers,
  promoteToAdmin,
  revokeAdminRole,
  deleteUser,
} from "../services/admin";

const UserManagement = ({ user: currentUser }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Load users
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToUsers((loadedUsers) => {
      setUsers(loadedUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter và sort users
  useEffect(() => {
    let filtered = users.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort
    if (sortBy === "newest") {
      filtered.sort(
        (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
      );
    } else if (sortBy === "oldest") {
      filtered.sort(
        (a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)
      );
    } else if (sortBy === "admin") {
      filtered.sort((a, b) => {
        const aIsAdmin = a.role === "admin" ? 1 : 0;
        const bIsAdmin = b.role === "admin" ? 1 : 0;
        return bIsAdmin - aIsAdmin;
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, sortBy]);

  const handlePromoteAdmin = async (userId) => {
    if (userId === currentUser?.uid) {
      alert("Bạn không thể xóa quyền của chính mình!");
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [userId]: true }));
      await promoteToAdmin(userId);
      alert("✅ Bổ nhiệm admin thành công!");
    } catch (error) {
      alert("❌ Lỗi: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleRevokeAdmin = async (userId) => {
    if (userId === currentUser?.uid) {
      alert("Bạn không thể xóa quyền của chính mình!");
      return;
    }

    if (!window.confirm("Bạn chắc chắn muốn thu hồi quyền admin?")) {
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [userId]: true }));
      await revokeAdminRole(userId);
      alert("✅ Thu hồi quyền admin thành công!");
    } catch (error) {
      alert("❌ Lỗi: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser?.uid) {
      alert("Bạn không thể xóa chính mình!");
      return;
    }

    if (
      !window.confirm(
        "Bạn chắc chắn muốn xóa người dùng này? Tất cả bài viết của họ sẽ bị xóa!"
      )
    ) {
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [userId]: true }));
      await deleteUser(userId);
      alert("✅ Xóa người dùng thành công!");
    } catch (error) {
      alert("❌ Lỗi: " + error.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="user-management">
      <h2 className="section-title">Quản Lý Người Dùng</h2>

      {/* Search & Filter */}
      <div className="user-controls">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="admin">Admin trước</option>
        </select>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="loading-state">Đang tải danh sách người dùng...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-state">Không tìm thấy người dùng nào</div>
      ) : (
        <div className="users-list">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className={`user-item ${
                expandedUserId === u.id ? "expanded" : ""
              }`}
            >
              <div
                className="user-header"
                onClick={() =>
                  setExpandedUserId(expandedUserId === u.id ? null : u.id)
                }
              >
                <div className="user-info">
                  <img
                    src={
                      u.photoURL ||
                      "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
                    }
                    alt={u.displayName}
                    className="user-avatar"
                  />
                  <div className="user-details">
                    <div className="user-name-badge">
                      <h3>{u.displayName || "Anonymous"}</h3>
                      {u.role === "admin" && (
                        <span className="admin-badge">Admin</span>
                      )}
                    </div>
                    <p className="user-email">{u.email || "No email"}</p>
                  </div>
                </div>
                <button className="expand-btn">
                  {expandedUserId === u.id ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </button>
              </div>

              {expandedUserId === u.id && (
                <div className="user-details-expanded">
                  <div className="detail-row">
                    <span className="detail-label">ID:</span>
                    <span className="detail-value">{u.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Ngày tạo:</span>
                    <span className="detail-value">
                      {formatDate(u.createdAt)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Đăng nhập lần cuối:</span>
                    <span className="detail-value">
                      {formatDate(u.lastLogin)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Vai trò:</span>
                    <span className={`detail-value role-${u.role}`}>
                      {u.role}
                    </span>
                  </div>

                  {u.id !== currentUser?.uid && (
                    <div className="user-actions">
                      {u.role !== "admin" ? (
                        <button
                          className="action-btn promote-btn"
                          onClick={() => handlePromoteAdmin(u.id)}
                          disabled={actionLoading[u.id]}
                        >
                          <Shield size={16} />
                          {actionLoading[u.id]
                            ? "Đang xử lý..."
                            : "Bổ Nhiệm Admin"}
                        </button>
                      ) : (
                        <button
                          className="action-btn revoke-btn"
                          onClick={() => handleRevokeAdmin(u.id)}
                          disabled={actionLoading[u.id]}
                        >
                          <ShieldOff size={16} />
                          {actionLoading[u.id]
                            ? "Đang xử lý..."
                            : "Thu Hồi Admin"}
                        </button>
                      )}

                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={actionLoading[u.id]}
                      >
                        <Trash2 size={16} />
                        {actionLoading[u.id] ? "Đang xử lý..." : "Xóa"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="users-count">
        Tổng cộng: <strong>{filteredUsers.length}</strong> người dùng
      </div>
    </div>
  );
};

export default UserManagement;
