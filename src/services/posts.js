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
import { db, auth } from "./firebase";
import { createNotification } from "./notifications";
import { geocodeLocation } from "./geocoding";

/**
 * Upload file to backend
 * @param {File} file - File to upload
 * @returns {Promise<string>} Download URL
 */
export const uploadFileToBackend = async (file) => {
  try {
    // Upload directly to Cloudinary using unsigned upload preset.
    // Required env vars: VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Cloudinary configuration missing. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env"
      );
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Cloudinary upload failed: ${res.status} ${errText}`);
    }

    const data = await res.json();
    if (data && (data.secure_url || data.url)) {
      return data.secure_url || data.url;
    }
    throw new Error("Cloudinary response missing URL");
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

  // Nếu là bài viết AI, kiểm tra xem đã có bài viết AI nào cho địa điểm này chưa
  // Người dùng thường (isAiGenerated = false) vẫn có thể tạo thoải mái
  if (isAiGenerated) {
    const q = query(
      collection(db, "posts"),
      where("isAiGenerated", "==", true),
      where("location_lowercase", "==", location.toLowerCase())
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      console.log(
        `⚠️ AI post for location "${location}" already exists. Skipping creation.`
      );
      return snapshot.docs[0].id; // Trả về ID của bài viết đã tồn tại
    }
  }

  // Transform contents to Firestore format
  const firestoreContents = contents.map((block) => {
    if (block.type === "text") {
      return {
        type: "text",
        content: block.value,
      };
    } else if (block.type === "youtube") {
      return {
        type: "youtube",
        url: block.value,
        videoId: block.videoId || "",
        caption: block.caption || "",
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
    category: postData.category || "",
    userId,
    userName: user?.displayName || "Anonymous",
    userPhotoURL: user?.photoURL || null,
    likes: 0,
    likedBy: [], // Array of user IDs who liked this post
    commentCount: 0,
    isAiGenerated: isAiGenerated,
    status: isAiGenerated ? "approved" : "pending", // AI posts are auto-approved
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Nếu có coordinates trong postData, thêm vào
  if (
    postData.coordinates &&
    Array.isArray(postData.coordinates) &&
    postData.coordinates.length === 2
  ) {
    postDocData.coordinates = postData.coordinates;
  }

  const docRef = await addDoc(collection(db, "posts"), postDocData);

  // Tự động geocode và lưu location vào cache (chạy ngầm, không chờ)
  // Điều này giúp lần sau không cần gọi API nữa
  geocodeLocation(location).catch((err) => {
    console.warn(`Failed to cache location "${location}":`, err);
    // Không throw error để không làm gián đoạn việc tạo post
  });

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

  // Create notification for post owner (if not the same user)
  if (postData.userId && postData.userId !== userId) {
    try {
      // Get current user info for notification message
      const currentUser = auth.currentUser;
      const userName = currentUser?.displayName || "Ai đó";

      await createNotification({
        userId: postData.userId,
        type: "like",
        title: "Có người thích bài viết của bạn",
        message: `${userName} đã thích bài viết "${
          postData.title || "của bạn"
        }"`,
        postId: postId,
        link: `/post/${postId}`,
      });
    } catch (error) {
      console.error("❌ Error creating like notification:", error);
      // Don't throw, notification is not critical
    }
  }
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
 * Get post details by ID
 * @param {string} postId - Post ID
 * @returns {Promise<Object|null>} Post data or null
 */
