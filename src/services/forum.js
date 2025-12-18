import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment,
  serverTimestamp,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Create a new forum post
 */
export const createForumPost = async (postData, userId, user) => {
  const { title, content, category, tags } = postData;

  if (!title || !content) {
    throw new Error("Title and content are required");
  }

  const forumPost = {
    title,
    content,
    category: category || "general",
    tags: tags || [],
    userId,
    userName: user?.displayName || "Anonymous",
    userPhotoURL: user?.photoURL || null,
    likes: 0,
    likedBy: [],
    replies: 0,
    views: 0,
    isPinned: false,
    isLocked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "forum_posts"), forumPost);
  return docRef.id;
};

/**
 * Like/Unlike a forum post
 */
export const toggleForumPostLike = async (postId, userId) => {
  const postRef = doc(db, "forum_posts", postId);
  // Simplified - in production, check if user already liked
  await updateDoc(postRef, {
    likes: increment(1),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Add reply to forum post
 */
export const addForumReply = async (postId, replyData, userId, user) => {
  const { content } = replyData;

  if (!content) {
    throw new Error("Reply content is required");
  }

  const reply = {
    postId,
    content,
    userId,
    userName: user?.displayName || "Anonymous",
    userPhotoURL: user?.photoURL || null,
    likes: 0,
    likedBy: [],
    createdAt: serverTimestamp(),
  };

  // Add reply to subcollection
  const replyRef = await addDoc(
    collection(db, "forum_posts", postId, "replies"),
    reply
  );

  // Update reply count
  const postRef = doc(db, "forum_posts", postId);
  await updateDoc(postRef, {
    replies: increment(1),
    updatedAt: serverTimestamp(),
  });

  return replyRef.id;
};

/**
 * Listen to forum posts
 */
export const listenForumPosts = (callback, filters = {}) => {
  try {
    let q;
    
    // Nếu có filter category, dùng query với where
    if (filters.category && filters.category !== "all") {
      q = query(
        collection(db, "forum_posts"),
        where("category", "==", filters.category),
        orderBy("isPinned", "desc"),
        orderBy("createdAt", "desc")
      );
    } else {
      // Nếu không có filter, chỉ orderBy
      q = query(
        collection(db, "forum_posts"),
        orderBy("isPinned", "desc"),
        orderBy("createdAt", "desc")
      );
    }

    return onSnapshot(q, 
      (snapshot) => {
        const posts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(posts);
      },
      (error) => {
        console.error("Error listening to forum posts:", error);
        // Fallback: get all posts without orderBy if index missing
        if (error.code === 'failed-precondition') {
          const fallbackQ = query(collection(db, "forum_posts"));
          return onSnapshot(fallbackQ, (snapshot) => {
            const posts = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            // Sort manually
            posts.sort((a, b) => {
              if (a.isPinned !== b.isPinned) return b.isPinned - a.isPinned;
              const aTime = a.createdAt?.seconds || 0;
              const bTime = b.createdAt?.seconds || 0;
              return bTime - aTime;
            });
            callback(posts);
          });
        }
        callback([]);
      }
    );
  } catch (error) {
    console.error("Error setting up forum posts listener:", error);
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * Listen to replies for a forum post
 */
export const listenForumReplies = (postId, callback) => {
  try {
    const q = query(
      collection(db, "forum_posts", postId, "replies"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, 
      (snapshot) => {
        const replies = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(replies);
      },
      (error) => {
        console.error("Error listening to forum replies:", error);
        // Fallback: get replies without orderBy
        if (error.code === 'failed-precondition') {
          const fallbackQ = query(collection(db, "forum_posts", postId, "replies"));
          return onSnapshot(fallbackQ, (snapshot) => {
            const replies = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            // Sort manually
            replies.sort((a, b) => {
              const aTime = a.createdAt?.seconds || 0;
              const bTime = b.createdAt?.seconds || 0;
              return aTime - bTime;
            });
            callback(replies);
          });
        }
        callback([]);
      }
    );
  } catch (error) {
    console.error("Error setting up replies listener:", error);
    callback([]);
    return () => {};
  }
};

/**
 * Increment view count
 */
export const incrementForumPostViews = async (postId) => {
  const postRef = doc(db, "forum_posts", postId);
  await updateDoc(postRef, {
    views: increment(1),
  });
};

