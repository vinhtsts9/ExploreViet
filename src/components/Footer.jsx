import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Clock, GitCommit, Users, Mail, HelpCircle, FileText, Shield, Cookie, X, MapPin } from "lucide-react";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import "./Footer.css";

const Footer = () => {
  const navigate = useNavigate();
  const [relativeTime, setRelativeTime] = useState("");
  const [commitName, setCommitName] = useState("");
  const [showModal, setShowModal] = useState(null);
  const { location: currentLocation, isLoading: locationLoading } = useCurrentLocation();

  // Function to calculate relative time from build timestamp
  const getRelativeTime = (buildTimestamp) => {
    if (!buildTimestamp) return "Vừa xong";
    
    const now = new Date();
    const buildDate = new Date(buildTimestamp);
    const diffMs = now - buildDate;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return `${diffSeconds} giây trước`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return buildDate.toLocaleDateString("vi-VN");
    }
  };

  // Get build timestamp from env or use current time
  const buildTimestamp = import.meta.env.VITE_BUILD_TIME 
    ? parseInt(import.meta.env.VITE_BUILD_TIME) 
    : Date.now();

  // Get commit name from env or try to get from git
  useEffect(() => {
    const envCommit = import.meta.env.VITE_COMMIT_HASH || import.meta.env.VITE_COMMIT_NAME;
    
    if (envCommit) {
      setCommitName(envCommit);
    } else {
      setCommitName("Latest build");
    }
  }, []);

  // Update relative time every second
  useEffect(() => {
    const updateTime = () => {
      setRelativeTime(getRelativeTime(buildTimestamp));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [buildTimestamp]);

  const teamMembers = [
    { name: "Nguyễn Quyền Anh", id: "nguyen-quyen-anh" },
    { name: "Vũ Thế Vinh", id: "vu-the-vinh" },
    { name: "Hà Duyên Thắng", id: "ha-duyen-thang" },
    { name: "Hoàng Lê Duy", id: "hoang-le-duy" },
    { name: "Nguyễn Quang Huy", id: "nguyen-quang-huy" }
  ];

  const handleTeamMemberClick = (memberId) => {
    setShowModal(null);
    navigate(`/team/${memberId}`);
  };

  const modalContent = {
    about: {
      title: "Giới thiệu",
      content: (
        <div>
          <p>
            <strong>Vietnam Travel</strong> là nền tảng du lịch trực tuyến được xây dựng với mục tiêu 
            quảng bá và giới thiệu vẻ đẹp của đất nước Việt Nam đến với du khách trong và ngoài nước.
          </p>
          <p>
            Chúng tôi cung cấp thông tin chi tiết về các địa điểm du lịch, dự báo thời tiết, 
            bản đồ tương tác và cộng đồng chia sẻ kinh nghiệm du lịch.
          </p>
          <p>
            Với công nghệ AI hiện đại, chúng tôi tự động tạo nội dung phong phú về các điểm đến, 
            giúp bạn dễ dàng khám phá và lên kế hoạch cho chuyến đi của mình.
          </p>
        </div>
      )
    },
    team: {
      title: "Đội ngũ phát triển",
      content: (
        <div>
          <p className="team-intro">
            Dự án được phát triển bởi đội ngũ 5 thành viên tài năng:
          </p>
          <ul className="team-list">
            {teamMembers.map((member, index) => (
              <li 
                key={index} 
                className="team-member clickable"
                onClick={() => handleTeamMemberClick(member.id)}
              >
                <Users size={18} />
                <span>{member.name}</span>
              </li>
            ))}
          </ul>
          <p className="team-note">
            Cảm ơn các thành viên đã đóng góp công sức và tâm huyết để xây dựng nền tảng này.
          </p>
        </div>
      )
    },
    contact: {
      title: "Liên hệ",
      content: (
        <div>
          <p>
            Chúng tôi luôn sẵn sàng lắng nghe ý kiến và phản hồi từ bạn!
          </p>
          <div className="contact-info">
            <div className="contact-item">
              <Mail size={20} />
              <div>
                <strong>Email:</strong>
                <span>support@vietnamtravel.com</span>
              </div>
            </div>
            <div className="contact-item">
              <span>
                <strong>Thời gian hỗ trợ:</strong> Thứ 2 - Thứ 6, 8:00 - 17:00
              </span>
            </div>
          </div>
          <p className="contact-note">
            Mọi thắc mắc, góp ý hoặc báo cáo lỗi, vui lòng liên hệ với chúng tôi qua email.
          </p>
        </div>
      )
    },
    guide: {
      title: "Hướng dẫn sử dụng",
      content: (
        <div>
          <h4>Tìm kiếm địa điểm</h4>
          <p>Nhập tên địa điểm vào thanh tìm kiếm ở header để tìm bài viết hoặc tạo bài viết mới bằng AI.</p>
          
          <h4>Xem dự báo thời tiết</h4>
          <p>Vào mục "Dự báo thời tiết" để xem thời tiết 7-14 ngày cho bất kỳ địa điểm nào tại Việt Nam.</p>
          
          <h4>Xem bản đồ</h4>
          <p>Vào mục "Bản đồ" để xem tất cả các địa điểm du lịch trên bản đồ tương tác.</p>
          
          <h4>Hỏi & Đáp</h4>
          <p>Tham gia cộng đồng để đặt câu hỏi và chia sẻ kinh nghiệm du lịch.</p>
          
          <h4>Tạo bài viết</h4>
          <p>Đăng nhập và nhấn "Đăng bài" để chia sẻ trải nghiệm du lịch của bạn.</p>
        </div>
      )
    },
    faq: {
      title: "Câu hỏi thường gặp",
      content: (
        <div>
          <div className="faq-item">
            <h4>Website này miễn phí không?</h4>
            <p>Hoàn toàn miễn phí! Bạn có thể sử dụng tất cả các tính năng mà không cần trả phí.</p>
          </div>
          
          <div className="faq-item">
            <h4>Tôi có cần đăng ký tài khoản không?</h4>
            <p>Bạn có thể xem nội dung mà không cần đăng ký. Tuy nhiên, để đăng bài, bình luận và tương tác, bạn cần đăng nhập.</p>
          </div>
          
          <div className="faq-item">
            <h4>Dữ liệu thời tiết được cập nhật như thế nào?</h4>
            <p>Dữ liệu thời tiết được lấy từ Open-Meteo API và tự động cập nhật mỗi 10 phút.</p>
          </div>
          
          <div className="faq-item">
            <h4>Làm thế nào để báo cáo nội dung không phù hợp?</h4>
            <p>Bạn có thể sử dụng nút "Báo cáo" trong bài viết hoặc liên hệ với chúng tôi qua email.</p>
          </div>
        </div>
      )
    },
    report: {
      title: "Báo lỗi",
      content: (
        <div>
          <p>
            Nếu bạn phát hiện lỗi hoặc vấn đề kỹ thuật trên website, vui lòng cung cấp thông tin sau:
          </p>
          <ul className="report-list">
            <li>Mô tả chi tiết về lỗi</li>
            <li>Trang/trình duyệt bạn đang sử dụng</li>
            <li>Thời điểm xảy ra lỗi</li>
            <li>Ảnh chụp màn hình (nếu có)</li>
          </ul>
          <p>
            Gửi báo cáo đến: <strong>support@vietnamtravel.com</strong>
          </p>
          <p className="report-note">
            Chúng tôi sẽ xem xét và khắc phục trong thời gian sớm nhất.
          </p>
        </div>
      )
    },
    terms: {
      title: "Điều khoản sử dụng",
      content: (
        <div>
          <h4>1. Chấp nhận điều khoản</h4>
          <p>Bằng việc sử dụng website, bạn đồng ý với các điều khoản và điều kiện này.</p>
          
          <h4>2. Quyền sở hữu nội dung</h4>
          <p>Nội dung do người dùng đăng tải thuộc quyền sở hữu của người đăng. Website chỉ là nền tảng chia sẻ.</p>
          
          <h4>3. Trách nhiệm người dùng</h4>
          <p>Người dùng chịu trách nhiệm về nội dung mình đăng tải và cam kết không vi phạm pháp luật.</p>
          
          <h4>4. Quyền của website</h4>
          <p>Chúng tôi có quyền xóa, chỉnh sửa hoặc từ chối nội dung không phù hợp mà không cần thông báo trước.</p>
          
          <h4>5. Miễn trừ trách nhiệm</h4>
          <p>Website không chịu trách nhiệm về độ chính xác của thông tin do người dùng cung cấp.</p>
        </div>
      )
    },
    privacy: {
      title: "Chính sách bảo mật",
      content: (
        <div>
          <h4>1. Thu thập thông tin</h4>
          <p>Chúng tôi chỉ thu thập thông tin cần thiết để cung cấp dịch vụ: email, tên hiển thị (nếu bạn đăng nhập).</p>
          
          <h4>2. Sử dụng thông tin</h4>
          <p>Thông tin được sử dụng để: xác thực người dùng, hiển thị tên trong bài viết/bình luận, cải thiện dịch vụ.</p>
          
          <h4>3. Bảo vệ thông tin</h4>
          <p>Chúng tôi sử dụng Firebase Authentication và Firestore với các biện pháp bảo mật tiên tiến để bảo vệ dữ liệu của bạn.</p>
          
          <h4>4. Chia sẻ thông tin</h4>
          <p>Chúng tôi không bán, cho thuê hoặc chia sẻ thông tin cá nhân của bạn với bên thứ ba.</p>
          
          <h4>5. Quyền của người dùng</h4>
          <p>Bạn có quyền yêu cầu xóa tài khoản và dữ liệu cá nhân bất cứ lúc nào.</p>
        </div>
      )
    },
    cookie: {
      title: "Chính sách Cookie",
      content: (
        <div>
          <h4>Cookie là gì?</h4>
          <p>Cookie là các file nhỏ được lưu trên thiết bị của bạn để cải thiện trải nghiệm sử dụng website.</p>
          
          <h4>Cookie chúng tôi sử dụng</h4>
          <ul className="cookie-list">
            <li><strong>Cookie xác thực:</strong> Lưu trạng thái đăng nhập của bạn</li>
            <li><strong>Cookie tùy chọn:</strong> Lưu các tùy chọn hiển thị và cài đặt</li>
            <li><strong>Cookie phân tích:</strong> Giúp chúng tôi hiểu cách người dùng sử dụng website</li>
          </ul>
          
          <h4>Quản lý Cookie</h4>
          <p>Bạn có thể quản lý hoặc xóa cookie thông qua cài đặt trình duyệt. Tuy nhiên, việc tắt cookie có thể ảnh hưởng đến chức năng của website.</p>
          
          <h4>Cookie của bên thứ ba</h4>
          <p>Chúng tôi sử dụng các dịch vụ như Firebase, Google Maps có thể đặt cookie riêng. Vui lòng xem chính sách của họ.</p>
        </div>
      )
    }
  };

  const handleLinkClick = (key) => {
    setShowModal(key);
  };

  const closeModal = () => {
    setShowModal(null);
  };

  return (
    <>
      <footer className="footer-container">
        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-brand">
              <Sparkles className="footer-logo-icon" size={24} />
              <div>
                <h3 className="footer-title">Vietnam Travel</h3>
                <p className="footer-tagline">Khám phá vẻ đẹp Việt Nam</p>
              </div>
            </div>

            <div className="footer-links">
              <div className="footer-section">
                <h4>Về chúng tôi</h4>
                <ul>
                  <li onClick={() => handleLinkClick("about")}>Giới thiệu</li>
                  <li onClick={() => handleLinkClick("team")}>Đội ngũ</li>
                  <li onClick={() => handleLinkClick("contact")}>Liên hệ</li>
                </ul>
              </div>

              <div className="footer-section">
                <h4>Hỗ trợ</h4>
                <ul>
                  <li onClick={() => handleLinkClick("guide")}>Hướng dẫn</li>
                  <li onClick={() => handleLinkClick("faq")}>FAQ</li>
                  <li onClick={() => handleLinkClick("report")}>Báo lỗi</li>
                </ul>
              </div>

              <div className="footer-section">
                <h4>Pháp lý</h4>
                <ul>
                  <li onClick={() => handleLinkClick("terms")}>Điều khoản</li>
                  <li onClick={() => handleLinkClick("privacy")}>Chính sách bảo mật</li>
                  <li onClick={() => handleLinkClick("cookie")}>Cookie</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Build Info Section */}
          <div className="build-info-section">
            <div className="build-info-item">
              <Clock size={16} />
              <span>Build: {relativeTime || "Đang tải..."}</span>
            </div>
            {commitName && (
              <div className="build-info-item">
                <GitCommit size={16} />
                <span>{commitName}</span>
              </div>
            )}
            <div className="build-info-item">
              <MapPin size={16} />
              <span>Vị trí: {locationLoading ? "Đang tải..." : currentLocation}</span>
            </div>
            <div className="build-info-item build-env">
              <span>Production</span>
            </div>
          </div>

          <div className="footer-bottom">
            <p>
              © {new Date().getFullYear()} Vietnam Travel. Tất cả quyền được bảo lưu.
            </p>
            <p className="footer-team-credit">
              Phát triển bởi: {teamMembers.map(m => m.name).join(", ")}
            </p>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {showModal && modalContent[showModal] && (
        <div className="footer-modal-overlay" onClick={closeModal}>
          <div className="footer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="footer-modal-header">
              <h3>{modalContent[showModal].title}</h3>
              <button onClick={closeModal} className="footer-modal-close">
                <X size={24} />
              </button>
            </div>
            <div className="footer-modal-content">
              {modalContent[showModal].content}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;
