import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

// Admin credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "nimda";
const ADMIN_EMAIL = "admin@exploreviet.com"; // Email cho admin account

/**
 * Đăng nhập admin với username và password
 */
export const adminLogin = async (username, password) => {
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    throw new Error("Tên đăng nhập hoặc mật khẩu không đúng");
  }

  try {
    // Tạo hoặc đăng nhập với email admin
    let userCredential;
    try {
      // Thử đăng nhập
      userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    } catch (error) {
      // Nếu user chưa tồn tại, tạo mới
      if (error.code === "auth/user-not-found") {
        userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      } else {
        throw error;
      }
    }

    const user = userCredential.user;

    // Đảm bảo user document trong Firestore có role="admin"
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      // Tạo user document mới với role admin
      await setDoc(userDocRef, {
        email: ADMIN_EMAIL,
        displayName: "Admin",
        role: "admin",
        createdAt: serverTimestamp(),
        isAdmin: true,
      });
    } else {
      // Cập nhật role nếu đã tồn tại
      await updateDoc(userDocRef, {
        role: "admin",
        isAdmin: true,
        updatedAt: serverTimestamp(),
      });
    }

    return user;
  } catch (error) {
    console.error("Lỗi đăng nhập admin:", error);
    throw new Error("Đăng nhập admin thất bại: " + error.message);
  }
};

/**
 * Kiểm tra xem user hiện tại có phải admin không (dựa trên role trong Firestore)
 */
export const checkAdminStatus = async (userId) => {
  if (!userId) return false;
  
  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      return userData.role === "admin" || userData.isAdmin === true;
    }
    return false;
  } catch (error) {
    console.error("Lỗi kiểm tra admin status:", error);
    return false;
  }
};

