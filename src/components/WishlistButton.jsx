import React, { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { addToWishlist, removeFromWishlist, isInWishlist } from "../services/posts";
import "./WishlistButton.css";

const WishlistButton = ({ postId, userId, size = 20 }) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (postId && userId) {
      checkWishlistStatus();
    }
  }, [postId, userId]);

  const checkWishlistStatus = async () => {
    try {
      const inWishlist = await isInWishlist(postId, userId);
      setIsWishlisted(inWishlist);
    } catch (error) {
      console.error("Error checking wishlist:", error);
    }
  };

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (!userId) {
      alert("Bạn cần đăng nhập để thêm vào danh sách yêu thích");
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      if (isWishlisted) {
        await removeFromWishlist(postId, userId);
        setIsWishlisted(false);
      } else {
        await addToWishlist(postId, userId);
        setIsWishlisted(true);
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      alert(error.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <button
      className={`wishlist-button ${isWishlisted ? "active" : ""} ${loading ? "loading" : ""}`}
      onClick={handleToggle}
      title={isWishlisted ? "Xóa khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
      disabled={loading}
    >
      <Bookmark
        size={size}
        fill={isWishlisted ? "currentColor" : "none"}
        strokeWidth={isWishlisted ? 0 : 2}
      />
    </button>
  );
};

export default WishlistButton;




