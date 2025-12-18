import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Plane,
  Bus,
  Train,
  MapPin,
  Loader2,
  Navigation,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { geocodeLocation } from "../services/geocoding";
import { getTransportationInfo } from "../services/transportation";
import TransportationInfo from "./TransportationInfo";
import "./TransportationPage.css";

const TransportationPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationName, setLocationName] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transportData, setTransportData] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setTransportData(null);

      // Geocode location
      const coords = await geocodeLocation(searchQuery.trim());
      if (!coords || !coords.latitude || !coords.longitude) {
        throw new Error("Không thể xác định tọa độ địa điểm");
      }

      setLocationName(coords.displayName || searchQuery.trim());
      setCoordinates({ lat: coords.latitude, lon: coords.longitude });

      // Fetch transportation data
      const data = await getTransportationInfo(
        coords.displayName || searchQuery.trim(),
        coords.latitude,
        coords.longitude
      );

      setTransportData(data);
    } catch (err) {
      console.error("Search error:", err);
      setError(err.message || "Không tìm thấy địa điểm");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!locationName || !coordinates) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await getTransportationInfo(
        locationName,
        coordinates.lat,
        coordinates.lon
      );
      
      setTransportData(data);
    } catch (err) {
      console.error("Refresh error:", err);
      setError(err.message || "Không thể làm mới dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transportation-page">
      <div className="transportation-page-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={20} />
          <span>Quay lại</span>
        </button>
        <div className="header-title-section">
          <h1>
            <Navigation size={24} />
            Thông tin giao thông
          </h1>
          <p>Tìm kiếm thông tin sân bay, chuyến bay và giao thông công cộng</p>
        </div>
      </div>

      <div className="transportation-page-content">
        {/* Search Section */}
        <div className="transportation-search-section">
          <form onSubmit={handleSearch} className="transportation-search-form">
            <div className="search-input-wrapper">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Nhập tên địa điểm (VD: Hà Nội, Sapa, Phú Quốc...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="transportation-search-input"
              />
              <button
                type="submit"
                className="search-submit-btn"
                disabled={loading || !searchQuery.trim()}
              >
                {loading ? <Loader2 size={18} className="spinner" /> : <Search size={18} />}
              </button>
            </div>
          </form>

          {locationName && coordinates && (
            <div className="location-badge">
              <MapPin size={18} />
              <span>{locationName}</span>
              <button onClick={handleRefresh} className="refresh-btn" disabled={loading}>
                <RefreshCw size={16} className={loading ? "spinner" : ""} />
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="transportation-error-message">
            <p>{error}</p>
          </div>
        )}

        {/* Transportation Info */}
        {transportData && !loading && (
          <TransportationInfo
            locationName={locationName}
            coordinates={coordinates}
          />
        )}

        {/* Empty State */}
        {!transportData && !loading && !error && (
          <div className="transportation-empty-state">
            <Navigation size={64} />
            <h2>Tìm kiếm thông tin giao thông</h2>
            <p>Nhập tên địa điểm để xem thông tin về sân bay, chuyến bay và giao thông công cộng</p>
          </div>
        )}

        {/* Info Cards */}
        {transportData && !loading && (
          <div className="transportation-stats">
            <div className="stat-card">
              <Plane size={24} />
              <div className="stat-info">
                <h3>{transportData.airports?.length || 0}</h3>
                <p>Sân bay gần đây</p>
              </div>
            </div>
            <div className="stat-card">
              <Plane size={24} />
              <div className="stat-info">
                <h3>{transportData.flights?.length || 0}</h3>
                <p>Chuyến bay đang bay</p>
              </div>
            </div>
            <div className="stat-card">
              <Bus size={24} />
              <div className="stat-info">
                <h3>{transportData.transitRoutes?.length || 0}</h3>
                <p>Tuyến giao thông công cộng</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransportationPage;




