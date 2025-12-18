import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Edit2, Save, X, CheckCircle, ChevronUp, ChevronDown, Lock } from "lucide-react";
import { getTeamMemberContributions, updateTeamMemberContributions } from "../services/team";
import "./TeamMemberDetail.css";

const teamMembers = {
  "nguyen-quyen-anh": {
    id: "nguyen-quyen-anh",
    name: "Nguyễn Quyền Anh",
    role: "Thành viên phát triển",
    password: "662004"
  },
  "vu-the-vinh": {
    id: "vu-the-vinh",
    name: "Vũ Thế Vinh",
    role: "Thành viên phát triển",
    password: "12345"
  },
  "ha-duyen-thang": {
    id: "ha-duyen-thang",
    name: "Hà Duyên Thắng",
    role: "Thành viên phát triển",
    password: "12345"
  },
  "hoang-le-duy": {
    id: "hoang-le-duy",
    name: "Hoàng Lê Duy",
    role: "Thành viên phát triển",
    password: "12345"
  },
  "nguyen-quang-huy": {
    id: "nguyen-quang-huy",
    name: "Nguyễn Quang Huy",
    role: "Thành viên phát triển",
    password: "12345"
  }
};

const TeamMemberDetail = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [contributions, setContributions] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newContribution, setNewContribution] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const member = teamMembers[memberId];

  useEffect(() => {
    if (!member) {
      return;
    }

    const loadContributions = async () => {
      try {
        setLoading(true);
        const data = await getTeamMemberContributions(memberId);
        setContributions(data || []);
      } catch (error) {
        console.error("Error loading contributions:", error);
        setContributions([]);
      } finally {
        setLoading(false);
      }
    };

    loadContributions();
  }, [memberId, member]);

  const handleAddContribution = () => {
    if (!newContribution.trim()) return;
    
    const updated = [...contributions, {
      id: Date.now().toString(),
      text: newContribution.trim(),
      createdAt: new Date().toISOString()
    }];
    
    setContributions(updated);
    setNewContribution("");
  };

  const handleDeleteContribution = (id) => {
    const updated = contributions.filter(c => c.id !== id);
    setContributions(updated);
  };

  const handleStartEdit = (contribution) => {
    setEditingId(contribution.id);
    setEditingText(contribution.text);
  };

  const handleSaveEdit = (id) => {
    if (!editingText.trim()) return;
    
    const updated = contributions.map(c => 
      c.id === id ? { ...c, text: editingText.trim() } : c
    );
    setContributions(updated);
    setEditingId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...contributions];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setContributions(updated);
  };

  const handleMoveDown = (index) => {
    if (index === contributions.length - 1) return;
    const updated = [...contributions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setContributions(updated);
  };

  const handleDragStart = (e, index) => {
    if (!isEditing) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.outerHTML);
    e.target.style.opacity = "0.5";
  };

  const handleDragOver = (e, index) => {
    if (!isEditing || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    if (!isEditing || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    e.preventDefault();
    const updated = [...contributions];
    const draggedItem = updated[draggedIndex];
    
    // Remove dragged item
    updated.splice(draggedIndex, 1);
    
    // Insert at new position
    updated.splice(dropIndex, 0, draggedItem);
    
    setContributions(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = "1";
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateTeamMemberContributions(memberId, contributions);
      setIsEditing(false);
      alert("Đã lưu đóng góp thành công!");
    } catch (error) {
      console.error("Error saving contributions:", error);
      alert("Lỗi khi lưu đóng góp: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reload contributions
    const loadContributions = async () => {
      try {
        const data = await getTeamMemberContributions(memberId);
        setContributions(data || []);
      } catch (error) {
        console.error("Error loading contributions:", error);
      }
    };
    loadContributions();
  };

  const handleEditClick = () => {
    setShowPasswordModal(true);
    setPasswordInput("");
    setPasswordError("");
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const correctPassword = member?.password || "12345";
    
    if (passwordInput === correctPassword) {
      setShowPasswordModal(false);
      setIsEditing(true);
      setPasswordInput("");
      setPasswordError("");
    } else {
      setPasswordError("Mật khẩu không đúng. Vui lòng thử lại.");
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPasswordInput("");
    setPasswordError("");
  };

  if (!member) {
    return (
      <div className="team-member-detail-container">
        <div className="team-member-not-found">
          <h2>Không tìm thấy thành viên</h2>
          <button onClick={() => navigate("/")} className="back-button">
            <ArrowLeft size={20} />
            <span>Về trang chủ</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="team-member-detail-container">
      <div className="team-member-detail-header">
        <button onClick={() => navigate("/")} className="back-button">
          <ArrowLeft size={20} />
          <span>Quay lại</span>
        </button>
      </div>

      <div className="team-member-detail-content">
        <div className="member-profile-card">
          <div className="member-avatar">
            <Users size={48} />
          </div>
          <h1 className="member-name">{member.name}</h1>
          <p className="member-role">{member.role}</p>
        </div>

        <div className="contributions-section">
          <div className="contributions-header">
            <h2>Đóng góp cho dự án</h2>
            {!isEditing ? (
              <button 
                onClick={handleEditClick} 
                className="edit-button"
              >
                <Edit2 size={18} />
                <span>Chỉnh sửa</span>
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  onClick={handleSave} 
                  className="save-button"
                  disabled={saving}
                >
                  <Save size={18} />
                  <span>{saving ? "Đang lưu..." : "Lưu"}</span>
                </button>
                <button 
                  onClick={handleCancel} 
                  className="cancel-button"
                  disabled={saving}
                >
                  <X size={18} />
                  <span>Hủy</span>
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="loading-contributions">
              <p>Đang tải đóng góp...</p>
            </div>
          ) : (
            <>
              {isEditing && (
                <div className="add-contribution-form">
                  <input
                    type="text"
                    placeholder="Nhập công việc/đóng góp của bạn..."
                    value={newContribution}
                    onChange={(e) => setNewContribution(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddContribution();
                      }
                    }}
                    className="contribution-input"
                  />
                  <button 
                    onClick={handleAddContribution}
                    className="add-button"
                    disabled={!newContribution.trim()}
                  >
                    <CheckCircle size={18} />
                    <span>Thêm</span>
                  </button>
                </div>
              )}

              {contributions.length === 0 ? (
                <div className="no-contributions">
                  <p>Chưa có đóng góp nào được ghi nhận.</p>
                  {isEditing && (
                    <p className="hint">Sử dụng form phía trên để thêm đóng góp của bạn.</p>
                  )}
                </div>
              ) : (
                <ul className="contributions-list">
                  {contributions.map((contribution, index) => (
                    <li 
                      key={contribution.id} 
                      className={`contribution-item ${draggedIndex === index ? "dragging" : ""} ${dragOverIndex === index ? "drag-over" : ""}`}
                      draggable={isEditing}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      {editingId === contribution.id ? (
                        <div className="contribution-edit-form">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleSaveEdit(contribution.id);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                            className="contribution-edit-input"
                            autoFocus
                          />
                          <div className="contribution-edit-actions">
                            <button
                              onClick={() => handleSaveEdit(contribution.id)}
                              className="save-edit-button"
                              disabled={!editingText.trim()}
                              title="Lưu"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="cancel-edit-button"
                              title="Hủy"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="contribution-text">
                            <CheckCircle size={18} className="check-icon" />
                            <span>{contribution.text}</span>
                          </div>
                          {isEditing && (
                            <div className="contribution-actions">
                              <div className="drag-handle" title="Kéo để sắp xếp">
                                <ChevronUp size={12} />
                                <ChevronDown size={12} />
                              </div>
                              <button
                                onClick={() => handleStartEdit(contribution)}
                                className="edit-contribution-button"
                                title="Chỉnh sửa"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteContribution(contribution.id)}
                                className="delete-contribution-button"
                                title="Xóa"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="password-modal-overlay" onClick={handlePasswordCancel}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="password-modal-header">
              <Lock size={24} />
              <h3>Xác thực mật khẩu</h3>
            </div>
            <form onSubmit={handlePasswordSubmit} className="password-modal-form">
              <p className="password-modal-description">
                Vui lòng nhập mật khẩu để chỉnh sửa đóng góp của {member?.name}
              </p>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError("");
                }}
                placeholder="12345"
                className="password-input"
                autoFocus
              />
              {passwordError && (
                <p className="password-error">{passwordError}</p>
              )}
              <div className="password-modal-actions">
                <button type="button" onClick={handlePasswordCancel} className="password-cancel-button">
                  Hủy
                </button>
                <button type="submit" className="password-submit-button">
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMemberDetail;

