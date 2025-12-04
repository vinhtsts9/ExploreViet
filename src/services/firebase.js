import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { apiPostAuth } from "../api.js";

import FirebaseConfig from "../../fireBaseConfig.js";

// Initialize Firebase
const app = initializeApp(FirebaseConfig);

// Khởi tạo và export các dịch vụ
const auth = getAuth(app);
const db = getFirestore(app);
getAnalytics(app);

const provider = new GoogleAuthProvider();

// Biến để đảm bảo việc tạo session chỉ chạy một lần khi cần thiết
let sessionPromise = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Người dùng đã đăng nhập (hoặc vừa đăng nhập, hoặc tải lại trang)
    console.log("onAuthStateChanged: User is signed in.", user.email);
    // Expose helper to let API layer fetch current Firebase ID token
    // Frontend will manage Firebase auth entirely and send the ID token
    window.getFirebaseToken = async (forceRefresh = false) => {
      try {
        return await user.getIdToken(forceRefresh);
      } catch (err) {
        console.error("getFirebaseToken error:", err);
        return null;
      }
    };
  } else {
    console.log("onAuthStateChanged: User is signed out.");
    // Clear helper when signed out
    window.getFirebaseToken = async () => null;
  }
});

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("Đăng nhập Google thành công:", user);

    // Việc tạo session cookie giờ đã được xử lý bởi onAuthStateChanged
  } catch (error) {
    console.error("Lỗi đăng nhập Google:", error);
  }
};

export const logOut = async () => {
  // Clear frontend token helper and sign out
  window.getFirebaseToken = async () => null;
  await signOut(auth);
};

export { auth, db };
