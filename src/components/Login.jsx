import React from "react";
import { signInWithGoogle } from "../services/firebase";
import "./Login.css";

const Login = () => {
  return (
    <div className="login-page-container">
      <div className="login-box">
        <h2 className="login-title">Chào mừng bạn!</h2>
        <p className="login-subtitle">
          Đăng nhập để chia sẻ trải nghiệm du lịch của bạn và tương tác với cộng
          đồng.
        </p>

        <button onClick={signInWithGoogle} className="google-login-button">
          <img src="/google-icon.svg" alt="Google" className="google-icon" />
          <span>Đăng nhập bằng Google</span>
        </button>
      </div>
    </div>
  );
};

export default Login;
