/**
 * Transportation APIs Service
 * Integrates various transportation APIs for travel information
 * Includes caching and error handling
 */

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCached = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Get airport information by ICAO code using airportsapi
 * @param {string} icaoCode - ICAO airport code (e.g., "VVNB" for Noi Bai)
 * @returns {Promise<Object>} Airport information
 */
export const getAirportInfo = async (icaoCode) => {
  if (!icaoCode) return null;
  
  const cacheKey = `airport_${icaoCode}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  try {
    // Try multiple airport API endpoints
    const endpoints = [
      `https://airportsapi.herokuapp.com/api/${icaoCode}`,
      `https://api.aviationapi.com/v1/airports?apt=${icaoCode}`,
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          let airportData = null;
          
          // Handle different response formats
          if (Array.isArray(data) && data.length > 0) {
            airportData = data[0];
          } else if (data.airport || data.name) {
            airportData = data;
          }
          
          if (airportData) {
            const result = {
              name: airportData.name || airportData.airport || "Unknown Airport",
              website: airportData.website || airportData.url || null,
              icao: icaoCode,
              iata: airportData.iata || airportData.code || null,
              city: airportData.city || airportData.municipality || null,
              country: airportData.country || airportData.country_code || null,
              latitude: airportData.latitude || airportData.lat || null,
              longitude: airportData.longitude || airportData.lon || airportData.lng || null,
            };
            
            setCached(cacheKey, result);
            return result;
          }
        }
      } catch (err) {
        console.warn(`Airport API endpoint failed: ${endpoint}`, err);
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching airport info:", error);
    return null;
  }
};

/**
 * Get real-time flight data from OpenSky Network
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radius - Radius in kilometers (default: 50)
 * @returns {Promise<Array>} Array of flight data
 */
export const getFlightsNearLocation = async (lat, lon, radius = 50) => {
  const cacheKey = `flights_${lat.toFixed(2)}_${lon.toFixed(2)}_${radius}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  try {
    // OpenSky Network API - no auth required for public data
    const lamin = (lat - radius / 111).toFixed(4);
    const lamax = (lat + radius / 111).toFixed(4);
    const lomin = (lon - radius / 111).toFixed(4);
    const lomax = (lon + radius / 111).toFixed(4);
    
    const response = await fetch(
      `https://opensky-network.org/api/states/all?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn("OpenSky API rate limit reached");
        return [];
      }
      throw new Error(`OpenSky API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.states && Array.isArray(data.states)) {
      const flights = data.states
        .map(state => {
          if (!state || state.length < 17) return null;
          
          return {
            icao24: state[0],
            callsign: (state[1] || "").trim(),
            originCountry: state[2] || "Unknown",
            timePosition: state[3],
            lastContact: state[4],
            longitude: state[5],
            latitude: state[6],
            baroAltitude: state[7],
            onGround: state[8] || false,
            velocity: state[9],
            trueTrack: state[10],
            verticalRate: state[11],
            sensors: state[12],
            geoAltitude: state[13],
            squawk: state[14],
            spi: state[15],
            positionSource: state[16],
          };
        })
        .filter(flight => 
          flight && 
          flight.latitude && 
          flight.longitude && 
          !flight.onGround &&
          flight.velocity > 0
        )
        .slice(0, 50); // Limit to 50 flights
      
      setCached(cacheKey, flights);
      return flights;
    }
    return [];
  } catch (error) {
    console.error("Error fetching flights:", error);
    return [];
  }
};

/**
 * Search for public transport routes using TransitLand
 * @param {string} locationName - Location name
 * @returns {Promise<Array>} Array of transit routes
 */
export const searchTransitRoutes = async (locationName) => {
  try {
    // TransitLand API endpoint
    // Note: This requires proper API key setup - check TransitLand documentation
    const response = await fetch(
      `https://transit.land/api/v2/routes?q=${encodeURIComponent(locationName)}&per_page=10`
    );
    
    if (!response.ok) {
      throw new Error(`TransitLand API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.routes && Array.isArray(data.routes)) {
      return data.routes.map(route => ({
        id: route.onestop_id,
        name: route.name,
        shortName: route.route_short_name,
        longName: route.route_long_name,
        color: route.route_color,
        textColor: route.route_text_color,
        type: route.route_type,
        agency: route.operated_by_name,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching transit routes:", error);
    return [];
  }
};

/**
 * Get nearby airports for a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radiusKm - Radius in kilometers (default: 100)
 * @returns {Promise<Array>} Array of nearby airports
 */
export const getNearbyAirports = async (lat, lon, radiusKm = 100) => {
  const cacheKey = `airports_${lat.toFixed(2)}_${lon.toFixed(2)}_${radiusKm}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  
  try {
    // Calculate bounding box
    const lamin = (lat - radiusKm / 111).toFixed(4);
    const lamax = (lat + radiusKm / 111).toFixed(4);
    const lomin = (lon - radiusKm / 111).toFixed(4);
    const lomax = (lon + radiusKm / 111).toFixed(4);
    
    // Try OpenSky Network airport database
    const response = await fetch(
      `https://opensky-network.org/api/airports?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const airports = data
          .map(airport => ({
            icao: airport.icao,
            iata: airport.iata,
            name: airport.name,
            latitude: airport.latitude,
            longitude: airport.longitude,
            elevation: airport.elevation,
            type: airport.type,
            distance: calculateDistance(lat, lon, airport.latitude, airport.longitude),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10); // Top 10 nearest
        
        setCached(cacheKey, airports);
        return airports;
      }
    }
    
    // Fallback: Return empty array
    return [];
  } catch (error) {
    console.error("Error fetching nearby airports:", error);
    return [];
  }
};

// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Get transportation information for a location
 * Combines multiple APIs to provide comprehensive transportation data
 * @param {string} locationName - Location name
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Combined transportation data
 */
export const getTransportationInfo = async (locationName, lat, lon) => {
  try {
    const [airports, flights, transitRoutes] = await Promise.all([
      getNearbyAirports(lat, lon, 50),
      getFlightsNearLocation(lat, lon, 50),
      searchTransitRoutes(locationName),
    ]);

    return {
      location: locationName,
      coordinates: { lat, lon },
      airports: airports || [],
      flights: flights || [],
      transitRoutes: transitRoutes || [],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting transportation info:", error);
    return {
      location: locationName,
      coordinates: { lat, lon },
      airports: [],
      flights: [],
      transitRoutes: [],
      error: error.message,
    };
  }
};

