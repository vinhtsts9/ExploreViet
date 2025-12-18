import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, X } from "lucide-react";
import "./ItineraryPlanner.css";

/**
 * ItineraryItem
 * - Dùng chung cho item trong wishlist và trong ngày
 * - Nếu có onRemove => hiển thị nút X để xóa khỏi ngày
 */
export const ItineraryItem = ({
  item,
  dayId,
  onTimeChange,
  isOverlay,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      dayId: dayId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const itemClass = `itinerary-item ${isDragging ? "dragging" : ""}`;
  const finalListeners = isOverlay ? {} : listeners;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...finalListeners}
      className={itemClass}
    >
      {/* Nút X nhỏ để xóa item khỏi ngày (chỉ khi có onRemove) */}
      {onRemove && !isOverlay && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 2,
            borderRadius: 999,
          }}
          title="Xóa khỏi ngày này"
        >
          <X size={12} />
        </button>
      )}

      <div className="item-content">
        <h4>{item.title}</h4>
        {item.type === "post" && (
          <p className="item-location" style={{ fontSize: 12, color: "#666" }}>
            {item.location}
          </p>
        )}
        {item.type === "note" && (
          <p className="item-note-content" style={{ fontStyle: "italic" }}>
            {item.content}
          </p>
        )}
      </div>
      {item.time && !isOverlay && onTimeChange && (
        <div className="item-time">
          <Clock size={14} />
          <div className="time-editor">
            <input
              type="time"
              value={item.time || "09:00"}
              onChange={(e) => onTimeChange(item.id, e.target.value)}
              className="time-input-direct"
            />
          </div>
        </div>
      )}
    </div>
  );
};
