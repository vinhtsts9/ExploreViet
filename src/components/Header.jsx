import React, { useState } from "react";
import { Search, Sparkles, PlusCircle, X } from "lucide-react";
import "./Header.css";
import { signInWithGoogle, logOut } from "../services/firebase";

const Header = ({ searchQuery, user, setSearchQuery, onSearch, setView }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="header-container">
      <div className="header-content">
        {/* Logo & Nút Đăng bài */}
        <div className="header-top">
          <h1 className="header-logo" onClick={() => setView("home")}>
            <Sparkles className="logo-icon" /> Vietnam Travel
          </h1>

          <div className="header-actions">
            {user && (
              <button
                onClick={() => setView("create")}
                className="add-post-button"
              >
                <PlusCircle size={20} />
                <span className="add-post-button-text">Đăng bài</span>
              </button>
            )}

            {user ? (
              <div className="user-info">
                <img
                  src={user.photoURL || "/default-avatar.png"}
                  alt={user.displayName || "User"}
                  className="user-avatar"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                />

                {isDropdownOpen && (
                  <div className="user-dropdown">
                    <button onClick={logOut}>Đăng xuất</button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setView("login")}
                className="add-post-button"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>

        {/* Thanh tìm kiếm */}
        <form onSubmit={onSearch} className="search-form">
          <input
            type="text"
            placeholder="Bạn muốn đi đâu? (VD: Hà Giang)..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Search className="search-icon" size={24} />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="clear-search-button"
            >
              <X size={24} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Header;
