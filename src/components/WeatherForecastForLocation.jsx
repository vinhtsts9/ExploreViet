import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
  Calendar,
  ArrowLeft,
  Loader2,
  MapPin,
} from "lucide-react";
import { geocodeLocation } from "../services/geocoding";
import "./WeatherForecastForLocation.css";

const WeatherForecastForLocation = () => {
  const { locationName: encodedLocationName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Decode location name from URL
  const locationName = encodedLocationName ? decodeURIComponent(encodedLocationName) : null;
  
  // Lấy postId và coordinates từ state nếu có (khi navigate từ PostDetail)
  const postId = location.state?.postId;
  const providedCoordinates = location.state?.coordinates;
  
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7); // 7 hoặc 14 ngày
  const [finalCoords, setFinalCoords] = useState(null);

  useEffect(() => {
    if (!locationName) {
      setError("Không tìm thấy địa điểm");
      setLoading(false);
      return;
    }

    const fetchForecast = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get coordinates - ưu tiên dùng coordinates từ state, nếu không có thì geocode
        let coords = null;
        if (providedCoordinates && Array.isArray(providedCoordinates) && providedCoordinates.length === 2) {
          coords = {
            latitude: providedCoordinates[0],
            longitude: providedCoordinates[1],
            displayName: locationName,
          };
          console.log(`📍 Using provided coordinates for: ${locationName}`, coords);
        } else {
          console.log(`📍 Getting coordinates for: ${locationName}`);
          coords = await geocodeLocation(locationName);
        }

        if (!coords || !coords.latitude || !coords.longitude) {
          throw new Error("Không thể xác định tọa độ địa điểm");
        }

        setFinalCoords(coords);

        // Fetch forecast
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,windspeed_10m_max&timezone=Asia%2FBangkok&forecast_days=${days}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch weather forecast");
        }

        const data = await response.json();
        setForecast(data);
      } catch (err) {
        console.error("Weather forecast fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [locationName, days, providedCoordinates]);

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
    if (postId) {
      // Quay lại bài viết nếu có postId
      navigate(`/post/${postId}`);
    } else {
      // Quay lại trang trước hoặc trang chủ
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="weather-forecast-for-location-container">
        <div className="weather-forecast-for-location-header">
          <button onClick={handleBack} className="back-btn">
            <ArrowLeft size={20} />
            <span>Quay lại</span>
          </button>
          <h2>Dự báo thời tiết</h2>
        </div>
        <div className="weather-forecast-for-location-loading">
          <Loader2 size={48} className="spinner" />
          <p>Đang tải dự báo thời tiết cho {locationName}...</p>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="weather-forecast-for-location-container">
        <div className="weather-forecast-for-location-header">
          <button onClick={handleBack} className="back-btn">
            <ArrowLeft size={20} />
            <span>Quay lại</span>
          </button>
          <h2>Dự báo thời tiết</h2>
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

  const { daily } = forecast;

  return (
    <div className="weather-forecast-for-location-container">
      <div className="weather-forecast-for-location-header">
        <button onClick={handleBack} className="back-btn">
          <ArrowLeft size={20} />
          <span>Quay lại</span>
        </button>
        <div className="header-title-section">
          <h2>Dự báo thời tiết</h2>
          <div className="location-badge">
            <MapPin size={18} />
            <span>{locationName}</span>
          </div>
        </div>
      </div>

      <div className="weather-forecast-for-location-controls">
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
    </div>
  );
};

export default WeatherForecastForLocation;

