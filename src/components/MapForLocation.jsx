import React, { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { geocodeLocation } from "../services/geocoding";
import "./MapForLocation.css";

/**
 * MapForLocation - Component hiển thị bản đồ nhỏ gọn cho một địa điểm cụ thể
 * Sử dụng trong PostDetail để hiển thị vị trí của bài viết
 */
const MapForLocation = ({ locationName, coordinates = null }) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!locationName && !coordinates) {
      return;
    }

    let L = null;
    let map = null;
    let marker = null;
    let isMounted = true;

    const loadMap = async () => {
      try {
        // Step 1: Get coordinates
        let finalCoords = null;
        
        if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
          // Use provided coordinates
          finalCoords = {
            latitude: coordinates[0],
            longitude: coordinates[1],
            displayName: locationName || "Địa điểm",
          };
        } else if (locationName) {
          // Geocode location name
          console.log(`📍 Geocoding location for map: "${locationName}"`);
          finalCoords = await geocodeLocation(locationName);
        }

        if (!finalCoords || !finalCoords.latitude || !finalCoords.longitude) {
          throw new Error("Không thể xác định tọa độ địa điểm");
        }

        setCoords(finalCoords);

        // Step 2: Load Leaflet
        L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        if (!mapRef.current || !isMounted) {
          return;
        }

        // Fix default marker icons
        if (L.default && L.default.Icon && L.default.Icon.Default) {
          if (L.default.Icon.Default.prototype._getIconUrl) {
            delete L.default.Icon.Default.prototype._getIconUrl;
          }
          L.default.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          });
        }

        // Initialize map
        map = L.default.map(mapRef.current, {
          center: [finalCoords.latitude, finalCoords.longitude],
          zoom: 13,
          zoomControl: true,
          scrollWheelZoom: false, // Disable scroll zoom for embedded map
        });

        // Add tile layer
        const roadLayer = L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        });
        roadLayer.addTo(map);

        // Add marker
        marker = L.default.marker([finalCoords.latitude, finalCoords.longitude]);
        marker.addTo(map);
        marker.bindPopup(`<b>${finalCoords.displayName || locationName}</b>`);

        if (isMounted) {
          setMapLoaded(true);
        }
      } catch (error) {
        console.error("Error loading location map:", error);
        if (isMounted) {
          setMapError(true);
          setErrorMessage(error.message || "Không thể tải bản đồ");
        }
      }
    };

    loadMap();

    return () => {
      isMounted = false;
      if (map) {
        try {
          if (marker && map.hasLayer) {
            map.removeLayer(marker);
          }
          map.remove();
        } catch (cleanupError) {
          console.warn("Error during map cleanup:", cleanupError);
        }
      }
    };
  }, [locationName, coordinates]);

  if (!locationName && !coordinates) {
    return null;
  }

  if (mapError) {
    return (
      <div className="map-for-location-container map-error">
        <div className="map-error-message">
          <MapPin size={20} />
          <span>{errorMessage || "Không thể tải bản đồ"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="map-for-location-container">
      <div className="map-for-location-header">
        <MapPin size={18} />
        <h3>Vị trí địa điểm</h3>
        {coords && (
          <span className="map-location-name">{coords.displayName || locationName}</span>
        )}
      </div>
      
      <div ref={mapRef} className="map-for-location-map">
        {!mapLoaded && (
          <div className="map-loading-overlay">
            <Loader2 size={24} className="spinner" />
            <span>Đang tải bản đồ...</span>
          </div>
        )}
      </div>
      
      {coords && (
        <div className="map-for-location-footer">
          <span className="map-coordinates">
            {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
};

export default MapForLocation;




