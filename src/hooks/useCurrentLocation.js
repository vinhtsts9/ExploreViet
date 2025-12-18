import { useState, useEffect, useRef } from "react";
import { reverseGeocode } from "../services/geocoding";

/**
 * Custom hook để quản lý vị trí hiện tại của người dùng
 * Dùng chung cho Footer và WeatherWidget
 */
export const useCurrentLocation = () => {
  const [location, setLocation] = useState("Hà Nội");
  const [coordinates, setCoordinates] = useState({ lat: 21.0278, lon: 105.8342 });
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);
  const watchId = useRef(null);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Kiểm tra sessionStorage trước
    const cachedLocation = sessionStorage.getItem('weather_location');
    const cachedCoords = sessionStorage.getItem('weather_coordinates');
    const cachedTime = sessionStorage.getItem('weather_time');

    if (cachedLocation && cachedCoords && cachedTime) {
      const timeDiff = Date.now() - parseInt(cachedTime);
      // Nếu dữ liệu còn mới (dưới 5 phút), sử dụng cache
      if (timeDiff < 5 * 60 * 1000) {
        try {
          setLocation(cachedLocation);
          setCoordinates(JSON.parse(cachedCoords));
          setIsLoading(false);
          console.log("✅ Sử dụng vị trí từ cache");
        } catch (err) {
          console.error("Lỗi parse cache:", err);
        }
      }
    }

    const updateLocation = async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      console.log(`📍 Vị trí mới: ${lat}, ${lon}`);
      
      const newCoords = { lat, lon };
      setCoordinates(newCoords);
      
      // Lưu vào sessionStorage
      sessionStorage.setItem('weather_coordinates', JSON.stringify(newCoords));
      
      // Reverse geocode để lấy tên địa điểm
      try {
        const locationData = await reverseGeocode(lat, lon);
        const locationName = locationData.city || locationData.displayName || "Vị trí hiện tại";
        setLocation(locationName);
        sessionStorage.setItem('weather_location', locationName);
        sessionStorage.setItem('weather_time', Date.now().toString());
        console.log(`📍 Địa điểm: ${locationData.displayName}`);
        
        // Dispatch custom event để thông báo các component khác
        window.dispatchEvent(new CustomEvent('locationChanged', {
          detail: { location: locationName, coordinates: newCoords }
        }));
      } catch (err) {
        console.error("Lỗi reverse geocoding:", err);
        setLocation("Vị trí hiện tại");
      }
      
      setIsLoading(false);
    };

    if (!navigator.geolocation) {
      console.log("Geolocation không được hỗ trợ, sử dụng Hà Nội mặc định");
      setIsLoading(false);
      return;
    }

    // Lấy vị trí ban đầu
    navigator.geolocation.getCurrentPosition(
      updateLocation,
      (error) => {
        console.log("Không lấy được vị trí, sử dụng Hà Nội mặc định:", error.message);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache 5 phút
      }
    );

    // Theo dõi thay đổi vị trí (nếu người dùng di chuyển)
    watchId.current = navigator.geolocation.watchPosition(
      updateLocation,
      (error) => {
        console.error("Lỗi watch position:", error);
      },
      {
        enableHighAccuracy: false, // Tiết kiệm pin
        timeout: 15000,
        maximumAge: 60000 // Cập nhật mỗi phút
      }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  // Lắng nghe sự thay đổi vị trí từ các component khác
  useEffect(() => {
    const handleLocationChange = (event) => {
      const { location: newLocation, coordinates: newCoords } = event.detail;
      setLocation(newLocation);
      setCoordinates(newCoords);
    };

    window.addEventListener('locationChanged', handleLocationChange);
    return () => {
      window.removeEventListener('locationChanged', handleLocationChange);
    };
  }, []);

  return { location, coordinates, isLoading };
};

