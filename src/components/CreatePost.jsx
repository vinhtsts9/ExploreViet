import React, { useState } from "react";
import {
  Image as ImageIcon,
  Type,
  Video,
  Youtube,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import "./CreatePost.css";
import imageCompression from "browser-image-compression";
import { uploadFileToBackend } from "../services/posts";

const CreatePost = ({ user, onCreatePost, onCancel }) => {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [blocks, setBlocks] = useState([{ type: "text", content: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingStates, setUploadingStates] = useState({});

  // Extract YouTube video ID from URL
  const extractYouTubeId = (url) => {
    if (!url) return null;
    
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  const addBlock = (type) => {
    if (type === "text") {
      setBlocks([...blocks, { type: "text", content: "" }]);
    } else if (type === "youtube") {
      setBlocks([...blocks, { type: "youtube", url: "", videoId: "", caption: "" }]);
    } else {
      setBlocks([...blocks, { type, url: "", caption: "" }]);
    }
  };

  const updateBlock = (index, newContent) => {
    const newBlocks = [...blocks];
    const current = newBlocks[index];

    if (current.type === "text" && newContent.content !== undefined) {
      current.content = newContent.content;
    } else if (current.type === "youtube") {
      if (newContent.url !== undefined) {
        current.url = newContent.url;
        // Auto-extract video ID when URL changes
        const videoId = extractYouTubeId(newContent.url);
        current.videoId = videoId || "";
      }
      if (newContent.caption !== undefined) {
        current.caption = newContent.caption;
      }
    } else if (
      (current.type === "image" || current.type === "video") &&
      newContent.url !== undefined
    ) {
      current.url = newContent.url;
    } else if (
      (current.type === "image" || current.type === "video") &&
      newContent.caption !== undefined
    ) {
      current.caption = newContent.caption;
    }

    setBlocks(newBlocks);
  };

  const removeBlock = (index) => {
    if (blocks.length <= 1) {
      alert("Bài viết phải có ít nhất một khối nội dung.");
      return;
    }
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index, direction) => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === blocks.length - 1)
    )
      return;

    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    [newBlocks[index], newBlocks[targetIndex]] = [
      newBlocks[targetIndex],
      newBlocks[index],
    ];
    setBlocks(newBlocks);
  };

  const uploadFileToBackendHelper = async (file) => {
    const downloadURL = await uploadFileToBackend(file);
    return downloadURL;
  };

  const handleFileChange = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileToProcess = file.type.startsWith("image/")
        ? await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          })
        : file;

      setUploadingStates((prev) => ({ ...prev, [index]: "uploading" }));

      const downloadURL = await uploadFileToBackendHelper(fileToProcess);

      updateBlock(index, { url: downloadURL });
      setUploadingStates((prev) => ({ ...prev, [index]: "done" }));
    } catch (err) {
      setUploadingStates((prev) => ({ ...prev, [index]: "error" }));
      alert("Upload thất bại.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !location) {
      alert("Vui lòng điền đầy đủ tiêu đề và địa điểm.");
      return;
    }

    const backendContents = blocks.map((block) => {
      if (block.type === "text") {
        return { type: "text", value: block.content };
      } else if (block.type === "youtube") {
        if (!block.url || !block.videoId) {
          throw new Error("Bạn phải nhập URL YouTube hợp lệ.");
        }
        return { 
          type: "youtube", 
          value: block.url, 
          videoId: block.videoId,
          caption: block.caption 
        };
      } else {
        if (!block.url) throw new Error("Bạn phải upload toàn bộ ảnh/video.");
        return { type: block.type, value: block.url, caption: block.caption };
      }
    });

    setIsSubmitting(true);
    try {
      await onCreatePost({ title, location, contents: backendContents });
    } catch (err) {
      alert("Đăng bài thất bại, thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-post-container">
      <form onSubmit={handleSubmit} className="create-post-form">
        <div className="form-header">
          <h2>Tạo bài viết mới</h2>
          <p>Chia sẻ trải nghiệm du lịch tuyệt vời của bạn!</p>
        </div>

        <div className="form-group">
          <label>Tiêu đề</label>
          <input
            type="text"
            placeholder="Ví dụ: Một ngày ở Hà Giang"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Địa điểm</label>
          <input
            type="text"
            placeholder="Ví dụ: Hà Giang"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>

        <div className="content-editor">
          <label>Nội dung bài viết</label>

          {blocks.map((block, index) => (
            <div key={index} className="content-block">
              <div className="block-content">
                {block.type === "text" && (
                  <textarea
                    rows={5}
                    placeholder="Kể về chuyến đi..."
                    value={block.content}
                    onChange={(e) =>
                      updateBlock(index, { content: e.target.value })
                    }
                  />
                )}

                {block.type === "youtube" && (
                  <>
                    {block.videoId && (
                      <div className="media-preview">
                        <div className="youtube-preview">
                          <iframe
                            width="100%"
                            height="315"
                            src={`https://www.youtube.com/embed/${block.videoId}`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ borderRadius: "8px" }}
                          />
                        </div>
                        <input
                          type="text"
                          className="caption-input"
                          placeholder="Thêm chú thích..."
                          value={block.caption || ""}
                          onChange={(e) =>
                            updateBlock(index, { caption: e.target.value })
                          }
                        />
                      </div>
                    )}

                    <div className="media-input">
                      <input
                        type="text"
                        className="youtube-url-input"
                        placeholder="Nhập URL YouTube (VD: https://www.youtube.com/watch?v=...)"
                        value={block.url || ""}
                        onChange={(e) => {
                          const url = e.target.value;
                          updateBlock(index, { url });
                        }}
                      />
                      {block.url && !block.videoId && (
                        <p className="error-message" style={{ color: "red", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                          URL YouTube không hợp lệ
                        </p>
                      )}
                    </div>
                  </>
                )}

                {(block.type === "image" || block.type === "video") && (
                  <>
                    {uploadingStates[index] === "uploading" && (
                      <div className="upload-indicator">
                        <Loader2 className="spinner" size={24} />
                        <span>Đang tải lên...</span>
                      </div>
                    )}

                    {block.url && uploadingStates[index] !== "uploading" && (
                      <div className="media-preview">
                        {block.type === "image" ? (
                          <img src={block.url} alt="Preview" />
                        ) : (
                          <video src={block.url} controls />
                        )}
                        <input
                          type="text"
                          className="caption-input"
                          placeholder="Thêm chú thích..."
                          value={block.caption || ""}
                          onChange={(e) =>
                            updateBlock(index, { caption: e.target.value })
                          }
                        />
                      </div>
                    )}

                    <div className="media-input">
                      <label
                        htmlFor={`file-${index}`}
                        className="file-upload-label"
                      >
                        {block.url ? "Thay đổi" : "Chọn"}{" "}
                        {block.type === "image" ? "ảnh" : "video"}
                      </label>
                      <input
                        id={`file-${index}`}
                        type="file"
                        accept={block.type === "image" ? "image/*" : "video/*"}
                        onChange={(e) => handleFileChange(e, index)}
                        className="file-upload-input"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="block-controls">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveBlock(index, "up")}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  disabled={index === blocks.length - 1}
                  onClick={() => moveBlock(index, "down")}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  className="delete-block-btn"
                  onClick={() => removeBlock(index)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="add-block-actions">
          <button type="button" onClick={() => addBlock("text")}>
            <Type size={16} /> Thêm văn bản
          </button>
          <button type="button" onClick={() => addBlock("image")}>
            <ImageIcon size={16} /> Thêm ảnh
          </button>
          <button type="button" onClick={() => addBlock("video")}>
            <Video size={16} /> Thêm video
          </button>
          <button type="button" onClick={() => addBlock("youtube")}>
            <Youtube size={16} /> Thêm YouTube
          </button>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={onCancel}>
            Hủy
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang đăng..." : "Đăng bài"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
