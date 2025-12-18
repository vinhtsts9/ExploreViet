import React from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { ItineraryItem } from "./ItineraryItem";
import "./ItineraryPlanner.css";

export const WishlistColumn = ({ items }) => {
  const { setNodeRef } = useDroppable({ id: "wishlist" });

  return (
    <div ref={setNodeRef} className="wishlist-column">
      <h3>
        <i className="fas fa-heart"></i> Danh sách yêu thích
      </h3>
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="day-items-container">
          {items.map((item) => (
            <ItineraryItem key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};