export const getPostDetails = async (postId) => {
  if (!postId) return null;
  try {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      return { id: postSnap.id, ...postSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error getting post details for ${postId}:`, error);
    return null;
  }
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
/**
 * Increment post views
 * @param {string} postId - Post ID
 * @returns {Promise<void>}
 */
export const incrementPostViews = async (postId) => {
  if (!postId) {
    throw new Error("Post ID is required");
  }

  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    views: increment(1),
  });
};

/**
 * Add a comment to a post
 * @param {string} postId - Post ID
 * @param {Object} comment - Comment data
 * @param {string} comment.author - Author name
 * @param {string} comment.content - Comment content
 * @param {string} comment.avatar - Author avatar URL
 * @returns {Promise<string>} Comment ID
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

  // Increment commentCount in post
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  const postData = postSnap.exists() ? postSnap.data() : null;

  await updateDoc(postRef, {
    commentCount: increment(1),
  });

  // Create notification for post owner (if not the same user)
  if (
    postData &&
    postData.userId &&
    comment.userId &&
    postData.userId !== comment.userId
  ) {
    try {
      console.log("📬 Creating comment notification:", {
        postOwnerId: postData.userId,
        commenterId: comment.userId,
        postId: postId,
        commentId: docRef.id,
      });

      await createNotification({
        userId: postData.userId,
        type: "comment",
        title: "Có người bình luận bài viết của bạn",
        message: `${
          comment.author || "Ai đó"
        } đã bình luận: "${comment.content.substring(0, 50)}${
          comment.content.length > 50 ? "..." : ""
        }"`,
        postId: postId,
        commentId: docRef.id,
        link: `/post/${postId}`,
      });

      console.log("✅ Comment notification created successfully");
    } catch (error) {
      console.error("❌ Error creating comment notification:", error);
      // Don't throw, notification is not critical
    }
  } else {
    console.log("⚠️ Comment notification skipped:", {
      hasPostData: !!postData,
      postOwnerId: postData?.userId,
      commenterId: comment.userId,
      isSameUser: postData?.userId === comment.userId,
      postDataExists: !!postData,
      postUserIdExists: !!postData?.userId,
      commentUserIdExists: !!comment.userId,
    });
  }

  return docRef.id;
};

/**
 * Add a reply to a comment
 * @param {string} postId - Post ID
 * @param {string} commentId - Comment ID
 * @param {Object} reply - Reply data
 * @param {string} reply.author - Author name
 * @param {string} reply.content - Reply content
 * @param {string} reply.avatar - Author avatar URL
 * @returns {Promise<string>} Reply ID
 */
