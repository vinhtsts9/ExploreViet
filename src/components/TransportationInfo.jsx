import React, { useState, useEffect } from "react";
import { MapPin, Plane, Bus, Train, Loader2, ExternalLink, Navigation } from "lucide-react";
import { getTransportationInfo, getAirportInfo } from "../services/transportation";
import "./TransportationInfo.css";

const TransportationInfo = ({ locationName, coordinates }) => {
  const [transportData, setTransportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    if (!locationName || !coordinates) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Handle different coordinate formats
        let lat, lon;
        if (Array.isArray(coordinates)) {
          // Format: [lat, lon] or [lon, lat]
          lat = coordinates[0];
          lon = coordinates[1];
        } else if (typeof coordinates === 'object') {
          // Format: {lat, lon} or {latitude, longitude}
          lat = coordinates.lat || coordinates.latitude;
          lon = coordinates.lon || coordinates.longitude;
        } else {
          throw new Error("Invalid coordinates format");
        }

        if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
          throw new Error("Invalid coordinates values");
        }

        const data = await getTransportationInfo(locationName, lat, lon);
        setTransportData(data);
      } catch (err) {
        console.error("Error loading transportation data:", err);
        setError(err?.message || "Không thể tải thông tin giao thông");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [locationName, coordinates]);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="transportation-info-container">
        <div className="transportation-loading">
          <Loader2 size={32} className="spinner" />
          <p>Đang tải thông tin giao thông...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transportation-info-container">
        <div className="transportation-error">
          <p>Không thể tải thông tin giao thông: {error}</p>
        </div>
      </div>
    );
  }

  if (!transportData) {
    return null;
  }

  const { airports, flights, transitRoutes } = transportData;

  return (
    <div className="transportation-info-container">
      <div className="transportation-header">
        <h3>
          <Navigation size={20} />
          Thông tin giao thông
        </h3>
      </div>

      {/* Airports Section */}
      {airports && airports.length > 0 && (
        <div className="transportation-section">
          <button
            className="transportation-section-header"
            onClick={() => toggleSection("airports")}
          >
            <Plane size={18} />
            <span>Sân bay gần đây ({airports.length})</span>
            <span className="expand-icon">
              {expandedSection === "airports" ? "−" : "+"}
            </span>
          </button>
          {expandedSection === "airports" && (
            <div className="transportation-section-content">
              {airports.slice(0, 5).map((airport, index) => (
                <AirportCard key={index} airport={airport} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transit Routes Section */}
      {transitRoutes && transitRoutes.length > 0 && (
        <div className="transportation-section">
          <button
            className="transportation-section-header"
            onClick={() => toggleSection("transit")}
          >
            <Bus size={18} />
            <span>Giao thông công cộng ({transitRoutes.length})</span>
            <span className="expand-icon">
              {expandedSection === "transit" ? "−" : "+"}
            </span>
          </button>
          {expandedSection === "transit" && (
            <div className="transportation-section-content">
              {transitRoutes.slice(0, 10).map((route, index) => (
                <TransitRouteCard key={index} route={route} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Flights Section */}
      {flights && flights.length > 0 && (
        <div className="transportation-section">
          <button
            className="transportation-section-header"
            onClick={() => toggleSection("flights")}
          >
            <Plane size={18} />
            <span>Chuyến bay gần đây ({flights.length})</span>
            <span className="expand-icon">
              {expandedSection === "flights" ? "−" : "+"}
            </span>
          </button>
          {expandedSection === "flights" && (
            <div className="transportation-section-content">
              {flights.slice(0, 10).map((flight, index) => (
                <FlightCard key={index} flight={flight} />
              ))}
            </div>
          )}
        </div>
      )}

      {(!airports || airports.length === 0) &&
        (!transitRoutes || transitRoutes.length === 0) &&
        (!flights || flights.length === 0) && (
          <div className="transportation-empty">
            <p>Chưa có thông tin giao thông cho địa điểm này</p>
          </div>
        )}
    </div>
  );
};

// Airport Card Component
const AirportCard = ({ airport }) => {
  const [airportDetails, setAirportDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAirportDetails = async () => {
    if (airportDetails || !airport.icao) return;
    
    setLoading(true);
    try {
      const details = await getAirportInfo(airport.icao);
      setAirportDetails(details);
    } catch (err) {
      console.error("Error fetching airport details:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transportation-card" onClick={fetchAirportDetails}>
      <div className="card-header">
        <Plane size={16} />
        <div className="card-title">
          <strong>{airport.name || airport.icao}</strong>
          {(airport.icao || airport.iata) && (
            <span className="card-subtitle">
              {airport.iata && `${airport.iata} / `}
              {airport.icao}
            </span>
          )}
        </div>
      </div>
      {loading && <Loader2 size={16} className="spinner" />}
      {airportDetails && airportDetails.website && (
        <a
          href={airportDetails.website}
          target="_blank"
          rel="noopener noreferrer"
          className="card-link"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
          Website sân bay
        </a>
      )}
    </div>
  );
};

// Transit Route Card Component
const TransitRouteCard = ({ route }) => {
  return (
    <div className="transportation-card">
      <div className="card-header">
        {route.type === 3 ? <Bus size={16} /> : <Train size={16} />}
        <div className="card-title">
          <strong>{route.name || route.longName}</strong>
          {route.shortName && (
            <span className="card-subtitle">Tuyến {route.shortName}</span>
          )}
        </div>
      </div>
      {route.agency && (
        <p className="card-info">Đơn vị: {route.agency}</p>
      )}
    </div>
  );
};

// Flight Card Component
const FlightCard = ({ flight }) => {
  return (
    <div className="transportation-card">
      <div className="card-header">
        <Plane size={16} />
        <div className="card-title">
          <strong>{flight.callsign || flight.icao24}</strong>
          {flight.originCountry && (
            <span className="card-subtitle">{flight.originCountry}</span>
          )}
        </div>
      </div>
      {flight.velocity && (
        <p className="card-info">
          Tốc độ: {Math.round(flight.velocity * 3.6)} km/h
        </p>
      )}
      {flight.geoAltitude && (
        <p className="card-info">
          Độ cao: {Math.round(flight.geoAltitude)} m
        </p>
      )}
    </div>
  );
};

export default TransportationInfo;


