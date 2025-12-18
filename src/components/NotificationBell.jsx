import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, X } from "lucide-react";
import { listenNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../services/notifications";
import "./NotificationBell.css";

const NotificationBell = ({ userId }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Listen to notifications
  useEffect(() => {
    if (!userId) {
      console.log("🔔 NotificationBell: No userId, clearing notifications");
      setNotifications([]);
      return;
    }

    console.log(`🔔 NotificationBell: Setting up listener for user ${userId}`);
    const unsubscribe = listenNotifications(userId, (items) => {
      console.log(`🔔 NotificationBell: Received ${items.length} notifications`);
      // Filter out deleted notifications
      const activeNotifications = items.filter((notif) => !notif.deleted);
      console.log(`🔔 NotificationBell: ${activeNotifications.length} active notifications after filtering`);
      setNotifications(activeNotifications);
    });

    return () => {
      console.log(`🔔 NotificationBell: Cleaning up listener for user ${userId}`);
      unsubscribe();
    };
  }, [userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }

    // Navigate to link if available
    if (notification.link) {
      // If there's a replyId, add hash fragment to scroll to reply
      if (notification.replyId && notification.commentId) {
        navigate(`${notification.link}#reply-${notification.commentId}-${notification.replyId}`);
      } else if (notification.commentId) {
        navigate(`${notification.link}#comment-${notification.commentId}`);
      } else {
        navigate(notification.link);
      }
      setIsOpen(false);
    } else if (notification.postId) {
      // If there's a replyId, add hash fragment to scroll to reply
      if (notification.replyId && notification.commentId) {
        navigate(`/post/${notification.postId}#reply-${notification.commentId}-${notification.replyId}`);
      } else if (notification.commentId) {
        navigate(`/post/${notification.postId}#comment-${notification.commentId}`);
      } else {
        navigate(`/post/${notification.postId}`);
      }
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (userId && unreadCount > 0) {
      await markAllNotificationsAsRead(userId);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Vừa xong";
    
    const now = new Date();
    let time;
    if (timestamp.toDate) {
      time = timestamp.toDate();
    } else if (timestamp.seconds) {
      time = new Date(timestamp.seconds * 1000);
    } else {
      time = new Date(timestamp);
    }
    
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return "Vừa xong";
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} phút trước`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} giờ trước`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ngày trước`;
    }
    // Nếu quá 7 ngày, hiển thị ngày tháng
    return time.toLocaleDateString("vi-VN", { 
      day: "numeric", 
      month: "numeric",
      year: time.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return "❤️";
      case "comment":
        return "💬";
      case "reply":
        return "↩️";
      case "info":
        return "✅";
      default:
        return "🔔";
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Thông báo"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Thông báo</h3>
            {unreadCount > 0 && (
              <button
                className="mark-all-read-button"
                onClick={handleMarkAllAsRead}
                title="Đánh dấu tất cả đã đọc"
              >
                <Check size={16} />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <Bell size={32} />
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {formatTimeAgo(notification.createdAt)}
                    </div>
                  </div>
                  {!notification.read && <div className="notification-dot"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

