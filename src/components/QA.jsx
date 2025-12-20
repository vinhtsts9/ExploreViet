import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  HelpCircle, 
  Plus, 
  CheckCircle, 
  ThumbsUp, 
  Eye, 
  User,
  Search,
  MapPin,
  Tag,
  MoreVertical,
  Trash2
} from "lucide-react";
import { createQuestion, listenQuestions, addAnswer, acceptAnswer, incrementQuestionViews, toggleQuestionUpvote, toggleAnswerUpvote, listenAnswers, deleteQuestion } from "../services/qa";
import { checkAdminStatus } from "../services/adminAuth";
import "./QA.css";

const formatTimeAgo = (date) => {
  if (!date) return "Mới đây";
  let postDate;
  if (date && typeof date.toDate === "function") {
    postDate = date.toDate();
  } else if (date && date.seconds) {
    postDate = new Date(date.seconds * 1000);
  } else {
    postDate = new Date(date);
  }
  const now = new Date();
  const diffInDays = Math.abs(now.getTime() - postDate.getTime()) / (1000 * 3600 * 24);
  if (diffInDays < 1) return `${Math.round(diffInDays * 24)} giờ trước`;
  if (diffInDays < 7) return `${Math.round(diffInDays)} ngày trước`;
  return postDate.toLocaleDateString("vi-VN");
};

