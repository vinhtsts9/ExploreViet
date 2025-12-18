import React, { useState } from "react";
import { Star } from "lucide-react";
import "./Rating.css";

const Rating = ({
  rating = 0,
  maxRating = 5,
  onRate,
  interactive = false,
  size = 20,
  showText = false,
  showCount = false,
  ratingCount = 0,
}) => {
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleClick = (value) => {
    if (interactive && onRate) {
      onRate(value);
    }
  };

  const displayRating = hoveredRating || rating;
  const fullStars = Math.floor(displayRating);
  const hasHalfStar = displayRating % 1 >= 0.5;

  return (
    <div className="rating-container">
      <div className="rating-stars">
        {Array.from({ length: maxRating }, (_, index) => {
          const starValue = index + 1;
          const isFull = starValue <= fullStars;
          const isHalf = starValue === fullStars + 1 && hasHalfStar;
          const isHovered = interactive && starValue <= hoveredRating;

          return (
            <span
              key={index}
              className={`rating-star ${isFull ? "full" : ""} ${
                isHalf ? "half" : ""
              } ${isHovered ? "hovered" : ""} ${interactive ? "interactive" : ""}`}
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => interactive && setHoveredRating(starValue)}
              onMouseLeave={() => interactive && setHoveredRating(0)}
              style={{ fontSize: `${size}px` }}
            >
              <Star
                size={size}
                fill={isFull ? "currentColor" : "none"}
                strokeWidth={isFull ? 0 : 1.5}
              />
            </span>
          );
        })}
      </div>
      {showText && (
        <span className="rating-text">
          {rating > 0 ? rating.toFixed(1) : "Chưa có đánh giá"}
        </span>
      )}
      {showCount && ratingCount > 0 && (
        <span className="rating-count">({ratingCount})</span>
      )}
    </div>
  );
};

export default Rating;





