import React, { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Thermometer } from "lucide-react";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import "./WeatherWidget.css";

const WeatherWidget = React.memo(() => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { location, coordinates } = useCurrentLocation();

  const fetchWeather = React.useCallback(async () => {
    // Kiểm tra cache trước khi fetch
    const cachedWeather = sessionStorage.getItem('weather_data');
    const cachedTime = sessionStorage.getItem('weather_time');
    const cachedCoords = sessionStorage.getItem('weather_coordinates');

    if (cachedWeather && cachedTime && cachedCoords) {
      const timeDiff = Date.now() - parseInt(cachedTime);
      const cachedCoordsObj = JSON.parse(cachedCoords);
      
      // Nếu dữ liệu còn mới (dưới 5 phút) và cùng tọa độ
      if (timeDiff < 5 * 60 * 1000 && 
          cachedCoordsObj.lat === coordinates.lat && 
          cachedCoordsObj.lon === coordinates.lon) {
        try {
          setWeather(JSON.parse(cachedWeather));
          setLoading(false);
          setError(null);
          console.log("✅ Sử dụng dữ liệu thời tiết từ cache");
          return;
        } catch (err) {
          console.error("Lỗi parse cache:", err);
        }
      }
    }

    try {
      setLoading(true);
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current_weather=true&timezone=Asia%2FBangkok`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch weather");
      }

      const data = await response.json();
      const weatherData = data.current_weather;
      
      setWeather(weatherData);
      setError(null);
      
      // Lưu vào sessionStorage
      sessionStorage.setItem('weather_data', JSON.stringify(weatherData));
      sessionStorage.setItem('weather_time', Date.now().toString());
      sessionStorage.setItem('weather_coordinates', JSON.stringify(coordinates));
      
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [coordinates]);

  // Lắng nghe sự thay đổi vị trí
  useEffect(() => {
    const handleLocationChange = () => {
      // Khi vị trí thay đổi, fetch lại thời tiết
      fetchWeather();
    };

    window.addEventListener('locationChanged', handleLocationChange);
    return () => {
      window.removeEventListener('locationChanged', handleLocationChange);
    };
  }, [fetchWeather]);

  useEffect(() => {
    fetchWeather();

    // Cập nhật mỗi 10 phút
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchWeather]);

  const getWeatherIcon = (weatherCode) => {
    // Weather code mapping từ Open-Meteo
    // 0: Clear sky, 1-3: Mainly clear/partly cloudy, 45-48: Fog
    // 51-67: Drizzle/Rain, 71-77: Snow, 80-99: Rain showers/Thunderstorm
    if (weatherCode === 0) return <Sun size={20} />;
    if (weatherCode >= 1 && weatherCode <= 3) return <Cloud size={20} />;
    if (weatherCode >= 45 && weatherCode <= 48) return <Cloud size={20} />;
    if (weatherCode >= 51 && weatherCode <= 67) return <CloudRain size={20} />;
    if (weatherCode >= 71 && weatherCode <= 77) return <CloudSnow size={20} />;
    if (weatherCode >= 80 && weatherCode <= 99) return <CloudRain size={20} />;
    return <Cloud size={20} />;
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

  if (loading) {
    return (
      <div className="weather-widget">
        <div className="weather-loading">
          <Cloud size={16} />
          <span>Đang tải...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="weather-widget">
        <div className="weather-error">
          <Cloud size={16} />
          <span>{location}</span>
        </div>
      </div>
    );
  }

  const temperature = Math.round(weather.temperature);
  const windSpeed = Math.round(weather.windspeed);

  return (
    <div className="weather-widget">
      <div className="weather-content">
        <div className="weather-icon">
          {getWeatherIcon(weather.weathercode)}
        </div>
        <div className="weather-info">
          <div className="weather-temp">
            <Thermometer size={14} />
            <span>{temperature}°C</span>
          </div>
          <div className="weather-details">
            <span className="weather-desc">{getWeatherDescription(weather.weathercode)}</span>
            <div className="weather-wind">
              <Wind size={12} />
              <span>{windSpeed} km/h</span>
            </div>
          </div>
        </div>
        <div className="weather-location">
          <span>{location}</span>
        </div>
      </div>
    </div>
  );
});

WeatherWidget.displayName = 'WeatherWidget';

export default WeatherWidget;





