import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getItinerariesForUser, deleteItinerary } from "../services/itinerary";
import { Loader2, PlusCircle, CalendarDays, Trash2 } from "lucide-react";
import "./ItineraryListPage.css"; // We'll create this CSS file

export const ItineraryListPage = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserItineraries = async () => {
      if (authLoading || !currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userItineraries = await getItinerariesForUser(currentUser.uid);
        setItineraries(userItineraries);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user itineraries:", error);
        setLoading(false);
      }
    };

    fetchUserItineraries();
  }, [currentUser, authLoading]);

  const handleCreateNewItinerary = () => {
    navigate("/itinerary-planner/new");
  };

  const handleViewItinerary = (itineraryId) => {
    navigate(`/itinerary-planner/${itineraryId}`);
  };

  const handleDeleteItinerary = async (itineraryId, e) => {
    e.stopPropagation(); // Prevent triggering handleViewItinerary
    if (window.confirm("Bạn có chắc chắn muốn xóa lịch trình này?")) {
      try {
        await deleteItinerary(itineraryId);
        setItineraries((prev) =>
          prev.filter((itinerary) => itinerary.id !== itineraryId)
        );
        alert("Đã xóa lịch trình thành công!");
      } catch (error) {
        console.error("Lỗi khi xóa lịch trình:", error);
        alert("Xóa lịch trình thất bại: " + error.message);
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="itinerary-list-page main-content-wrapper">
        <div className="loading-indicator">
          <Loader2 className="icon" size={32} />
          <p>Đang tải lịch trình của bạn...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="itinerary-list-page main-content-wrapper">
        <div className="page-header">
          <h2>Bạn cần đăng nhập</h2>
          <p>Vui lòng đăng nhập để xem hoặc tạo lịch trình.</p>
          <button
            onClick={() => navigate("/login")}
            className="create-first-post-button"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="itinerary-list-page main-content-wrapper">
      <header className="page-header">
        <h2>Lịch trình của tôi</h2>
        <p>Quản lý và xem các lịch trình du lịch của bạn.</p>
        <button
          onClick={handleCreateNewItinerary}
          className="create-new-itinerary-button"
        >
          <PlusCircle size={20} /> Tạo lịch trình mới
        </button>
      </header>

      {itineraries.length === 0 ? (
        <div className="no-itineraries-message">
          <CalendarDays size={48} className="icon" />
          <p>Bạn chưa có lịch trình nào.</p>
          <button
            onClick={handleCreateNewItinerary}
            className="create-first-itinerary-button"
          >
            Tạo lịch trình đầu tiên
          </button>
        </div>
      ) : (
        <div className="itinerary-cards-grid">
          {itineraries.map((itinerary) => (
            <div
              key={itinerary.id}
              className="itinerary-card"
              onClick={() => handleViewItinerary(itinerary.id)}
            >
              <h3>{itinerary.title}</h3>
              <p>{itinerary.description}</p>
              {itinerary.startDate && (
                <p className="itinerary-date">
                  Ngày bắt đầu: {new Date(itinerary.startDate).toLocaleDateString()}
                </p>
              )}
              <div className="itinerary-card-actions">
                <button
                  onClick={(e) => handleDeleteItinerary(itinerary.id, e)}
                  className="delete-itinerary-button"
                >
                  <Trash2 size={16} /> Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

