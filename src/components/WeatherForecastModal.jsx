import React, { useState, useEffect } from "react";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
  Calendar,
  X,
  Loader2,
} from "lucide-react";
import { geocodeLocation } from "../services/geocoding";
import "./WeatherForecastModal.css";

const WeatherForecastModal = ({ locationName, coordinates, isOpen, onClose }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7); // 7 hoặc 14 ngày
  const [finalCoords, setFinalCoords] = useState(null);

  useEffect(() => {
    if (!isOpen || !locationName) return;

    const fetchForecast = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get coordinates
        let coords = null;
        if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
          coords = {
            latitude: coordinates[0],
            longitude: coordinates[1],
          };
        } else {
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
  }, [isOpen, locationName, coordinates, days]);

  const getWeatherIcon = (weatherCode) => {
    if (weatherCode === 0) return <Sun size={24} className="weather-icon-sun" />;
    if (weatherCode >= 1 && weatherCode <= 3) return <Cloud size={24} className="weather-icon-cloud" />;
    if (weatherCode >= 45 && weatherCode <= 48) return <Cloud size={24} className="weather-icon-fog" />;
    if (weatherCode >= 51 && weatherCode <= 67) return <CloudRain size={24} className="weather-icon-rain" />;
    if (weatherCode >= 71 && weatherCode <= 77) return <CloudSnow size={24} className="weather-icon-snow" />;
    if (weatherCode >= 80 && weatherCode <= 99) return <CloudRain size={24} className="weather-icon-storm" />;
    return <Cloud size={24} className="weather-icon-cloud" />;
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

  if (!isOpen) return null;

  return (
    <div className="weather-forecast-modal-overlay" onClick={onClose}>
      <div className="weather-forecast-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="weather-forecast-modal-header">
          <div className="modal-header-content">
            <h2>Dự báo thời tiết</h2>
            <p className="modal-location-name">{locationName}</p>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={24} />
          </button>
        </div>

        {/* Controls */}
        <div className="weather-forecast-modal-controls">
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

        {/* Content */}
        <div className="weather-forecast-modal-content">
          {loading && (
            <div className="weather-forecast-loading">
              <Loader2 size={48} className="spinner" />
              <p>Đang tải dự báo thời tiết...</p>
            </div>
          )}

          {error && (
            <div className="weather-forecast-error">
              <Cloud size={48} />
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className="retry-btn">
                Thử lại
              </button>
            </div>
          )}

          {forecast && forecast.daily && (
            <div className="weather-forecast-grid">
              {forecast.daily.time.map((date, index) => (
                <div key={index} className="forecast-day-card">
                  <div className="forecast-day-header">
                    <h3>{formatDate(date)}</h3>
                  </div>
                  <div className="forecast-day-icon">
                    {getWeatherIcon(forecast.daily.weathercode[index])}
                  </div>
                  <div className="forecast-day-temp">
                    <div className="temp-max">
                      <Thermometer size={16} />
                      <span>{Math.round(forecast.daily.temperature_2m_max[index])}°C</span>
                    </div>
                    <div className="temp-min">
                      <span>{Math.round(forecast.daily.temperature_2m_min[index])}°C</span>
                    </div>
                  </div>
                  <div className="forecast-day-desc">
                    {getWeatherDescription(forecast.daily.weathercode[index])}
                  </div>
                  <div className="forecast-day-details">
                    {forecast.daily.precipitation_probability_max[index] > 0 && (
                      <div className="forecast-detail-item">
                        <Droplets size={14} />
                        <span>{forecast.daily.precipitation_probability_max[index]}%</span>
                      </div>
                    )}
                    <div className="forecast-detail-item">
                      <Wind size={14} />
                      <span>{Math.round(forecast.daily.windspeed_10m_max[index])} km/h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherForecastModal;




