import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, ArrowLeft, Loader2 } from "lucide-react";
import { listenWishlist } from "../services/posts";
import PostCard from "./PostCard";
import "./FavoriteList.css";

const FavoriteList = ({ user, authLoading = false, posts = [], onLike, onPostClick, onDeletePost }) => {
  const navigate = useNavigate();
  const [favoritePosts, setFavoritePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistPostIds, setWishlistPostIds] = useState([]);

  // Listen to wishlist changes in real-time
  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate("/");
      return;
    }

    setLoading(true);
    
    const unsubscribe = listenWishlist(user.uid, (postIds) => {
      setWishlistPostIds(postIds);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, navigate, authLoading]);

  // Update favorite posts when wishlist or posts change
  useEffect(() => {
    if (wishlistPostIds.length === 0) {
      setFavoritePosts([]);
      return;
    }

    // Filter posts that are in wishlist
    const favoritePostsData = posts.filter(post => 
      post && wishlistPostIds.includes(post.id)
    );
    
    setFavoritePosts(favoritePostsData);
  }, [wishlistPostIds, posts]);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="favorite-list-container">
        <div className="loading-indicator">
          <Loader2 className="icon" size={32} />
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  // Redirect if not logged in (handled by useEffect, but show nothing while redirecting)
  if (!user) {
    return null;
  }

  return (
    <div className="favorite-list-container">
      <div className="favorite-list-header">
        <button onClick={() => navigate("/")} className="back-button">
          <ArrowLeft size={20} />
          <span>Quay lại</span>
        </button>
        <div className="favorite-list-title">
          <Bookmark size={32} className="bookmark-icon" />
          <h1>Danh sách yêu thích</h1>
        </div>
      </div>

      <div className="favorite-list-content">
        {loading ? (
          <div className="loading-indicator">
            <Loader2 className="icon" size={32} />
            <p>Đang tải danh sách yêu thích...</p>
          </div>
        ) : favoritePosts.length === 0 ? (
          <div className="no-favorites">
            <Bookmark size={64} className="empty-icon" />
            <h2>Chưa có bài viết yêu thích</h2>
            <p>Hãy thêm các bài viết vào danh sách yêu thích để xem lại sau!</p>
            <button onClick={() => navigate("/")} className="browse-button">
              Khám phá bài viết
            </button>
          </div>
        ) : (
          <div className="favorite-posts-grid">
            {favoritePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={onLike}
                currentUserId={user?.uid}
                currentUser={user}
                onDelete={onDeletePost}
                onClick={() => onPostClick(post)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoriteList;

