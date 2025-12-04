import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  query,
  where,
  getDocs,
  getDoc,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { apiPostAuth } from "../api";

/**
 * Upload file to backend
 * @param {File} file - File to upload
 * @returns {Promise<string>} Download URL
 */
export const uploadFileToBackend = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiPostAuth("/posts/upload", formData);
    if (response && response.data && response.data.url) {
      return response.data.url;
    }
    throw new Error("Phản hồi API không hợp lệ.");
  } catch (error) {
    console.error("Upload to backend failed:", error);
    throw new Error("Không thể upload file: " + error.message);
  }
};

/**
 * Create a new post in Firestore
 * @param {Object} postData - Post data
 * @param {string} postData.title - Post title
 * @param {string} postData.location - Location
 * @param {Array} postData.contents - Array of content blocks
 * @param {string} userId - User ID
 * @param {Object} user - User object with displayName, photoURL, uid
 * @param {boolean} isAiGenerated - Whether this post was AI-generated (default: false)
 * @returns {Promise<string>} Post ID
 */
export const createPost = async (
  postData,
  userId,
  user,
  isAiGenerated = false
) => {
  const { title, location, contents } = postData;

  if (!title || !location || !contents || contents.length === 0) {
    throw new Error("Missing required fields: title, location, or contents");
  }

  if (!userId) {
    throw new Error("User ID is required");
  }

  // Transform contents to Firestore format
  const firestoreContents = contents.map((block) => {
    if (block.type === "text") {
      return {
        type: "text",
        content: block.value,
      };
    } else {
      return {
        type: block.type, // 'image' or 'video'
        url: block.value,
        caption: block.caption || "",
      };
    }
  });

  const postDocData = {
    title,
    location,
    location_lowercase: location.toLowerCase(),
    content: firestoreContents,
    userId,
    userName: user?.displayName || "Anonymous",
    userPhotoURL: user?.photoURL || null,
    likes: 0,
    likedBy: [], // Array of user IDs who liked this post
    commentCount: 0,
    isAiGenerated: isAiGenerated,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "posts"), postDocData);
  return docRef.id;
};

/**
 * Like a post - user can only like once
 * @param {string} postId - Post ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const likePost = async (postId, userId) => {
  if (!postId) {
    throw new Error("Post ID is required");
  }
  if (!userId) {
    throw new Error("User ID is required");
  }

  const postRef = doc(db, "posts", postId);

  // Get current post data
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) {
    throw new Error("Post not found");
  }

  const postData = postSnap.data();
  const likedBy = postData.likedBy || [];

  // Check if user already liked this post
  if (likedBy.includes(userId)) {
    throw new Error("Bạn đã like bài viết này rồi!");
  }

  // Add user to likedBy array and increment likes
  await updateDoc(postRef, {
    likedBy: [...likedBy, userId],
    likes: increment(1),
  });
};

/**
 * Unlike a post
 * @param {string} postId - Post ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const unlikePost = async (postId, userId) => {
  if (!postId) {
    throw new Error("Post ID is required");
  }
  if (!userId) {
    throw new Error("User ID is required");
  }

  const postRef = doc(db, "posts", postId);

  // Get current post data
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) {
    throw new Error("Post not found");
  }

  const postData = postSnap.data();
  const likedBy = postData.likedBy || [];

  // Check if user has liked this post
  if (!likedBy.includes(userId)) {
    throw new Error("Bạn chưa like bài viết này!");
  }

  // Remove user from likedBy array and decrement likes
  await updateDoc(postRef, {
    likedBy: likedBy.filter((id) => id !== userId),
    likes: increment(-1),
  });
};

/**
 * Get user's posts
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of posts
 */
export const getUserPosts = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const q = query(collection(db, "posts"), where("userId", "==", userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Delete a post
 * @param {string} postId - Post ID
 * @returns {Promise<void>}
 */
export const deletePost = async (postId) => {
  if (!postId) {
    throw new Error("Post ID is required");
  }

  const postRef = doc(db, "posts", postId);
  await deleteDoc(postRef);
};

/**
 * Update a post
 * @param {string} postId - Post ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<void>}
 */
export const updatePost = async (postId, updateData) => {
  if (!postId) {
    throw new Error("Post ID is required");
  }

  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Add a comment to a post (stored in subcollection `posts/{postId}/comments`).
 * @param {string} postId
 * @param {{ author: string, avatar?: string, userId: string, content: string }} comment
 */
export const addComment = async (postId, comment) => {
  if (!postId) throw new Error("Post ID is required");
  if (!comment || !comment.content) throw new Error("Comment content required");

  const commentsCol = collection(db, "posts", postId, "comments");
  const payload = {
    author: comment.author || "Ẩn danh",
    avatar: comment.avatar || null,
    userId: comment.userId || null,
    content: comment.content,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(commentsCol, payload);
  return docRef.id;
};

/**
 * Listen to comments for a post in real-time. Returns unsubscribe function.
 * @param {string} postId
 * @param {(comments:Array) => void} onUpdate
 */
export const listenComments = (postId, onUpdate) => {
  if (!postId) throw new Error("Post ID is required");
  const commentsCol = collection(db, "posts", postId, "comments");
  const q = query(commentsCol, orderBy("createdAt", "desc"));
  const unsub = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    onUpdate(items);
  });
  return unsub;
};
