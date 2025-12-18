import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Create a notification
 * @param {Object} notification - Notification data
 * @param {string} notification.userId - User ID to receive notification
 * @param {string} notification.type - Notification type (like, comment, reply, etc.)
 * @param {string} notification.title - Notification title
 * @param {string} notification.message - Notification message
 * @param {string} notification.postId - Related post ID (optional)
 * @param {string} notification.commentId - Related comment ID (optional)
 * @param {string} notification.link - Link to navigate (optional)
 * @returns {Promise<string>} Notification ID
 */
export const createNotification = async (notification) => {
  if (!notification.userId) {
    throw new Error("User ID is required");
  }

  const notificationsCol = collection(db, "notifications");
  const payload = {
    userId: notification.userId,
    type: notification.type || "info",
    title: notification.title || "Thông báo mới",
    message: notification.message || "",
    postId: notification.postId || null,
    commentId: notification.commentId || null,
    replyId: notification.replyId || null,
    link: notification.link || null,
    read: false,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(notificationsCol, payload);
  return docRef.id;
};

/**
 * Listen to notifications for a user in real-time
 * @param {string} userId - User ID
 * @param {(notifications:Array) => void} onUpdate - Callback function
 * @returns {Function} Unsubscribe function
 */
export const listenNotifications = (userId, onUpdate) => {
  if (!userId) {
    console.warn("No userId provided to listenNotifications");
    return () => {};
  }

  const notificationsCol = collection(db, "notifications");
  
  // Try with orderBy first
  const qWithOrderBy = query(
    notificationsCol,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  // Fallback query without orderBy
  const qWithoutOrderBy = query(
    notificationsCol,
    where("userId", "==", userId),
    limit(50)
  );

  let unsub = null;
  let hasTriedFallback = false;

  const setupListener = (queryToUse, isFallback = false) => {
    if (unsub) {
      unsub(); // Unsubscribe previous listener
    }

    unsub = onSnapshot(
      queryToUse,
      (snapshot) => {
        let items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        
        // Always sort by createdAt (especially needed for fallback query)
        if (items.length > 0) {
          items.sort((a, b) => {
            const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return bTime - aTime; // Descending
          });
        }
        
        // Filter out deleted notifications
        items = items.filter((notif) => !notif.deleted);
        
        console.log(`📬 Notifications loaded: ${items.length} for user ${userId}${isFallback ? " (using fallback query)" : ""}`);
        onUpdate(items);
      },
      (error) => {
        console.error("❌ Error listening to notifications:", error);
        
        // If index is missing and we haven't tried fallback yet, retry with fallback
        if (error.code === "failed-precondition" && !hasTriedFallback) {
          console.warn("⚠️ Index missing, retrying with fallback query (no orderBy)");
          hasTriedFallback = true;
          setupListener(qWithoutOrderBy, true);
          return;
        }
        
        // If it's a permission error, try to provide helpful message
        if (error.code === "permission-denied") {
          console.error("⚠️ Permission denied. Check Firebase security rules for 'notifications' collection.");
        } else if (error.code === "failed-precondition") {
          console.error("⚠️ Index missing. Please create a composite index in Firebase Console:");
          console.error("   Collection: notifications");
          console.error("   Fields: userId (Ascending), createdAt (Descending)");
          console.error("   Link: https://console.firebase.google.com/v1/r/project/viettravel-5355f/firestore/indexes");
        }
        
        // Only call onUpdate with empty array if we've already tried fallback
        if (hasTriedFallback) {
          onUpdate([]);
        }
      }
    );

    return unsub;
  };

  // Start with query that has orderBy
  setupListener(qWithOrderBy);

  // Return unsubscribe function
  return () => {
    if (unsub) {
      unsub();
    }
  };
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export const markNotificationAsRead = async (notificationId) => {
  if (!notificationId) {
    throw new Error("Notification ID is required");
  }

  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, {
    read: true,
  });
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const markAllNotificationsAsRead = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const notificationsCol = collection(db, "notifications");
  const q = query(
    notificationsCol,
    where("userId", "==", userId),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);
  const updatePromises = snapshot.docs.map((doc) =>
    updateDoc(doc.ref, { read: true })
  );

  await Promise.all(updatePromises);
};

/**
 * Get unread notification count
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
export const getUnreadCount = async (userId) => {
  if (!userId) {
    return 0;
  }

  const notificationsCol = collection(db, "notifications");
  const q = query(
    notificationsCol,
    where("userId", "==", userId),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export const deleteNotification = async (notificationId) => {
  if (!notificationId) {
    throw new Error("Notification ID is required");
  }

  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, {
    deleted: true,
  });
};

