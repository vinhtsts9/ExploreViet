import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";

/**
 * Kiểm tra xem user có phải admin không
 */
export const isUserAdmin = async (userId) => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      return userData.role === "admin" || userData.isAdmin === true;
    }
    return false;
  } catch (error) {
    console.error("Lỗi kiểm tra admin:", error);
    return false;
  }
};

/**
 * Lấy danh sách tất cả người dùng
 */
export const getAllUsers = async () => {
  try {
    const usersCollection = collection(db, "users");
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Lỗi lấy danh sách người dùng:", error);
    throw error;
  }
};

/**
 * Subscribe to users list in real-time
 */
export const subscribeToUsers = (callback) => {
  const usersCollection = collection(db, "users");

  return onSnapshot(
    usersCollection,
    (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(users);
    },
    (error) => {
      console.error("Lỗi subscribe users:", error);
    }
  );
};

/**
 * Bổ nhiệm người dùng làm admin
 */
export const promoteToAdmin = async (userId) => {
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      role: "admin",
      promotedAt: serverTimestamp(),
    });
    console.log(`✅ Bổ nhiệm ${userId} thành admin thành công`);
  } catch (error) {
    console.error("Lỗi bổ nhiệm admin:", error);
    throw error;
  }
};

/**
 * Thu hồi quyền admin
 */
export const revokeAdminRole = async (userId) => {
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      role: "user",
      revokedAt: serverTimestamp(),
    });
    console.log(`✅ Thu hồi quyền admin của ${userId} thành công`);
  } catch (error) {
    console.error("Lỗi thu hồi quyền admin:", error);
    throw error;
  }
};

/**
 * Xóa người dùng
 */
export const deleteUser = async (userId) => {
  try {
    // Xóa tất cả bài viết của user
    const postsRef = collection(db, "posts");
    const postsQuery = query(postsRef, where("userId", "==", userId));
    const postsSnapshot = await getDocs(postsQuery);

    for (const postDoc of postsSnapshot.docs) {
      await deleteDoc(postDoc.ref);
    }

    // Xóa user document
    const userDocRef = doc(db, "users", userId);
    await deleteDoc(userDocRef);

    console.log(
      `✅ Xóa người dùng ${userId} và tất cả bài viết của họ thành công`
    );
  } catch (error) {
    console.error("Lỗi xóa người dùng:", error);
    throw error;
  }
};

/**
 * Lấy danh sách bài viết chờ phê duyệt
 */
export const getPendingPosts = async () => {
  try {
    const postsRef = collection(db, "posts");
    const pendingQuery = query(postsRef, where("status", "==", "pending"));
    const snapshot = await getDocs(pendingQuery);

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort(
        (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
      );
  } catch (error) {
    console.error("Lỗi lấy bài viết chờ phê duyệt:", error);
    throw error;
  }
};

/**
 * Subscribe to pending posts in real-time
 */
export const subscribeToPendingPosts = (callback) => {
  const postsRef = collection(db, "posts");
  const pendingQuery = query(postsRef, where("status", "==", "pending"));

  return onSnapshot(
    pendingQuery,
    (snapshot) => {
      const posts = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
        );
      callback(posts);
    },
    (error) => {
      console.error("Lỗi subscribe pending posts:", error);
    }
  );
};

/**
 * Phê duyệt bài viết
 */
export const approvePost = async (postId) => {
  try {
    const postDocRef = doc(db, "posts", postId);
    await updateDoc(postDocRef, {
      status: "approved",
      approvedAt: serverTimestamp(),
    });
    console.log(`✅ Phê duyệt bài viết ${postId} thành công`);
  } catch (error) {
    console.error("Lỗi phê duyệt bài viết:", error);
    throw error;
  }
};

/**
 * Từ chối bài viết
 */
export const rejectPost = async (postId, reason = "") => {
  try {
    const postDocRef = doc(db, "posts", postId);
    await updateDoc(postDocRef, {
      status: "rejected",
      rejectionReason: reason,
      rejectedAt: serverTimestamp(),
    });
    console.log(`✅ Từ chối bài viết ${postId} thành công`);
  } catch (error) {
    console.error("Lỗi từ chối bài viết:", error);
    throw error;
  }
};

/**
 * Xóa bài viết
 */
export const deletePost = async (postId) => {
  try {
    const postDocRef = doc(db, "posts", postId);
    await deleteDoc(postDocRef);
    console.log(`✅ Xóa bài viết ${postId} thành công`);
  } catch (error) {
    console.error("Lỗi xóa bài viết:", error);
    throw error;
  }
};

/**
 * Lấy thống kê admin
 */
export const getAdminStats = async () => {
  try {
    // Lấy số lượng người dùng
    const usersSnapshot = await getDocs(collection(db, "users"));
    const totalUsers = usersSnapshot.size;

    // Lấy số lượng bài viết
    const postsSnapshot = await getDocs(collection(db, "posts"));
    const totalPosts = postsSnapshot.size;

    // Lấy số lượng bài viết chờ phê duyệt
    const pendingPostsQuery = query(
      collection(db, "posts"),
      where("status", "==", "pending")
    );
    const pendingPostsSnapshot = await getDocs(pendingPostsQuery);
    const pendingPosts = pendingPostsSnapshot.size;

    // Lấy số lượng admin
    const adminsQuery = query(
      collection(db, "users"),
      where("role", "==", "admin")
    );
    const adminsSnapshot = await getDocs(adminsQuery);
    const totalAdmins = adminsSnapshot.size;

    return {
      totalUsers,
      totalPosts,
      pendingPosts,
      totalAdmins,
    };
  } catch (error) {
    console.error("Lỗi lấy thống kê admin:", error);
    throw error;
  }
};

/**
 * Tạo/cập nhật user document khi user đăng nhập
 */
export const createOrUpdateUserDoc = async (user) => {
  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      // User mới, tạo document với đầy đủ thông tin
      const newUserDoc = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Anonymous",
        photoURL: user.photoURL || null,
        role: "user", // Mặc định là user
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };
      await setDoc(userDocRef, newUserDoc);
      return newUserDoc;
    } else {
      // User đã tồn tại, chỉ cập nhật thông tin cần thiết
      const updateData = {
        email: user.email || "",
        displayName: user.displayName || "Anonymous",
        photoURL: user.photoURL || null,
        lastLogin: serverTimestamp(),
      };
      await updateDoc(userDocRef, updateData);
      return { ...userDocSnap.data(), ...updateData };
    }
  } catch (error) {
    console.error("Lỗi tạo/cập nhật user document:", error);
    throw error;
  }
};

/**
 * Lấy thông tin user
 */
export const getUserInfo = async (userId) => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return userDocSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Lỗi lấy thông tin user:", error);
    throw error;
  }
};
