import React, { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  getItineraryById,
  updateItinerary,
  createItinerary,
} from "../services/itinerary";
import { getUserWishlist, getPostDetails } from "../services/posts";
import { useAuth } from "../contexts/AuthContext";

import { DayColumn } from "./DayColumn";
import { WishlistColumn } from "./WishlistColumn";
import { ItineraryItem } from "./ItineraryItem";

import "./ItineraryPlanner.css";

/**
 * ItineraryPlanner
 * - Trung tâm điều phối state + Drag & Drop
 * - Hỗ trợ kéo từ Wishlist → Day (kể cả ngày trống)
 * - Hỗ trợ di chuyển item giữa các ngày
 * - Chỉ lưu khi người dùng bấm "Lưu kế hoạch"
 */
export const ItineraryPlanner = ({ itineraryId }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [itinerary, setItinerary] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  /* -------------------- DND SENSOR -------------------- */
  const sensors = useSensors(useSensor(PointerSensor));

  /* -------------------- LOAD DATA -------------------- */
  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // TẠO ITINERARY MỚI
      if (itineraryId === "new") {
        const newItinerary = {
          title: "Lịch trình mới",
          description:
            "Kéo và thả các địa điểm từ danh sách yêu thích vào lịch trình của bạn.",
          startDate: new Date().toISOString().split("T")[0],
          days: [
            { id: `day-${Date.now()}-1`, title: "Ngày 1", items: [] },
            { id: `day-${Date.now()}-2`, title: "Ngày 2", items: [] },
            { id: `day-${Date.now()}-3`, title: "Ngày 3", items: [] },
          ],
        };

        const newId = await createItinerary(currentUser.uid, newItinerary);
        navigate(`/itinerary-planner/${newId}`, { replace: true });
        setItinerary({ ...newItinerary, id: newId });

        const wishlistIds = await getUserWishlist(currentUser.uid);
        const wishlistDetails = await Promise.all(
          wishlistIds.map((id) => getPostDetails(id))
        );

        setWishlistItems(
          wishlistDetails.filter(Boolean).map((post) => ({
            id: post.id,
            type: "post",
            title: post.title,
            location: post.location,
          }))
        );

        setLoading(false);
        return;
      }

      // LOAD ITINERARY CŨ
      try {
        const [itineraryData, wishlistIds] = await Promise.all([
          getItineraryById(itineraryId),
          getUserWishlist(currentUser.uid),
        ]);

        if (!itineraryData) {
          setItinerary(null);
          setLoading(false);
          return;
        }

        setItinerary(itineraryData);

        const wishlistDetails = await Promise.all(
          wishlistIds.map((id) => getPostDetails(id))
        );

        setWishlistItems(
          wishlistDetails.filter(Boolean).map((post) => ({
            id: post.id,
            type: "post",
            title: post.title,
            location: post.location,
          }))
        );
      } catch (err) {
        console.error("Lỗi load itinerary:", err);
        setItinerary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [itineraryId, currentUser, authLoading, navigate]);

  /* -------------------- CRUD DAY -------------------- */
  const handleAddDay = () => {
    if (!itinerary) return;

    const nextIndex = itinerary.days.length + 1;
    const newDay = {
      id: `day-${Date.now()}`,
      title: `Ngày ${nextIndex}`,
      items: [],
    };

    setItinerary({
      ...itinerary,
      days: [...itinerary.days, newDay],
    });

    setIsDirty(true);
  };

  const handleAddNote = (dayId) => {
    if (!itinerary) return;

    const title = prompt("Nhập nội dung ghi chú:");
    if (!title) return;

    setItinerary((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              items: [
                ...day.items,
                {
                  id: `note-${Date.now()}`,
                  type: "note",
                  title,
                  time: "12:00",
                },
              ],
            }
          : day
      ),
    }));

    setIsDirty(true);
  };

  const handleDeleteDay = (dayId) => {
    if (!itinerary) return;
    if (!window.confirm("Bạn có chắc muốn xóa ngày này?")) return;

    const newDays = itinerary.days
      .filter((d) => d.id !== dayId)
      .map((d, i) => ({ ...d, title: `Ngày ${i + 1}` }));

    setItinerary({ ...itinerary, days: newDays });
    setIsDirty(true);
  };

  // Xóa 1 item khỏi 1 ngày cụ thể
  const handleRemoveItem = (dayId, itemId) => {
    if (!itinerary) return;

    setItinerary((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.id === dayId
          ? { ...day, items: day.items.filter((item) => item.id !== itemId) }
          : day
      ),
    }));

    setIsDirty(true);
  };

  /* -------------------- DRAG START -------------------- */
  const handleDragStart = (event) => {
    const { active } = event;

    const item =
      wishlistItems.find((i) => i.id === active.id) ||
      itinerary?.days.flatMap((d) => d.items).find((i) => i.id === active.id);

    setActiveItem(item || null);
  };

  /* -------------------- DRAG END (FIXED) -------------------- */
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || !itinerary) return;

    // CHỈ cho phép kéo từ wishlist -> ngày
    const source = wishlistItems.find((i) => i.id === active.id);
    if (!source) return;

    const targetDayId = over.data.current?.dayId || over.id;

    setItinerary((prev) => {
      const days = prev.days.map((day) => {
        if (day.id !== targetDayId) return day;

        const newItem = {
          ...source,
          id: `${source.id}-${Date.now()}`,
          type: "post",
          time: "09:00",
        };

        const items = [...day.items, newItem].sort((a, b) =>
          (a.time || "00:00").localeCompare(b.time || "00:00")
        );

        return { ...day, items };
      });

      return { ...prev, days };
    });

    setIsDirty(true);
  };

  /* -------------------- SAVE -------------------- */
  const handleSave = async () => {
    if (!itinerary || !isDirty) return;

    // Luôn lưu toàn bộ thông tin chính của itinerary để tránh mất dữ liệu
    await updateItinerary(itinerary.id || itineraryId, {
      title: itinerary.title,
      description: itinerary.description,
      startDate: itinerary.startDate || null,
      days: itinerary.days,
    });

    setIsDirty(false);
    alert("Đã lưu kế hoạch!");
  };

  /* -------------------- RENDER -------------------- */
  if (loading || authLoading) {
    return <div className="itinerary-planner-page">Đang tải...</div>;
  }

  if (!itinerary) {
    return (
      <div className="itinerary-planner-page">Không tìm thấy lịch trình</div>
    );
  }

  return (
    <div className="itinerary-planner-page">
      <header className="itinerary-header">
        <div>
          {/* Tiêu đề lịch trình có thể chỉnh sửa */}
          <input
            type="text"
            value={itinerary.title}
            onChange={(e) => {
              const newTitle = e.target.value;
              setItinerary((prev) => ({ ...prev, title: newTitle }));
              setIsDirty(true);
            }}
            className="itinerary-title-input"
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              border: "none",
              background: "transparent",
              padding: 0,
              marginBottom: 4,
              outline: "none",
            }}
          />
          <p>{itinerary.description}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className="save-plan-button"
        >
          {isDirty ? "Lưu kế hoạch" : "Đã lưu"}
        </button>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="itinerary-container">
          <WishlistColumn items={wishlistItems} />

          <div className="days-container">
            {itinerary.days.map((day) => (
              <DayColumn
                key={day.id}
                day={day}
                itinerary={itinerary}
                onItemUpdate={setItinerary}
                onAddNote={() => handleAddNote(day.id)}
                onDeleteDay={() => handleDeleteDay(day.id)}
                onRemoveItem={(itemId) => handleRemoveItem(day.id, itemId)}
              />
            ))}

            <div className="add-day-column">
              <button onClick={handleAddDay} className="add-day-button">
                <Plus size={24} /> Thêm ngày
              </button>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeItem ? <ItineraryItem item={activeItem} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
