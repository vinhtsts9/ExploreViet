import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer, Loader2, Calendar } from "lucide-react";
import { geocodeLocation } from "../services/geocoding";
import "./WeatherForLocation.css";

const WeatherForLocation = ({ locationName, coordinates: providedCoordinates, postId }) => {
  const navigate = useNavigate();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coordinates, setCoordinates] = useState(null);

  useEffect(() => {
    if (!locationName) {
      setLoading(false);
      return;
    }

    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);

        // Step 1: Geocode location to get coordinates
        let coords = null;
        if (providedCoordinates && Array.isArray(providedCoordinates) && providedCoordinates.length === 2) {
          coords = {
            latitude: providedCoordinates[0],
            longitude: providedCoordinates[1],
            displayName: locationName,
          };
        } else {
          console.log(`📍 Getting coordinates for: ${locationName}`);
          coords = await geocodeLocation(locationName);
        }
        setCoordinates(coords);

        // Step 2: Fetch weather using coordinates
        console.log(`🌤️ Fetching weather for coordinates:`, coords);
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true&timezone=Asia%2FBangkok`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch weather");
        }

        const data = await response.json();
        setWeather(data.current_weather);
        setError(null);
      } catch (err) {
        console.error("Weather fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();

    // Cập nhật mỗi 10 phút
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [locationName]);

  const getWeatherIcon = (weatherCode) => {
    if (weatherCode === 0) return <Sun size={24} />;
    if (weatherCode >= 1 && weatherCode <= 3) return <Cloud size={24} />;
    if (weatherCode >= 45 && weatherCode <= 48) return <Cloud size={24} />;
    if (weatherCode >= 51 && weatherCode <= 67) return <CloudRain size={24} />;
    if (weatherCode >= 71 && weatherCode <= 77) return <CloudSnow size={24} />;
    if (weatherCode >= 80 && weatherCode <= 99) return <CloudRain size={24} />;
    return <Cloud size={24} />;
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

  if (!locationName) {
    return null;
  }

  if (loading) {
    return (
      <div className="weather-for-location">
        <div className="weather-for-location-loading">
          <Loader2 size={20} className="spinner" />
          <span>Đang tải thời tiết...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="weather-for-location">
        <div className="weather-for-location-error">
          <Cloud size={20} />
          <span>Không thể tải thời tiết cho {locationName}</span>
        </div>
      </div>
    );
  }

  const temperature = Math.round(weather.temperature);
  const windSpeed = Math.round(weather.windspeed);

  return (
    <div className="weather-for-location">
      <div className="weather-for-location-content">
        <div className="weather-for-location-header">
          <h3 className="weather-for-location-title">
            <Cloud size={20} />
            <span>Thời tiết tại {locationName}</span>
          </h3>
        </div>
        
        <div className="weather-for-location-body">
          <div className="weather-for-location-icon">
            {getWeatherIcon(weather.weathercode)}
          </div>
          
          <div className="weather-for-location-info">
            <div className="weather-for-location-temp">
              <Thermometer size={18} />
              <span className="temp-value">{temperature}°C</span>
            </div>
            
            <div className="weather-for-location-desc">
              {getWeatherDescription(weather.weathercode)}
            </div>
            
            <div className="weather-for-location-wind">
              <Wind size={16} />
              <span>{windSpeed} km/h</span>
            </div>
          </div>
        </div>
        
        {coordinates && (
          <div className="weather-for-location-footer">
            <span className="weather-for-location-coords">
              {coordinates.displayName}
            </span>
            <button
              className="view-forecast-btn"
              onClick={() => {
                // Navigate to weather forecast page with location name, postId, and coordinates for back navigation
                const encodedLocation = encodeURIComponent(locationName);
                navigate(`/weather/${encodedLocation}`, {
                  state: { 
                    postId: postId || null,
                    coordinates: coordinates ? [coordinates.latitude, coordinates.longitude] : null
                  }
                });
              }}
              title="Xem dự báo thời tiết dài ngày"
            >
              <Calendar size={16} />
              <span>Xem dự báo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherForLocation;


