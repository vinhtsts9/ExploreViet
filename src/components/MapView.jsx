import React, { useEffect, useRef, useState } from "react";
import { Search, MapPin, Layers, Maximize2, Filter, X, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { geocodeLocation } from "../services/geocoding";
import "./MapView.css";

const MapView = ({ posts = [], onMarkerClick }) => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState("road");
  const [showFilters, setShowFilters] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [markersArray, setMarkersArray] = useState([]);

  // Initialize map
  useEffect(() => {
    let L = null;
    let map = null;
    let markers = [];
    let isMounted = true;

    const loadMap = async () => {
      try {
        // Dynamic import Leaflet
        L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        if (!mapRef.current || !isMounted) {
          return;
        }

        // Fix default marker icons
        try {
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
        } catch (iconError) {
          console.warn("Could not fix marker icons:", iconError);
        }

        // Initialize map centered on Vietnam
        map = L.default.map(mapRef.current, {
          center: [16.0544, 108.2022], // Center of Vietnam
          zoom: 6,
          zoomControl: false, // We'll add custom zoom controls
        });

        // Add base layers
        const roadLayer = L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        });

        const satelliteLayer = L.default.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          attribution: '© Esri',
          maxZoom: 19,
        });

        const terrainLayer = L.default.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
          attribution: '© OpenTopoMap',
          maxZoom: 17,
        });

        // Store layers
        map._baseLayers = {
          road: roadLayer,
          satellite: satelliteLayer,
          terrain: terrainLayer,
        };

        // Add default layer
        roadLayer.addTo(map);

        // Load markers
        await loadMarkers(map, L.default, markers);

        if (isMounted) {
          setMapInstance(map);
          setMapLoaded(true);
        }
      } catch (error) {
        console.error("Error loading map:", error);
        if (isMounted) {
          setMapError(true);
          setErrorMessage(error.message || "Không thể tải bản đồ");
        }
      }
    };

    const loadMarkers = async (map, L, markers) => {
      try {
        const postsWithLocation = (posts || []).filter((post) => post && post.location);
        
        if (postsWithLocation.length === 0) {
          return;
        }

        // Group posts by location
        const locationMap = new Map();
        postsWithLocation.forEach((post) => {
          try {
            const locationKey = (post.location || "").toLowerCase().trim();
            if (locationKey) {
              if (!locationMap.has(locationKey)) {
                locationMap.set(locationKey, []);
              }
              locationMap.get(locationKey).push(post);
            }
          } catch (e) {
            console.warn("Error processing post:", e);
          }
        });

        if (locationMap.size === 0) {
          return;
        }

        // Geocode and create markers
        const geocodePromises = Array.from(locationMap.keys()).map(async (locationKey) => {
          try {
            const postsAtLocation = locationMap.get(locationKey);
            if (!postsAtLocation || postsAtLocation.length === 0) return null;

            const locationName = postsAtLocation[0].location;
            if (!locationName) return null;

            // Check if post already has coordinates
            const postWithCoords = postsAtLocation.find(
              p => p.coordinates && Array.isArray(p.coordinates) && p.coordinates.length === 2
            );
            
            let coordinates;
            if (postWithCoords) {
              coordinates = postWithCoords.coordinates;
            } else {
              try {
                const coords = await geocodeLocation(locationName);
                if (coords && coords.latitude && coords.longitude) {
                  coordinates = [coords.latitude, coords.longitude];
                } else {
                  return null;
                }
              } catch (geocodeError) {
                console.warn(`Geocoding failed for ${locationName}:`, geocodeError);
                return null;
              }
            }

            if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
              return null;
            }

            // Create marker
            const marker = L.marker(coordinates);

            // Create popup content
            const firstPost = postsAtLocation[0];
            const postCount = postsAtLocation.length;
            
            let popupContent = `
              <div class="map-popup-content">
                <div class="popup-header">
                  <h4>${locationName}</h4>
                  <span class="popup-post-count">${postCount} ${postCount > 1 ? "bài viết" : "bài viết"}</span>
                </div>
                <div class="popup-posts">
            `;

            postsAtLocation.slice(0, 3).forEach((post) => {
              const firstImage = post.content?.find((c) => c && c.type === "image")?.url;
              const postTitle = (post.title || "Không có tiêu đề").replace(/"/g, "&quot;");
              popupContent += `
                <div class="popup-post-item" data-post-id="${post.id || ""}">
                  ${firstImage ? `<img src="${firstImage}" alt="${postTitle}" class="popup-post-image" onerror="this.style.display='none'" />` : ""}
                  <div class="popup-post-info">
                    <strong>${postTitle}</strong>
                    ${post.userName ? `<p class="popup-author">👤 ${post.userName}</p>` : ""}
                    ${post.rating ? `<p class="popup-rating">⭐ ${post.rating.toFixed(1)}</p>` : ""}
                  </div>
                </div>
              `;
            });

            if (postsAtLocation.length > 3) {
              popupContent += `<p class="popup-more">và ${postsAtLocation.length - 3} bài viết khác...</p>`;
            }

            popupContent += `
                </div>
                <button class="popup-view-all" onclick="window.handlePopupClick('${postsAtLocation[0].id || ""}')">Xem chi tiết</button>
              </div>
            `;

            marker.bindPopup(popupContent, {
              maxWidth: 320,
              className: "custom-popup",
            });

            marker.on("click", () => {
              if (onMarkerClick && postsAtLocation.length > 0) {
                try {
                  onMarkerClick(postsAtLocation[0]);
                } catch (clickError) {
                  console.error("Error in marker click handler:", clickError);
                }
              }
            });

            return marker;
          } catch (error) {
            console.error(`Error creating marker:`, error);
            return null;
          }
        });

        const createdMarkers = (await Promise.all(geocodePromises)).filter(Boolean);
        
        // Add markers to map
        if (createdMarkers.length > 0 && map) {
          createdMarkers.forEach(marker => {
            if (marker && map) {
              marker.addTo(map);
              markers.push(marker);
            }
          });

          // Fit bounds to show all markers
          if (markers.length > 0) {
            try {
              const group = L.featureGroup(markers);
              map.fitBounds(group.getBounds().pad(0.1));
            } catch (boundsError) {
              console.warn("Could not fit bounds:", boundsError);
            }
          }
        }
      } catch (markerError) {
        console.error("Error in loadMarkers:", markerError);
      }
    };

    loadMap();

    // Global handler for popup clicks
    window.handlePopupClick = (postId) => {
      if (postId && onMarkerClick) {
        const post = posts.find(p => p && p.id === postId);
        if (post) {
          onMarkerClick(post);
        }
      }
    };

    return () => {
      isMounted = false;
      delete window.handlePopupClick;
      if (map) {
        try {
          markers.forEach((marker) => {
            if (marker && map.hasLayer) {
              map.removeLayer(marker);
            }
          });
          map.remove();
        } catch (cleanupError) {
          console.warn("Error during cleanup:", cleanupError);
        }
      }
    };
  }, [posts, onMarkerClick]);

  // Handle layer switching
  useEffect(() => {
    if (mapInstance && mapInstance._baseLayers) {
      try {
        // Remove current layer
        Object.values(mapInstance._baseLayers).forEach(layer => {
          if (mapInstance.hasLayer(layer)) {
            mapInstance.removeLayer(layer);
          }
        });
        
        // Add selected layer
        if (mapInstance._baseLayers[selectedLayer]) {
          mapInstance._baseLayers[selectedLayer].addTo(mapInstance);
        }
      } catch (layerError) {
        console.error("Error switching layer:", layerError);
      }
    }
  }, [selectedLayer, mapInstance]);

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstance) return;

    try {
      setSearchLoading(true);
      const coords = await geocodeLocation(searchQuery.trim());
      if (coords && coords.latitude && coords.longitude && mapInstance) {
        mapInstance.setView([coords.latitude, coords.longitude], 13);
        setSearchQuery("");
      } else {
        alert("Không tìm thấy địa điểm");
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Không tìm thấy địa điểm");
    } finally {
      setSearchLoading(false);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapRef.current?.requestFullscreen().catch(err => console.error("Fullscreen error:", err));
    } else {
      document.exitFullscreen().catch(err => console.error("Exit fullscreen error:", err));
    }
  };

  // Zoom controls
  const zoomIn = () => {
    if (mapInstance) {
      mapInstance.zoomIn();
    }
  };

  const zoomOut = () => {
    if (mapInstance) {
      mapInstance.zoomOut();
    }
  };

  if (mapError) {
    return (
      <div className="map-view-container">
        <div className="map-error-state">
          <AlertCircle size={48} />
          <h3>Không thể tải bản đồ</h3>
          <p>{errorMessage || "Đã xảy ra lỗi khi tải bản đồ. Vui lòng thử lại sau."}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="map-view-container">
      {/* Header Section */}
      <div className="map-header-section">
        <div className="map-header-content">
          <h2>Bản đồ địa điểm</h2>
          <p>Khám phá các địa điểm du lịch trên bản đồ</p>
        </div>
      </div>

      {/* Map Container */}
      <div className="map-wrapper">
        {/* Search Bar */}
        <div className="map-search-bar">
          <form onSubmit={handleSearch} className="map-search-form">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="map-search-input"
              disabled={searchLoading}
            />
            <button 
              type="submit" 
              className="map-search-btn"
              disabled={searchLoading || !searchQuery.trim()}
            >
              {searchLoading ? <Loader2 size={18} className="spinner" /> : "Tìm"}
            </button>
          </form>
        </div>

        {/* Zoom Controls */}
        <div className="map-zoom-controls">
          <button onClick={zoomIn} className="zoom-btn" title="Phóng to">
            +
          </button>
          <button onClick={zoomOut} className="zoom-btn" title="Thu nhỏ">
            −
          </button>
        </div>

        {/* Layer Switcher */}
        <div className="map-layer-controls">
          <button
            className={`layer-btn ${selectedLayer === "road" ? "active" : ""}`}
            onClick={() => setSelectedLayer("road")}
            title="Bản đồ đường"
          >
            <Layers size={18} />
            <span>Đường</span>
          </button>
          <button
            className={`layer-btn ${selectedLayer === "satellite" ? "active" : ""}`}
            onClick={() => setSelectedLayer("satellite")}
            title="Vệ tinh"
          >
            <Layers size={18} />
            <span>Vệ tinh</span>
          </button>
          <button
            className={`layer-btn ${selectedLayer === "terrain" ? "active" : ""}`}
            onClick={() => setSelectedLayer("terrain")}
            title="Địa hình"
          >
            <Layers size={18} />
            <span>Địa hình</span>
          </button>
        </div>

        {/* Tools */}
        <div className="map-tools">
          <button
            className="tool-btn"
            onClick={toggleFullscreen}
            title="Toàn màn hình"
          >
            <Maximize2 size={18} />
          </button>
          <button
            className={`tool-btn ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Lọc"
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="map-filter-panel">
            <div className="filter-panel-header">
              <h3>Lọc địa điểm</h3>
              <button onClick={() => setShowFilters(false)} className="filter-close-btn">
                <X size={18} />
              </button>
            </div>
            <div className="filter-options">
              <p className="filter-info">Tính năng lọc đang được phát triển</p>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div ref={mapRef} className="map-container">
          {!mapLoaded && (
            <div className="map-loading">
              <Loader2 size={48} className="spinner" />
              <p>Đang tải bản đồ...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