export const addReply = async (postId, commentId, reply) => {
  if (!postId) throw new Error("Post ID is required");
  if (!commentId) throw new Error("Comment ID is required");
  if (!reply || !reply.content) throw new Error("Reply content required");

  const repliesCol = collection(
    db,
    "posts",
    postId,
    "comments",
    commentId,
    "replies"
  );
  const payload = {
    author: reply.author || "Ẩn danh",
    avatar: reply.avatar || null,
    userId: reply.userId || null,
    content: reply.content,
    likes: 0,
    likedBy: [],
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(repliesCol, payload);

  // Increment commentCount in post (replies also count as comments)
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  const postData = postSnap.exists() ? postSnap.data() : null;

  await updateDoc(postRef, {
    commentCount: increment(1),
  });

  // Get comment data to find comment author
  const commentRef = doc(db, "posts", postId, "comments", commentId);
  const commentSnap = await getDoc(commentRef);
  const commentData = commentSnap.exists() ? commentSnap.data() : null;

  // Create notification for comment author (if not the same user)
  if (
    commentData &&
    commentData.userId &&
    commentData.userId !== reply.userId
  ) {
    try {
      await createNotification({
        userId: commentData.userId,
        type: "reply",
        title: "Có người trả lời bình luận của bạn",
        message: `${
          reply.author || "Ai đó"
        } đã trả lời: "${reply.content.substring(0, 50)}${
          reply.content.length > 50 ? "..." : ""
        }"`,
        postId: postId,
        commentId: commentId,
        replyId: docRef.id,
        link: `/post/${postId}`,
      });
    } catch (error) {
      console.error("Error creating reply notification:", error);
      // Don't throw, notification is not critical
    }
  }

  return docRef.id;
};

/**
 * Like a comment
 * @param {string} postId - Post ID
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const likeComment = async (postId, commentId, userId) => {
  if (!postId || !commentId || !userId) {
    throw new Error("Post ID, Comment ID, and User ID are required");
  }

  const commentRef = doc(db, "posts", postId, "comments", commentId);
  const commentSnap = await getDoc(commentRef);

  if (!commentSnap.exists()) {
    throw new Error("Comment not found");
  }

  const commentData = commentSnap.data();
  const likedBy = commentData.likedBy || [];

  if (likedBy.includes(userId)) {
    throw new Error("Bạn đã like bình luận này rồi!");
  }

  await updateDoc(commentRef, {
    likedBy: [...likedBy, userId],
    likes: increment(1),
  });
};

/**
 * Unlike a comment
 * @param {string} postId - Post ID
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const unlikeComment = async (postId, commentId, userId) => {
  if (!postId || !commentId || !userId) {
    throw new Error("Post ID, Comment ID, and User ID are required");
  }

  const commentRef = doc(db, "posts", postId, "comments", commentId);
  const commentSnap = await getDoc(commentRef);

  if (!commentSnap.exists()) {
    throw new Error("Comment not found");
  }

  const commentData = commentSnap.data();
  const likedBy = commentData.likedBy || [];

  if (!likedBy.includes(userId)) {
    throw new Error("Bạn chưa like bình luận này!");
  }

  await updateDoc(commentRef, {
    likedBy: likedBy.filter((id) => id !== userId),
    likes: increment(-1),
  });
};

/**
 * Like a reply
 * @param {string} postId - Post ID
 * @param {string} commentId - Comment ID
 * @param {string} replyId - Reply ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const likeReply = async (postId, commentId, replyId, userId) => {
  if (!postId || !commentId || !replyId || !userId) {
    throw new Error("Post ID, Comment ID, Reply ID, and User ID are required");
  }

  const replyRef = doc(
    db,
    "posts",
    postId,
    "comments",
    commentId,
    "replies",
    replyId
  );
  const replySnap = await getDoc(replyRef);

  if (!replySnap.exists()) {
    throw new Error("Reply not found");
  }

  const replyData = replySnap.data();
  const likedBy = replyData.likedBy || [];

  if (likedBy.includes(userId)) {
    throw new Error("Bạn đã like trả lời này rồi!");
  }

  await updateDoc(replyRef, {
    likedBy: [...likedBy, userId],
    likes: increment(1),
  });

  // Create notification for reply author (if not the same user)
  if (replyData.userId && replyData.userId !== userId) {
    try {
      const currentUser = auth.currentUser;
      const userName = currentUser?.displayName || "Ai đó";

      await createNotification({
        userId: replyData.userId,
        type: "like",
        title: "Có người thích trả lời của bạn",
        message: `${userName} đã thích trả lời của bạn`,
        postId: postId,
        commentId: commentId,
        link: `/post/${postId}`,
      });
    } catch (error) {
      console.error("❌ Error creating reply like notification:", error);
      // Don't throw, notification is not critical
    }
  }
};

/**
 * Unlike a reply
 * @param {string} postId - Post ID
 * @param {string} commentId - Comment ID
 * @param {string} replyId - Reply ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const unlikeReply = async (postId, commentId, replyId, userId) => {
  if (!postId || !commentId || !replyId || !userId) {
    throw new Error("Post ID, Comment ID, Reply ID, and User ID are required");
  }

  const replyRef = doc(
    db,
    "posts",
    postId,
    "comments",
    commentId,
    "replies",
    replyId
  );
  const replySnap = await getDoc(replyRef);

  if (!replySnap.exists()) {
    throw new Error("Reply not found");
  }

  const replyData = replySnap.data();
  const likedBy = replyData.likedBy || [];

  if (!likedBy.includes(userId)) {
    throw new Error("Bạn chưa like trả lời này!");
  }

  await updateDoc(replyRef, {
    likedBy: likedBy.filter((id) => id !== userId),
    likes: increment(-1),
  });
};

/**
 * Listen to comments for a post in real-time. Returns unsubscribe function.
 * Also listens to replies for each comment.
 * @param {string} postId
 * @param {(comments:Array) => void} onUpdate
 */
export const listenComments = (postId, onUpdate) => {
  if (!postId) throw new Error("Post ID is required");
  const commentsCol = collection(db, "posts", postId, "comments");
  const q = query(commentsCol, orderBy("createdAt", "desc"));

  const unsub = onSnapshot(q, async (snapshot) => {
    const items = await Promise.all(
      snapshot.docs.map(async (d) => {
        const commentData = { id: d.id, ...d.data() };

        // Get replies for this comment
        try {
          const repliesCol = collection(
            db,
            "posts",
            postId,
            "comments",
            d.id,
            "replies"
          );
          const repliesQuery = query(repliesCol, orderBy("createdAt", "asc"));
          const repliesSnapshot = await getDocs(repliesQuery);
          commentData.replies = repliesSnapshot.docs.map((replyDoc) => ({
            id: replyDoc.id,
            ...replyDoc.data(),
          }));
        } catch (error) {
          console.error("Error fetching replies:", error);
          commentData.replies = [];
        }

        return commentData;
      })
    );
    onUpdate(items);
  });
  return unsub;
};

/**
 * Rate a post
 * @param {string} postId - Post ID
 * @param {string} userId - User ID
 * @param {number} rating - Rating value (1-5)
 * @returns {Promise<void>}
 */
export const ratePost = async (postId, userId, rating) => {
  if (!postId) throw new Error("Post ID is required");
  if (!userId) throw new Error("User ID is required");
  if (rating < 1 || rating > 5)
    throw new Error("Rating must be between 1 and 5");

  const ratingsCol = collection(db, "posts", postId, "ratings");
  const userRatingQuery = query(ratingsCol, where("userId", "==", userId));
  const snapshot = await getDocs(userRatingQuery);

  if (snapshot.empty) {
    // Add new rating
    await addDoc(ratingsCol, {
      userId,
      rating,
      createdAt: serverTimestamp(),
    });
  } else {
    // Update existing rating
    const docRef = snapshot.docs[0].ref;
    await updateDoc(docRef, {
      rating,
      updatedAt: serverTimestamp(),
    });
  }

  // Update post average rating
  await updatePostRating(postId);
};

/**
 * Get post rating
 * @param {string} postId - Post ID
 * @returns {Promise<{average: number, count: number}>}
 */
export const getPostRating = async (postId) => {
  if (!postId) throw new Error("Post ID is required");
  const ratingsCol = collection(db, "posts", postId, "ratings");
  const snapshot = await getDocs(ratingsCol);

  if (snapshot.empty) {
    return { average: 0, count: 0 };
  }

  const ratings = snapshot.docs.map((d) => d.data().rating);
  const sum = ratings.reduce((a, b) => a + b, 0);
  const average = sum / ratings.length;

  return { average, count: ratings.length };
};

/**
 * Get user's rating for a post
 * @param {string} postId - Post ID
 * @param {string} userId - User ID
 * @returns {Promise<number|null>} Rating value or null
 */
export const getUserRating = async (postId, userId) => {
  if (!postId || !userId) return null;
  try {
    const ratingsCol = collection(db, "posts", postId, "ratings");
    const q = query(ratingsCol, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;
    return snapshot.docs[0].data().rating;
  } catch (error) {
    console.error("Error getting user rating:", error);
    return null;
  }
};

/**
 * Update post average rating
 * @param {string} postId - Post ID
 */
const updatePostRating = async (postId) => {
  const { average, count } = await getPostRating(postId);
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    rating: average,
    ratingCount: count,
  });
};

