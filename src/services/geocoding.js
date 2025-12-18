import { getCachedLocation, saveLocationToCache } from "./locationCache";

/**
 * Geocode location name to coordinates using Nominatim (OpenStreetMap)
 * Fallback: Use Gemini AI if needed for complex location parsing
 * Caches results in Firestore to avoid repeated API calls
 */
export const geocodeLocation = async (locationName) => {
  try {
    console.log(`📍 Geocoding location: "${locationName}"`);

    // Step 1: Kiểm tra cache trước
    const cached = await getCachedLocation(locationName);
    if (cached) {
      console.log(`✅ Using cached coordinates for "${locationName}"`);
      return {
        latitude: cached.latitude,
        longitude: cached.longitude,
        displayName: cached.displayName,
      };
    }

    // Step 2: Nếu không có trong cache, thử Nominatim trước (miễn phí)
    console.log(`🔍 Cache miss, trying Nominatim for: "${locationName}"`);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName + ", Vietnam")}&limit=1`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'VietnamTravelApp/1.0' // Required by Nominatim
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      const coordinates = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name,
      };
      
      // Lưu vào cache
      await saveLocationToCache(locationName, coordinates);
      
      console.log(`✅ Geocoded "${locationName}" to:`, coordinates);
      return coordinates;
    }

    // Step 3: Nếu Nominatim fails, thử Gemini AI
    console.log(`⚠️ Nominatim failed, trying Gemini AI for: "${locationName}"`);
    const geminiResult = await geocodeWithGemini(locationName);
    
    // Lưu kết quả từ Gemini vào cache
    if (geminiResult && geminiResult.latitude && geminiResult.longitude) {
      await saveLocationToCache(locationName, geminiResult);
    }
    
    return geminiResult;
    
  } catch (error) {
    console.error(`❌ Geocoding error for "${locationName}":`, error);
    // Fallback to Gemini
    const geminiResult = await geocodeWithGemini(locationName);
    
    // Lưu kết quả từ Gemini vào cache (nếu có)
    if (geminiResult && geminiResult.latitude && geminiResult.longitude) {
      await saveLocationToCache(locationName, geminiResult);
    }
    
    return geminiResult;
  }
};

/**
 * Use Gemini AI to geocode location
 * This is useful for complex location names or when Nominatim fails
 */
const geocodeWithGemini = async (locationName) => {
  try {
    const apiUrl = import.meta.env.VITE_N8N_GEMINI_WEBHOOK_URL;
    
    if (!apiUrl) {
      throw new Error("Gemini API URL not configured");
    }

    const payload = {
      location: locationName,
      action: "geocode", // Flag để backend biết đây là geocoding request
      prompt: `Tìm tọa độ địa lý (latitude, longitude) của địa điểm "${locationName}" ở Việt Nam.
      
Trả về JSON format:
{
  "latitude": số thập phân (ví dụ: 21.0278),
  "longitude": số thập phân (ví dụ: 105.8342),
  "displayName": "Tên đầy đủ của địa điểm"
}

Nếu không tìm thấy, trả về null.`,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle both array and object format
    let responseData = Array.isArray(data) && data.length > 0 ? data[0] : data;
    
    if (responseData && responseData.latitude && responseData.longitude) {
      return {
        latitude: parseFloat(responseData.latitude),
        longitude: parseFloat(responseData.longitude),
        displayName: responseData.displayName || locationName,
      };
    }

    // Fallback: Return Hanoi coordinates if all else fails
    console.warn(`⚠️ Could not geocode "${locationName}", using default (Hanoi)`);
    return {
      latitude: 21.0278,
      longitude: 105.8342,
      displayName: locationName,
    };
    
  } catch (error) {
    console.error(`❌ Gemini geocoding error:`, error);
    // Final fallback: Return Hanoi coordinates
    return {
      latitude: 21.0278,
      longitude: 105.8342,
      displayName: locationName,
    };
  }
};

/**
 * Reverse geocode coordinates to get location name
 * Uses Nominatim (OpenStreetMap) - free API
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    console.log(`📍 Reverse geocoding coordinates: ${latitude}, ${longitude}`);
    
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'VietnamTravelApp/1.0' // Required by Nominatim
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim reverse geocoding error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.address) {
      // Ưu tiên tên thành phố/tỉnh, nếu không có thì dùng tên địa điểm
      let locationName = data.address.city || 
                        data.address.town || 
                        data.address.village || 
                        data.address.county ||
                        data.address.state ||
                        data.display_name?.split(',')[0] ||
                        "Vị trí hiện tại";
      
      // Nếu ở Việt Nam, thêm "Việt Nam" vào sau
      if (data.address.country_code === 'vn' || data.address.country === 'Việt Nam') {
        if (!locationName.includes('Việt Nam')) {
          locationName = locationName + ", Việt Nam";
        }
      }
      
      return {
        displayName: locationName,
        fullAddress: data.display_name,
        city: data.address.city || data.address.town || data.address.village,
        country: data.address.country || "Việt Nam"
      };
    }
    
    return {
      displayName: "Vị trí hiện tại",
      fullAddress: data.display_name || "",
      city: "",
      country: "Việt Nam"
    };
    
  } catch (error) {
    console.error(`❌ Reverse geocoding error:`, error);
    return {
      displayName: "Vị trí hiện tại",
      fullAddress: "",
      city: "",
      country: "Việt Nam"
    };
  }
};


