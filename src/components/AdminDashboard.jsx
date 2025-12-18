import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FileText,
  CheckCircle,
  BarChart3,
  Shield,
  LogOut,
  ChevronDown,
} from "lucide-react";
import "./AdminDashboard.css";
import { getAdminStats, isUserAdmin } from "../services/admin";
import UserManagement from "./AdminUserManagement";
import PostManagement from "./AdminPostManagement";
import { logOut } from "../services/firebase";

const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stats");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    pendingPosts: 0,
    totalAdmins: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Kiểm tra quyền admin
  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const checkAdmin = async () => {
      const adminStatus = await isUserAdmin(user.uid);
      if (!adminStatus) {
        navigate("/");
      } else {
        setIsAdmin(true);
      }
    };

    checkAdmin();
  }, [user, navigate]);

  // Lấy thống kê
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getAdminStats();
        setStats(data);
      } catch (error) {
        console.error("Lỗi lấy thống kê:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const handleLogout = async () => {
    try {
      await logOut();
      navigate("/");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  };

  if (!isAdmin) {
    return <div className="admin-loading">Đang kiểm tra quyền...</div>;
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <div className="admin-title">
            <Shield size={28} className="admin-icon" />
            <h1>Bảng Điều Khiển Quản Trị</h1>
          </div>
        </div>
        <div className="admin-header-right">
          <div className="admin-user-dropdown">
            <button
              className="admin-user-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <img
                src={
                  user?.photoURL ||
                  "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
                }
                alt={user?.displayName}
                className="admin-user-avatar"
              />
              <span>{user?.displayName || "Admin"}</span>
              <ChevronDown size={16} />
            </button>
            {isDropdownOpen && (
              <div className="admin-dropdown-menu">
                <button onClick={() => navigate("/")} className="dropdown-item">
                  Về trang chủ
                </button>
                <button onClick={handleLogout} className="dropdown-item logout">
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button
          className={`nav-tab ${activeTab === "stats" ? "active" : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          <BarChart3 size={18} />
          <span>Thống Kê</span>
        </button>
        <button
          className={`nav-tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={18} />
          <span>Người Dùng</span>
        </button>
        <button
          className={`nav-tab ${activeTab === "posts" ? "active" : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          <FileText size={18} />
          <span>Bài Viết</span>
        </button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="admin-stats-container">
            <h2 className="section-title">Thống Kê Hệ Thống</h2>
            {loading ? (
              <div className="stats-loading">Đang tải...</div>
            ) : (
              <div className="stats-grid">
                <div className="stat-card users-stat">
                  <div className="stat-icon">
                    <Users size={32} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Tổng Người Dùng</p>
                    <p className="stat-value">{stats.totalUsers}</p>
                  </div>
                </div>

                <div className="stat-card posts-stat">
                  <div className="stat-icon">
                    <FileText size={32} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Tổng Bài Viết</p>
                    <p className="stat-value">{stats.totalPosts}</p>
                  </div>
                </div>

                <div className="stat-card pending-stat">
                  <div className="stat-icon">
                    <CheckCircle size={32} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Chờ Phê Duyệt</p>
                    <p className="stat-value">{stats.pendingPosts}</p>
                  </div>
                </div>

                <div className="stat-card admin-stat">
                  <div className="stat-icon">
                    <Shield size={32} />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Tổng Admin</p>
                    <p className="stat-value">{stats.totalAdmins}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && <UserManagement user={user} />}

        {/* Posts Tab */}
        {activeTab === "posts" && <PostManagement user={user} />}
      </div>
    </div>
  );
};

export default AdminDashboard;