/**
 * Add post to wishlist
 * @param {string} postId - Post ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const addToWishlist = async (postId, userId) => {
  if (!postId) throw new Error("Post ID is required");
  if (!userId) throw new Error("User ID is required");

  const wishlistRef = doc(db, "users", userId, "wishlist", postId);
  const wishlistSnap = await getDoc(wishlistRef);

  if (wishlistSnap.exists()) {
    throw new Error("Bài viết đã có trong danh sách yêu thích");
  }

  await addDoc(collection(db, "users", userId, "wishlist"), {
    postId,
    addedAt: serverTimestamp(),
  });
};

/**
 * Remove post from wishlist
 * @param {string} postId - Post ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const removeFromWishlist = async (postId, userId) => {
  if (!postId) throw new Error("Post ID is required");
  if (!userId) throw new Error("User ID is required");

  const wishlistCol = collection(db, "users", userId, "wishlist");
  const q = query(wishlistCol, where("postId", "==", postId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error("Bài viết không có trong danh sách yêu thích");
  }

  await deleteDoc(snapshot.docs[0].ref);
};

/**
 * Check if post is in user's wishlist
 * @param {string} postId - Post ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export const isInWishlist = async (postId, userId) => {
  if (!postId || !userId) return false;
  const wishlistCol = collection(db, "users", userId, "wishlist");
  const q = query(wishlistCol, where("postId", "==", postId));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

/**
 * Get user's wishlist
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of post IDs
 */
export const getUserWishlist = async (userId) => {
  if (!userId) return [];
  const wishlistCol = collection(db, "users", userId, "wishlist");
  const snapshot = await getDocs(wishlistCol);
  return snapshot.docs.map((d) => d.data().postId);
};

/**
 * Listen to user's wishlist changes in real-time
 * @param {string} userId - User ID
 * @param {(postIds: Array<string>) => void} onUpdate - Callback function
 * @returns {Function} Unsubscribe function
 */
export const listenWishlist = (userId, onUpdate) => {
  if (!userId) {
    console.warn("No userId provided to listenWishlist");
    return () => {};
  }

  const wishlistCol = collection(db, "users", userId, "wishlist");

  const unsub = onSnapshot(
    wishlistCol,
    (snapshot) => {
      const postIds = snapshot.docs.map((d) => d.data().postId);
      onUpdate(postIds);
    },
    (error) => {
      console.error("Error listening to wishlist:", error);
      onUpdate([]);
    }
  );

  return unsub;
};