const QA = ({ user, onBack }) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSolved, setFilterSolved] = useState(null);
  const [showMenu, setShowMenu] = useState(null); // questionId or null
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!selectedQuestion) {
      setAnswers([]);
      return;
    }

    let unsub;
    try {
      unsub = listenAnswers(selectedQuestion.id, (items) => {
        setAnswers(items || []);
      });

      // Increment views
      incrementQuestionViews(selectedQuestion.id).catch(err => {
        console.error("Error incrementing views:", err);
      });
    } catch (error) {
      console.error("Error setting up answers listener:", error);
      setAnswers([]);
    }

    return () => {
      if (unsub && typeof unsub === 'function') {
        unsub();
      }
    };
  }, [selectedQuestion]);

  useEffect(() => {
    setLoading(true);
    const filters = filterSolved !== null ? { solved: filterSolved } : {};
    
    let unsub;
    try {
      unsub = listenQuestions((items) => {
        setQuestions(items || []);
        setLoading(false);
      }, filters);
    } catch (error) {
      console.error("Error setting up questions listener:", error);
      setQuestions([]);
      setLoading(false);
    }

    return () => {
      if (unsub && typeof unsub === 'function') {
        unsub();
      }
    };
  }, [filterSolved]);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (user?.uid) {
        const adminStatus = await checkAdminStatus(user.uid);
        setIsAdmin(adminStatus);
      }
    };
    checkAdmin();
  }, [user]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any menu container
      const menuContainers = document.querySelectorAll('.qa-menu-container');
      let isOutside = true;
      menuContainers.forEach(container => {
        if (container.contains(event.target)) {
          isOutside = false;
        }
      });
      
      if (isOutside) {
        setShowMenu(null);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Bạn cần đăng nhập để đặt câu hỏi");
      return;
    }

    const formData = new FormData(e.target);
    const title = formData.get("title");
    const content = formData.get("content");
    const location = formData.get("location");

    try {
      await createQuestion(
        {
          title,
          content,
          location: location || null,
          tags: [],
        },
        user.uid,
        user
      );
      setShowCreateForm(false);
      e.target.reset();
      alert("Đặt câu hỏi thành công!");
    } catch (error) {
      console.error("Error creating question:", error);
      alert("Lỗi: " + error.message);
    }
  };

  const handleAddAnswer = async (e) => {
    e.preventDefault();
    if (!user || !selectedQuestion) return;

    const formData = new FormData(e.target);
    const content = formData.get("answer");

    try {
      await addAnswer(selectedQuestion.id, { content }, user.uid, user);
      e.target.reset();
    } catch (error) {
      console.error("Error adding answer:", error);
      alert("Lỗi: " + error.message);
    }
  };

  const handleAcceptAnswer = async (answerId) => {
    if (!user || !selectedQuestion) return;
    if (selectedQuestion.userId !== user.uid) {
      alert("Chỉ người đặt câu hỏi mới có thể chấp nhận câu trả lời");
      return;
    }

    try {
      await acceptAnswer(selectedQuestion.id, answerId, user.uid);
    } catch (error) {
      console.error("Error accepting answer:", error);
      alert("Lỗi: " + error.message);
    }
  };

  const handleQuestionUpvote = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert("Bạn cần đăng nhập để upvote");
      return;
    }
    if (!selectedQuestion) return;

    try {
      await toggleQuestionUpvote(selectedQuestion.id, user.uid);
    } catch (error) {
      console.error("Error upvoting question:", error);
      alert("Lỗi: " + error.message);
    }
  };

  const handleAnswerUpvote = async (e, answerId) => {
    e.stopPropagation();
    if (!user) {
      alert("Bạn cần đăng nhập để upvote");
      return;
    }
    if (!selectedQuestion) return;

    try {
      await toggleAnswerUpvote(selectedQuestion.id, answerId, user.uid);
    } catch (error) {
      console.error("Error upvoting answer:", error);
      alert("Lỗi: " + error.message);
    }
  };

  const handleDeleteQuestion = async (e, questionId) => {
    e.stopPropagation();
    setShowMenu(null);
    
    if (!user) {
      alert("Bạn cần đăng nhập để xóa câu hỏi");
      return;
    }

    const question = questions.find((q) => q.id === questionId);
    if (!question) {
      alert("Không tìm thấy câu hỏi");
      return;
    }

    const isOwner = question.userId === user.uid;
    if (!isOwner && !isAdmin) {
      alert("Bạn không có quyền xóa câu hỏi này");
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) {
      return;
    }

    try {
      await deleteQuestion(questionId);
      alert("Đã xóa câu hỏi thành công!");
      // If viewing the deleted question, go back to list
      if (selectedQuestion && selectedQuestion.id === questionId) {
        setSelectedQuestion(null);
      }
    } catch (error) {
      console.error("Lỗi khi xóa câu hỏi:", error);
      alert("Xóa câu hỏi thất bại: " + error.message);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = !searchQuery || 
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (selectedQuestion) {
    return (
      <div className="qa-container">
        <div className="qa-header">
          <button onClick={() => setSelectedQuestion(null)} className="back-btn">
            ← Quay lại
          </button>
          <h2>Hỏi & Đáp</h2>
        </div>

        <div className="qa-question-detail">
          <div className="qa-question-header">
            <div className="qa-question-meta">
              {selectedQuestion.userPhotoURL ? (
                <img src={selectedQuestion.userPhotoURL} alt={selectedQuestion.userName} className="qa-user-avatar" />
              ) : (
                <div className="qa-user-avatar qa-user-avatar-placeholder">
                  <User size={16} />
                </div>
              )}
              <div>
                <div className="qa-user-name">{selectedQuestion.userName}</div>
                <div className="qa-question-date">{formatTimeAgo(selectedQuestion.createdAt)}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {selectedQuestion.isSolved && (
                <div className="qa-solved-badge">
                  <CheckCircle size={16} />
                  <span>Đã giải quyết</span>
                </div>
              )}
              {(selectedQuestion.userId === user?.uid || isAdmin) && (
                <div className="qa-menu-container">
                  <button
                    className="qa-menu-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(showMenu === selectedQuestion.id ? null : selectedQuestion.id);
                    }}
                    title="Tùy chọn"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {showMenu === selectedQuestion.id && (
                    <div className="qa-menu-dropdown">
                      <button
                        className="qa-menu-item delete-item"
                        onClick={(e) => handleDeleteQuestion(e, selectedQuestion.id)}
                      >
                        <Trash2 size={16} />
                        <span>Xóa câu hỏi</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <h1 className="qa-question-title">{selectedQuestion.title}</h1>
          {selectedQuestion.location && (
            <div className="qa-question-location">
              <MapPin size={14} />
              <span>{selectedQuestion.location}</span>
            </div>
          )}
          <div className="qa-question-content">{selectedQuestion.content}</div>

          <div className="qa-question-stats">
            <span><Eye size={14} /> {selectedQuestion.views || 0} lượt xem</span>
            <span><HelpCircle size={14} /> {answers.length} câu trả lời</span>
            <button 
              onClick={handleQuestionUpvote}
              className="qa-upvote-btn"
              title="Upvote câu hỏi"
            >
              <ThumbsUp size={14} />
              <span>{selectedQuestion.upvotes || 0} upvote</span>
            </button>
          </div>

          <div className="qa-answers-section">
            <h3>Câu trả lời ({answers.length})</h3>
            {user && (
              <form onSubmit={handleAddAnswer} className="qa-answer-form">
                <textarea
                  name="answer"
                  placeholder="Viết câu trả lời của bạn..."
                  required
                  rows="4"
                />
                <button type="submit" className="qa-answer-submit">Gửi câu trả lời</button>
              </form>
            )}

            <div className="qa-answers-list">
              {answers.map((answer) => (
                <div key={answer.id} className={`qa-answer-item ${answer.isAccepted ? "accepted" : ""}`}>
                  <div className="qa-answer-header">
                    <div className="qa-answer-meta">
                      {answer.userPhotoURL ? (
                        <img src={answer.userPhotoURL} alt={answer.userName} className="qa-user-avatar-small" />
                      ) : (
                        <div className="qa-user-avatar-small qa-user-avatar-placeholder">
                          <User size={12} />
                        </div>
                      )}
                      <div>
                        <div className="qa-user-name-small">{answer.userName}</div>
                        <div className="qa-answer-date">{formatTimeAgo(answer.createdAt)}</div>
                      </div>
                    </div>
                    {answer.isAccepted && (
                      <div className="qa-accepted-badge">
                        <CheckCircle size={16} />
                        <span>Câu trả lời được chấp nhận</span>
                      </div>
                    )}
                  </div>
                  <div className="qa-answer-content">{answer.content}</div>
                  <div className="qa-answer-footer">
                    <button 
                      onClick={(e) => handleAnswerUpvote(e, answer.id)}
                      className="qa-upvote-btn"
                      title="Upvote câu trả lời"
                    >
                      <ThumbsUp size={14} />
                      <span>{answer.upvotes || 0}</span>
                    </button>
                    {user && selectedQuestion.userId === user.uid && !selectedQuestion.isSolved && !answer.isAccepted && (
                      <button 
                        onClick={() => handleAcceptAnswer(answer.id)}
                        className="qa-accept-btn"
                      >
                        <CheckCircle size={14} />
                        <span>Chấp nhận</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qa-container">
      <div className="qa-header">
        <button onClick={() => onBack ? onBack() : navigate("/")} className="back-btn">← Quay lại</button>
        <h2>Hỏi & Đáp Du lịch</h2>
        {user && (
          <button onClick={() => setShowCreateForm(true)} className="create-question-btn">
            <Plus size={18} />
            <span>Đặt câu hỏi</span>
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="qa-modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="qa-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Đặt câu hỏi mới</h3>
            <form onSubmit={handleCreateQuestion}>
              <input
                type="text"
                name="title"
                placeholder="Tiêu đề câu hỏi..."
                required
                className="qa-input"
              />
              <input
                type="text"
                name="location"
                placeholder="Địa điểm (tùy chọn)..."
                className="qa-input"
              />
              <textarea
                name="content"
                placeholder="Mô tả chi tiết câu hỏi của bạn..."
                required
                rows="8"
                className="qa-textarea"
              />
              <div className="qa-modal-actions">
                <button type="button" onClick={() => setShowCreateForm(false)} className="cancel-btn">
                  Hủy
                </button>
                <button type="submit" className="submit-btn">Đặt câu hỏi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="qa-filters">
        <div className="qa-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm câu hỏi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="qa-filter-buttons">
          <button
            onClick={() => setFilterSolved(null)}
            className={`filter-btn ${filterSolved === null ? "active" : ""}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterSolved(false)}
            className={`filter-btn ${filterSolved === false ? "active" : ""}`}
          >
            Chưa giải quyết
          </button>
          <button
            onClick={() => setFilterSolved(true)}
            className={`filter-btn ${filterSolved === true ? "active" : ""}`}
          >
            Đã giải quyết
          </button>
        </div>
      </div>

      {loading ? (
        <div className="qa-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải câu hỏi...</p>
        </div>
      ) : (
        <div className="qa-questions-list">
          {filteredQuestions.length === 0 ? (
            <div className="qa-empty">
              <HelpCircle size={48} className="empty-icon" />
              <h3>Chưa có câu hỏi nào</h3>
              <p>Hãy là người đầu tiên đặt câu hỏi trong cộng đồng!</p>
              {user && (
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="create-first-question-btn"
                >
                  <Plus size={18} />
                  <span>Đặt câu hỏi đầu tiên</span>
                </button>
              )}
            </div>
          ) : (
            filteredQuestions.map((question) => {
              const isOwner = question.userId === user?.uid;
              const canEdit = isOwner || isAdmin;
              
              return (
                <div
                  key={question.id}
                  className="qa-question-card"
                  onClick={() => setSelectedQuestion(question)}
                >
                  <div className="qa-question-card-header">
                    <div className="qa-question-card-meta">
                      {question.userPhotoURL ? (
                        <img src={question.userPhotoURL} alt={question.userName} className="qa-user-avatar-small" />
                      ) : (
                        <div className="qa-user-avatar-small qa-user-avatar-placeholder">
                          <User size={12} />
                        </div>
                      )}
                      <div>
                        <div className="qa-user-name-small">{question.userName}</div>
                        <div className="qa-question-date-small">{formatTimeAgo(question.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {question.isSolved && (
                        <div className="qa-solved-badge-small">
                          <CheckCircle size={14} />
                          <span>Đã giải quyết</span>
                        </div>
                      )}
                      {canEdit && (
                        <div className="qa-menu-container">
                          <button
                            className="qa-menu-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(showMenu === question.id ? null : question.id);
                            }}
                            title="Tùy chọn"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {showMenu === question.id && (
                            <div className="qa-menu-dropdown">
                              <button
                                className="qa-menu-item delete-item"
                                onClick={(e) => handleDeleteQuestion(e, question.id)}
                              >
                                <Trash2 size={16} />
                                <span>Xóa câu hỏi</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                <h3 className="qa-question-card-title">{question.title}</h3>
                {question.location && (
                  <div className="qa-question-card-location">
                    <MapPin size={12} />
                    <span>{question.location}</span>
                  </div>
                )}
                <p className="qa-question-card-content">{question.content.substring(0, 150)}...</p>
                <div className="qa-question-card-footer">
                  <span><Eye size={12} /> {question.views || 0}</span>
                  <span><HelpCircle size={12} /> {question.answers || 0}</span>
                  <span><ThumbsUp size={12} /> {question.upvotes || 0}</span>
                </div>
              </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default QA;

