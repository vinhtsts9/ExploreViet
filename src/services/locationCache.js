/**
 * Location Cache Service
 * Lưu trữ và truy xuất tọa độ địa điểm đã geocode để tránh gọi API lặp lại
 */

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Tạo key chuẩn hóa cho location name (lowercase, trim)
 */
const normalizeLocationName = (locationName) => {
  if (!locationName) return "";
  return locationName.toLowerCase().trim();
};

/**
 * Lấy tọa độ địa điểm từ cache
 * @param {string} locationName - Tên địa điểm
 * @returns {Promise<Object|null>} Coordinates object hoặc null nếu không tìm thấy
 */
export const getCachedLocation = async (locationName) => {
  try {
    const normalizedName = normalizeLocationName(locationName);
    if (!normalizedName) return null;

    const locationRef = doc(db, "location_cache", normalizedName);
    const locationDoc = await getDoc(locationRef);

    if (locationDoc.exists()) {
      const data = locationDoc.data();
      console.log(`✅ Found cached location: "${locationName}"`);
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        displayName: data.displayName || locationName,
        cachedAt: data.cachedAt,
      };
    }

    return null;
  } catch (error) {
    console.error(`❌ Error getting cached location for "${locationName}":`, error);
    return null;
  }
};

/**
 * Lưu tọa độ địa điểm vào cache
 * @param {string} locationName - Tên địa điểm gốc
 * @param {Object} coordinates - Object chứa latitude, longitude, displayName
 * @returns {Promise<void>}
 */
export const saveLocationToCache = async (locationName, coordinates) => {
  try {
    const normalizedName = normalizeLocationName(locationName);
    if (!normalizedName || !coordinates || !coordinates.latitude || !coordinates.longitude) {
      return;
    }

    const locationRef = doc(db, "location_cache", normalizedName);
    
    await setDoc(locationRef, {
      originalName: locationName,
      normalizedName: normalizedName,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      displayName: coordinates.displayName || locationName,
      cachedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log(`💾 Saved location to cache: "${locationName}" -> (${coordinates.latitude}, ${coordinates.longitude})`);
  } catch (error) {
    console.error(`❌ Error saving location to cache for "${locationName}":`, error);
    // Không throw error để không làm gián đoạn flow chính
  }
};

/**
 * Tìm kiếm địa điểm trong cache theo tên (fuzzy search)
 * @param {string} searchTerm - Từ khóa tìm kiếm
 * @returns {Promise<Array>} Danh sách địa điểm khớp
 */
export const searchCachedLocations = async (searchTerm) => {
  try {
    const normalizedSearch = normalizeLocationName(searchTerm);
    if (!normalizedSearch) return [];

    const locationsRef = collection(db, "location_cache");
    const q = query(
      locationsRef,
      where("normalizedName", ">=", normalizedSearch),
      where("normalizedName", "<=", normalizedSearch + "\uf8ff")
    );

    const querySnapshot = await getDocs(q);
    const results = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        id: doc.id,
        originalName: data.originalName,
        displayName: data.displayName,
        latitude: data.latitude,
        longitude: data.longitude,
      });
    });

    return results;
  } catch (error) {
    console.error(`❌ Error searching cached locations:`, error);
    return [];
  }
};




