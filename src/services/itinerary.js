import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

const itinerariesCol = collection(db, "itineraries");

/**
 * Create a new itinerary
 * @param {string} userId - The user's ID
 * @param {object} data - Itinerary data (title, description, startDate, etc.)
 * @returns {Promise<string>} The new itinerary ID
 */
export const createItinerary = async (userId, data) => {
  if (!userId || !data.title) {
    throw new Error("User ID and title are required.");
  }

  const daysFromClient =
    Array.isArray(data.days) && data.days.length > 0 ? data.days : null;

  const newItinerary = {
    userId,
    title: data.title,
    description: data.description || "",
    startDate: data.startDate || null,
    // Nếu client đã truyền days (ví dụ Planner khởi tạo 3 ngày) thì dùng luôn,
    // nếu không thì tạo mặc định 1 ngày trống.
    days:
      daysFromClient ||
      [
        {
          id: `day_${Date.now()}`,
          title: "Ngày 1",
          date: data.startDate || null,
          items: [],
        },
      ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(itinerariesCol, newItinerary);
  return docRef.id;
};

/**
 * Get all itineraries for a user, ordered by creation date
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} A list of itineraries
 */
export const getItinerariesForUser = async (userId) => {
  if (!userId) return [];
  // Đơn giản chỉ lọc theo userId để tránh cần tạo index composite
  const q = query(itinerariesCol, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get a single itinerary by its ID
 * @param {string} itineraryId - The itinerary's ID
 * @returns {Promise<object|null>} The itinerary data or null
 */
export const getItineraryById = async (itineraryId) => {
  if (!itineraryId) return null;
  const docRef = doc(db, "itineraries", itineraryId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

/**
 * Update an itinerary (e.g., after drag-and-drop)
 * @param {string} itineraryId - The itinerary's ID
 * @param {object} updatedData - The data to update (e.g., the 'days' array)
 * @returns {Promise<void>}
 */
export const updateItinerary = async (itineraryId, updatedData) => {
  if (!itineraryId) throw new Error("Itinerary ID is required.");
  const docRef = doc(db, "itineraries", itineraryId);
  await updateDoc(docRef, {
    ...updatedData,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete an itinerary
 * @param {string} itineraryId - The itinerary's ID
 * @returns {Promise<void>}
 */
export const deleteItinerary = async (itineraryId) => {
  if (!itineraryId) throw new Error("Itinerary ID is required.");
  const docRef = doc(db, "itineraries", itineraryId);
  await deleteDoc(docRef);
};
