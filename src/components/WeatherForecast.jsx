import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Thermometer, Calendar, MapPin, ArrowLeft, Search, Loader2 } from "lucide-react";
import { geocodeLocation } from "../services/geocoding";
import "./WeatherForecast.css";

const WeatherForecast = ({ onBack }) => {
  const navigate = useNavigate();
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationName, setLocationName] = useState("Hà Nội");
  const [days, setDays] = useState(7);
  const [coordinates, setCoordinates] = useState({ lat: 21.0278, lon: 105.8342 });

  // Fetch forecast when location or days change
  useEffect(() => {
    if (!locationName || !coordinates.lat || !coordinates.lon) return;

    const fetchForecast = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,windspeed_10m_max&timezone=Asia%2FBangkok&forecast_days=${days}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch weather forecast");
        }

        const data = await response.json();
        setForecast(data);
        setError(null);
      } catch (err) {
        console.error("Weather forecast fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [coordinates.lat, coordinates.lon, days, locationName]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const coords = await geocodeLocation(searchQuery.trim());
      if (!coords || !coords.latitude || !coords.longitude) {
        throw new Error("Không thể xác định tọa độ địa điểm");
      }

      setCoordinates({ lat: coords.latitude, lon: coords.longitude });
      setLocationName(coords.displayName || searchQuery.trim());
      setSearchQuery("");
    } catch (err) {
      console.error("Geocoding error:", err);
      setError(err.message || "Không tìm thấy địa điểm");
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (weatherCode) => {
    if (weatherCode === 0) return <Sun size={32} className="weather-icon-sun" />;
    if (weatherCode >= 1 && weatherCode <= 3) return <Cloud size={32} className="weather-icon-cloud" />;
    if (weatherCode >= 45 && weatherCode <= 48) return <Cloud size={32} className="weather-icon-fog" />;
    if (weatherCode >= 51 && weatherCode <= 67) return <CloudRain size={32} className="weather-icon-rain" />;
    if (weatherCode >= 71 && weatherCode <= 77) return <CloudSnow size={32} className="weather-icon-snow" />;
    if (weatherCode >= 80 && weatherCode <= 99) return <CloudRain size={32} className="weather-icon-storm" />;
    return <Cloud size={32} className="weather-icon-cloud" />;
  };

  const getWeatherDescription = (weatherCode) => {
    if (weatherCode === 0) return "Trời quang";
    if (weatherCode >= 1 && weatherCode <= 3) return "Ít mây";
    if (weatherCode >= 45 && weatherCode <= 48) return "Sương mù";
    if (weatherCode >= 51 && weatherCode <= 67) return "Mưa";
    if (weatherCode >= 71 && weatherCode <= 77) return "Tuyết";
    if (weatherCode >= 80 && weatherCode <= 99) return "Mưa rào";
    return "Nhiều mây";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hôm nay";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Ngày mai";
    } else {
      return date.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "short" });
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/");
    }
  };

  if (loading && !forecast) {
    return (
      <div className="weather-forecast-for-location-container">
        <div className="weather-forecast-for-location-header">
          <button onClick={handleBack} className="back-btn">
            <ArrowLeft size={20} />
            <span>Quay lại</span>
          </button>
          <div className="header-title-section">
            <h2>Dự báo thời tiết</h2>
          </div>
        </div>
        <div className="weather-forecast-for-location-loading">
          <Loader2 size={48} className="spinner" />
          <p>Đang tải dự báo thời tiết...</p>
        </div>
      </div>
    );
  }

  if (error && !forecast) {
    return (
      <div className="weather-forecast-for-location-container">
        <div className="weather-forecast-for-location-header">
          <button onClick={handleBack} className="back-btn">
            <ArrowLeft size={20} />
            <span>Quay lại</span>
          </button>
          <div className="header-title-section">
            <h2>Dự báo thời tiết</h2>
          </div>
        </div>
        <div className="weather-forecast-for-location-error">
          <Cloud size={48} />
          <p>{error || "Không thể tải dự báo thời tiết"}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const { daily } = forecast || {};

  return (
    <div className="weather-forecast-for-location-container">
      <div className="weather-forecast-for-location-header">
        <button onClick={handleBack} className="back-btn">
          <ArrowLeft size={20} />
          <span>Quay lại</span>
        </button>
        <div className="header-title-section">
          <h2>Dự báo thời tiết</h2>
          {locationName && (
            <div className="location-badge">
              <MapPin size={18} />
              <span>{locationName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Input and Days Selector - Same Row */}
      <div className="weather-forecast-search-section">
        <form onSubmit={handleSearch} className="weather-search-form">
          <div className="search-input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm địa điểm (VD: Hà Nội, Sapa, Phú Quốc...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="weather-search-input"
            />
            <button type="submit" className="search-submit-btn" disabled={loading || !searchQuery.trim()}>
              {loading ? <Loader2 size={18} className="spinner" /> : <Search size={18} />}
            </button>
          </div>
        </form>
        
        <div className="days-selector">
          <Calendar size={18} />
          <button
            className={`days-btn ${days === 7 ? "active" : ""}`}
            onClick={() => setDays(7)}
          >
            7 ngày
          </button>
          <button
            className={`days-btn ${days === 14 ? "active" : ""}`}
            onClick={() => setDays(14)}
          >
            14 ngày
          </button>
        </div>
      </div>

      {/* Forecast Grid */}
      {forecast && daily && (
        <div className="weather-forecast-for-location-grid">
          {daily.time.map((date, index) => (
            <div key={index} className="forecast-day-card">
              <div className="forecast-day-header">
                <h3>{formatDate(date)}</h3>
              </div>
              <div className="forecast-day-icon">
                {getWeatherIcon(daily.weathercode[index])}
              </div>
              <div className="forecast-day-temp">
                <div className="temp-max">
                  <Thermometer size={18} />
                  <span>{Math.round(daily.temperature_2m_max[index])}°C</span>
                </div>
                <div className="temp-min">
                  <span>{Math.round(daily.temperature_2m_min[index])}°C</span>
                </div>
              </div>
              <div className="forecast-day-desc">
                {getWeatherDescription(daily.weathercode[index])}
              </div>
              <div className="forecast-day-details">
                {daily.precipitation_probability_max[index] > 0 && (
                  <div className="forecast-detail-item">
                    <Droplets size={16} />
                    <span>{daily.precipitation_probability_max[index]}%</span>
                  </div>
                )}
                <div className="forecast-detail-item">
                  <Wind size={16} />
                  <span>{Math.round(daily.windspeed_10m_max[index])} km/h</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!forecast && !loading && (
        <div className="weather-forecast-empty">
          <MapPin size={48} />
          <p>Nhập tên địa điểm để xem dự báo thời tiết</p>
        </div>
      )}
    </div>
  );
};

export default WeatherForecast;
