import React from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { ItineraryItem } from "./ItineraryItem";
import { StickyNote, Trash2 } from "lucide-react";
import "./ItineraryPlanner.css";

export const DayColumn = ({
  day,
  itinerary,
  onItemUpdate,
  onAddNote,
  onDeleteDay,
  onRemoveItem,
}) => {
  /**
   * QUAN TRỌNG:
   * - Droppable phải đặt vào ĐÚNG vùng thả (items container)
   * - Có data.dayId để Planner biết đang thả vào ngày nào
   */
  const { setNodeRef, isOver } = useDroppable({
    id: day.id,
    data: {
      type: "day",
      dayId: day.id,
    },
  });

  const columnClass = `day-column ${isOver ? "over" : ""}`;

  /**
   * Giữ nguyên logic chỉnh giờ (RẤT QUAN TRỌNG)
   * → đây là pure function, không đụng mutation
   */
  const updateItemTime = (currentItinerary, dayId, itemId, newTime) => ({
    ...currentItinerary,
    days: currentItinerary.days.map((day) =>
      day.id === dayId
        ? {
            ...day,
            items: day.items.map((item) =>
              item.id === itemId ? { ...item, time: newTime } : item
            ),
          }
        : day
    ),
  });

  const handleTimeChange = (itemId, newTime) => {
    const updatedItinerary = updateItemTime(itinerary, day.id, itemId, newTime);
    onItemUpdate(updatedItinerary);
  };

  return (
    <div className={columnClass}>
      {/* Header giữ nguyên */}
      <div className="day-column-header">
        <h3>{day.title}</h3>
        <div className="day-column-actions">
          <button
            onClick={onAddNote}
            className="day-action-btn"
            title="Thêm ghi chú"
          >
            <StickyNote size={16} />
          </button>
          <button
            onClick={onDeleteDay}
            className="day-action-btn delete"
            title="Xóa ngày"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/*
        CỰC KỲ QUAN TRỌNG:
        - setNodeRef PHẢI gắn vào day-items-container
        - Không gắn vào wrapper ngoài, nếu không DROP KHÔNG ĂN
      */}
      <SortableContext
        id={day.id}
        items={day.items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="day-items-container">
          {day.items.map((item) => (
            <ItineraryItem
              key={item.id}
              item={item}
              dayId={day.id}
              onTimeChange={handleTimeChange}
              isOverlay={false}
              onRemove={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};
