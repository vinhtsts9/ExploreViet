import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Search,
  Sparkles,
  PlusCircle,
  X,
  Home,
  FileText,
  HelpCircle,
  Cloud,
  Bookmark,
  Shield,
  CalendarDays,
  LogIn,
} from "lucide-react";
import "./Header.css";
import { logOut } from "../services/firebase";
import { isUserAdmin } from "../services/admin";
import WeatherWidget from "./WeatherWidget";
import NotificationBell from "./NotificationBell";

const Header = ({
  searchQuery,
  user,
  setSearchQuery,
  onSearch,
  currentView,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (user) {
      const checkAdmin = async () => {
        const adminStatus = await isUserAdmin(user.uid);
        setIsAdmin(adminStatus);
      };
      checkAdmin();
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Kiểm tra xem có phải trang chủ không
  const isHomePage = location.pathname === "/";

  // Reset scroll state khi chuyển trang
  useEffect(() => {
    if (!isHomePage) {
      // Nếu không phải trang chủ, luôn hiển thị compact
      setIsScrolled(true);
    } else {
      // Nếu là trang chủ, reset về trạng thái ban đầu (chưa scroll)
      setIsScrolled(false);
    }
  }, [isHomePage]);

  useEffect(() => {
    // Nếu không phải trang chủ, không cần lắng nghe scroll
    if (!isHomePage) {
      return;
    }

    // Chỉ áp dụng logic scroll cho trang chủ
    let rafId = null;
    let timeoutId = null;

    const updateScrollState = () => {
      const scrollPosition = window.scrollY;

      let shouldBeScrolled;

      if (isScrolled) {
        // Đang ở trạng thái compact: chỉ chuyển về khi scroll lên gần đầu trang
        shouldBeScrolled = scrollPosition > 50;
      } else {
        // Đang ở trạng thái bình thường: chuyển sang compact khi scroll xuống 500px
        shouldBeScrolled = scrollPosition > 500;
      }

      if (shouldBeScrolled !== isScrolled) {
        setIsScrolled(shouldBeScrolled);
      }

      rafId = null;
    };

    const handleScroll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          updateScrollState();
        });
      }

      timeoutId = setTimeout(() => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        updateScrollState();
      }, 16);
    };

    updateScrollState();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isScrolled, isHomePage]);

  return (
    <div className={`header-container ${isScrolled ? "scrolled" : ""}`}>
      {/* Phiên bản đầy đủ - Khi chưa scroll */}
      {!isScrolled && (
        <div className="header-full">
          {/* Layout: Logo trái | Navigation+Search giữa | Weather+User phải */}
          <div className="header-full-layout">
            {/* Logo */}
            <div className="header-logo-section">
              <Link to="/" className="header-logo">
                <Sparkles className="logo-icon" size={28} />
                <span className="logo-text">Vietnam Travel</span>
              </Link>
            </div>

            {/* Navigation - 2 hàng trong 1 box */}
            <div className="header-center-section">
              <nav className="nav-bar-full nav-bar-two-rows">
                {/* Hàng 1 */}
                <div className="nav-row-1">
                  <Link
                    to="/"
                    className={`nav-btn-full ${
                      location.pathname === "/" ? "active" : ""
                    }`}
                  >
                    <Home size={20} />
                    <span>Trang chủ</span>
                  </Link>

                  {user && (
                    <Link
                      to="/create"
                      className={`nav-btn-full ${
                        location.pathname === "/create" ? "active" : ""
                      }`}
                    >
                      <PlusCircle size={20} />
                      <span>Đăng bài</span>
                    </Link>
                  )}

                  {user && (
                    <Link
                      to="/my-posts"
                      className={`nav-btn-full ${
                        location.pathname === "/my-posts" ? "active" : ""
                      }`}
                    >
                      <FileText size={20} />
                      <span>Bài viết của tôi</span>
                    </Link>
                  )}

                  {user && (
                    <Link
                      to="/favorites"
                      className={`nav-btn-full ${
                        location.pathname === "/favorites" ? "active" : ""
                      }`}
                    >
                      <Bookmark size={20} />
                      <span>Danh sách yêu thích</span>
                    </Link>
                  )}

                  {user && (
                    <Link
                      to="/itinerary-planner/new"
                      className={`nav-btn-full ${
                        location.pathname.startsWith("/itinerary-planner") &&
                        !location.pathname.startsWith("/my-itineraries")
                          ? "active"
                          : ""
                      }`}
                    >
                      <CalendarDays size={20} />
                      <span>Xếp lịch du lịch</span>
                    </Link>
                  )}
                  {user && (
                    <Link
                      to="/my-itineraries"
                      className={`nav-btn-full ${
                        location.pathname === "/my-itineraries" ? "active" : ""
                      }`}
                    >
                      <CalendarDays size={20} />
                      <span>Lịch trình của tôi</span>
                    </Link>
                  )}
                </div>

                {/* Hàng 2 */}
                <div className="nav-row-2">
                  <Link
                    to="/qa"
                    className={`nav-btn-full ${
                      location.pathname === "/qa" ? "active" : ""
                    }`}
                  >
                    <HelpCircle size={20} />
                    <span>Hỏi & Đáp</span>
                  </Link>
                  <Link
                    to="/weather-forecast"
                    className={`nav-btn-full ${
                      location.pathname === "/weather-forecast" ? "active" : ""
                    }`}
                  >
                    <Cloud size={20} />
                    <span>Dự báo thời tiết</span>
                  </Link>
                </div>
              </nav>
            </div>

            {/* Phần A (Weather + Profile) và Phần B (Search) */}
            <div className="header-right-section">
              {/* Phần A: Weather (trái) + Profile (phải) */}
              <div className="header-right-section-a">
                <div className="weather-section-full">
                  <WeatherWidget />
                </div>

                <div className="user-section-full">
                  {user ? (
                    <div className="user-info-full">
                      <NotificationBell userId={user.uid} />
                      <img
                        src={user.photoURL || "/default-avatar.png"}
                        alt={user.displayName || "User"}
                        className="user-avatar-full"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      />
                      {isDropdownOpen && (
                        <div className="user-dropdown-full">
                          {isAdmin && (
                            <Link to="/admin" className="dropdown-link">
                              <Shield size={16} />
                              Quản trị
                            </Link>
                          )}
                          <button onClick={logOut} className="dropdown-button">
                            Đăng xuất
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link to="/login" className="login-btn-full">
                      <LogIn size={18} />
                      <span>Đăng nhập</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Phần B: Search */}
              <div className="header-right-section-b">
                <form onSubmit={onSearch} className="search-form-full">
                  <Search className="search-icon-full" size={20} />
                  <input
                    type="text"
                    placeholder="Bạn muốn đi đâu? (VD: Hà Giang)..."
                    className="search-input-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="clear-search-full"
                    >
                      <X size={18} />
                    </button>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phiên bản compact - Khi scroll */}
      {isScrolled && (
        <div className="header-compact">
          <div className="header-compact-layout">
            {/* Logo - chỉ icon */}
            <Link to="/" className="logo-compact">
              <Sparkles className="logo-icon-compact" size={24} />
            </Link>

            {/* Navigation - chỉ icon */}
            <nav className="nav-bar-compact">
              <Link
                to="/"
                className={`nav-btn-compact ${
                  location.pathname === "/" ? "active" : ""
                }`}
                title="Trang chủ"
              >
                <Home size={20} />
              </Link>

              {user && (
                <Link
                  to="/create"
                  className={`nav-btn-compact ${
                    location.pathname === "/create" ? "active" : ""
                  }`}
                  title="Đăng bài"
                >
                  <PlusCircle size={20} />
                </Link>
              )}

              {user && (
                <Link
                  to="/my-posts"
                  className={`nav-btn-compact ${
                    location.pathname === "/my-posts" ? "active" : ""
                  }`}
                  title="Bài viết của tôi"
                >
                  <FileText size={20} />
                </Link>
              )}

              {user && (
                <Link
                  to="/favorites"
                  className={`nav-btn-compact ${
                    location.pathname === "/favorites" ? "active" : ""
                  }`}
                  title="Danh sách yêu thích"
                >
                  <Bookmark size={20} />
                </Link>
              )}

              {user && (
                <Link
                  to="/itinerary-planner/new"
                  className={`nav-btn-compact ${
                    location.pathname.startsWith("/itinerary-planner") &&
                    !location.pathname.startsWith("/my-itineraries")
                      ? "active"
                      : ""
                  }`}
                  title="Xếp lịch du lịch"
                >
                  <CalendarDays size={20} />
                </Link>
              )}
              {user && (
                <Link
                  to="/my-itineraries"
                  className={`nav-btn-compact ${
                    location.pathname === "/my-itineraries" ? "active" : ""
                  }`}
                  title="Lịch trình của tôi"
                >
                  <CalendarDays size={20} />
                </Link>
              )}

              <Link
                to="/qa"
                className={`nav-btn-compact ${
                  location.pathname === "/qa" ? "active" : ""
                }`}
                title="Hỏi & Đáp"
              >
                <HelpCircle size={20} />
              </Link>
              <Link
                to="/weather-forecast"
                className={`nav-btn-compact ${
                  location.pathname === "/weather-forecast" ? "active" : ""
                }`}
                title="Dự báo thời tiết"
              >
                <Cloud size={20} />
              </Link>
            </nav>

            {/* Search - compact */}
            <form onSubmit={onSearch} className="search-form-compact">
              <Search className="search-icon-compact" size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="search-input-compact"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="clear-search-compact"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* Weather - compact */}
            <div className="weather-compact">
              <WeatherWidget />
            </div>

            {/* User - chỉ avatar */}
            <div className="user-compact">
              {user ? (
                <div className="user-info-compact">
                  <NotificationBell userId={user.uid} />
                  <img
                    src={user.photoURL || "/default-avatar.png"}
                    alt={user.displayName || "User"}
                    className="user-avatar-compact"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  />
                  {isDropdownOpen && (
                    <div className="user-dropdown-compact">
                      {isAdmin && (
                        <Link to="/admin" className="dropdown-link">
                          <Shield size={16} />
                          Quản trị
                        </Link>
                      )}
                      <button onClick={logOut} className="dropdown-button">
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="login-btn-compact"
                  title="Đăng nhập"
                >
                  <LogIn size={18} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
