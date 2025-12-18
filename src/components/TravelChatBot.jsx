import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import "./TravelChatBot.css";

const TravelChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Xin chào! Tôi là trợ lý du lịch của ExploreViet. Tôi có thể giúp bạn:\n\n• Tìm kiếm thông tin về địa điểm du lịch\n• Gợi ý lịch trình du lịch\n• Tư vấn về thời tiết, giao thông\n• Trả lời câu hỏi về du lịch Việt Nam\n\nBạn muốn biết gì hôm nay?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPuterReady, setIsPuterReady] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Check if Puter.js is loaded
  useEffect(() => {
    try {
      const checkPuter = () => {
        try {
          if (typeof window !== "undefined" && window.puter && window.puter.ai) {
            setIsPuterReady(true);
            return true;
          }
        } catch (e) {
          console.warn("Error checking Puter.js:", e);
        }
        return false;
      };

      // Check if already loaded
      if (checkPuter()) {
        return;
      }

      // Wait for script to load if it's in HTML
      const checkInterval = setInterval(() => {
        try {
          if (checkPuter()) {
            clearInterval(checkInterval);
          }
        } catch (e) {
          console.warn("Error in Puter check interval:", e);
        }
      }, 100);

      // If not in HTML, load it
      if (typeof window !== "undefined" && !window.puter) {
        try {
          const script = document.createElement("script");
          script.src = "https://js.puter.com/v2/";
          script.async = true;
          script.onerror = () => {
            console.warn("Failed to load Puter.js");
            clearInterval(checkInterval);
          };
          script.onload = () => {
            // Wait a bit for Puter to initialize
            setTimeout(() => {
              try {
                if (checkPuter()) {
                  clearInterval(checkInterval);
                }
              } catch (e) {
                console.warn("Error after Puter load:", e);
              }
            }, 500);
          };
          document.head.appendChild(script);
        } catch (e) {
          console.warn("Error loading Puter.js script:", e);
        }
      }

      // Cleanup
      return () => {
        try {
          clearInterval(checkInterval);
        } catch (e) {
          // Ignore cleanup errors
        }
      };
    } catch (error) {
      console.error("Error in Puter.js initialization:", error);
    }
  }, []);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Check if Puter.js is available
      if (typeof window === "undefined" || !window.puter || !window.puter.ai) {
        throw new Error("Puter.js chưa được tải. Vui lòng đợi vài giây rồi thử lại.");
      }

      // Create a travel-focused prompt
      const travelPrompt = `Bạn là trợ lý du lịch chuyên nghiệp cho website ExploreViet - một nền tảng quảng bá du lịch Việt Nam. 

Nhiệm vụ của bạn:
- Tư vấn về các địa điểm du lịch ở Việt Nam
- Gợi ý lịch trình, hoạt động, ẩm thực
- Cung cấp thông tin về thời tiết, giao thông, văn hóa
- Trả lời câu hỏi về du lịch một cách thân thiện và hữu ích

Câu hỏi của người dùng: ${userMessage.content}

Hãy trả lời một cách ngắn gọn, thân thiện và hữu ích. Nếu có thể, hãy đề xuất các địa điểm cụ thể ở Việt Nam.`;

      // Use Puter.js to get AI response
      let response;
      try {
        response = await window.puter.ai.chat(travelPrompt, {
          model: "gpt-5-nano", // Using free model
          temperature: 0.7,
          max_tokens: 500,
        });
        
        // Log response for debugging (only in development)
        if (process.env.NODE_ENV === "development") {
          console.log("Puter.js response:", response);
          console.log("Response type:", typeof response);
        }
      } catch (apiError) {
        // If the API call itself fails, throw it to be caught by outer catch
        console.error("Puter.js API error:", apiError);
        throw apiError;
      }

      // Handle different response formats
      let responseText = "";
      
      if (!response) {
        responseText = "Xin lỗi, tôi không thể trả lời câu hỏi này. Vui lòng thử lại sau.";
      } else if (typeof response === "string") {
        responseText = response.trim();
      } else if (typeof response === "object") {
        // Handle object response - check common properties
        if (response.text && typeof response.text === "string") {
          responseText = response.text.trim();
        } else if (response.message && typeof response.message === "string") {
          responseText = response.message.trim();
        } else if (response.content && typeof response.content === "string") {
          responseText = response.content.trim();
        } else if (response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
          // OpenAI-style response
          const firstChoice = response.choices[0];
          if (firstChoice.message && firstChoice.message.content && typeof firstChoice.message.content === "string") {
            responseText = firstChoice.message.content.trim();
          } else if (firstChoice.text && typeof firstChoice.text === "string") {
            responseText = firstChoice.text.trim();
          } else if (firstChoice.delta && firstChoice.delta.content && typeof firstChoice.delta.content === "string") {
            responseText = firstChoice.delta.content.trim();
          } else {
            responseText = "Xin lỗi, tôi không thể trả lời câu hỏi này. Vui lòng thử lại sau.";
          }
        } else if (response.data && typeof response.data === "string") {
          responseText = response.data.trim();
        } else if (response.result && typeof response.result === "string") {
          responseText = response.result.trim();
        } else {
          // Try to extract any string value from the object
          const stringValues = Object.values(response).filter(v => typeof v === "string" && v.trim().length > 0);
          if (stringValues.length > 0) {
            responseText = stringValues[0].trim();
          } else {
            // Check nested objects
            for (const key in response) {
              if (response[key] && typeof response[key] === "object") {
                const nestedString = Object.values(response[key]).find(v => typeof v === "string" && v.trim().length > 0);
                if (nestedString) {
                  responseText = String(nestedString).trim();
                  break;
                }
              }
            }
            
            // Last resort: show generic message
            if (!responseText) {
              responseText = "Xin lỗi, tôi không thể trả lời câu hỏi này. Vui lòng thử lại sau.";
            }
          }
        }
      } else {
        responseText = String(response).trim();
      }

      // Ensure responseText is not empty
      if (!responseText || responseText.trim() === "" || responseText === "[object Object]") {
        responseText = "Xin lỗi, tôi không thể trả lời câu hỏi này. Vui lòng thử lại sau.";
      }

      const assistantMessage = {
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      console.error("Error type:", typeof error);
      console.error("Error details:", {
        message: error?.message,
        error: error?.error,
        toString: error?.toString?.(),
        name: error?.name,
        stack: error?.stack,
      });
      
      // Better error message extraction
      let errorMsg = "Đã xảy ra lỗi khi kết nối với AI";
      
      try {
        if (error) {
          // Try to get error message from various properties
          if (typeof error === "string") {
            errorMsg = error;
          } else if (typeof error === "object") {
            // Check common error properties
            if (error.message && typeof error.message === "string" && error.message !== "[object Object]") {
              errorMsg = error.message;
            } else if (error.error && typeof error.error === "string" && error.error !== "[object Object]") {
              errorMsg = error.error;
            } else if (error.msg && typeof error.msg === "string" && error.msg !== "[object Object]") {
              errorMsg = error.msg;
            } else if (error.description && typeof error.description === "string" && error.description !== "[object Object]") {
              errorMsg = error.description;
            } else {
              // Try toString but check if it's valid
              try {
                const errorStr = error.toString();
                if (errorStr && errorStr !== "[object Object]" && errorStr !== "Error") {
                  errorMsg = errorStr;
                }
              } catch (e) {
                // toString failed, use default
              }
              
              // If still default, try to find any string property
              if (errorMsg === "Đã xảy ra lỗi khi kết nối với AI") {
                for (const key in error) {
                  if (typeof error[key] === "string" && error[key] !== "[object Object]" && error[key].trim().length > 0) {
                    errorMsg = error[key];
                    break;
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error extracting error message:", e);
        errorMsg = "Đã xảy ra lỗi khi kết nối với AI";
      }
      
      // Final validation - ensure errorMsg is a proper string
      if (!errorMsg || errorMsg.trim() === "" || errorMsg === "[object Object]" || errorMsg === "Error") {
        errorMsg = "Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại sau.";
      }
      
      // Limit error message length
      if (errorMsg.length > 200) {
        errorMsg = errorMsg.substring(0, 200) + "...";
      }
      
      const errorMessage = {
        role: "assistant",
        content: `Xin lỗi, ${errorMsg}. Vui lòng thử lại sau hoặc tải lại trang.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          className="chatbot-toggle-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Mở chatbot"
        >
          <MessageCircle size={24} />
          <span className="chatbot-badge">Hỗ trợ</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <Bot size={20} />
              <div>
                <h3>Trợ lý du lịch</h3>
                <p>ExploreViet Assistant</p>
              </div>
            </div>
            <button
              className="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng chatbot"
            >
              <X size={20} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chatbot-message ${message.role === "user" ? "user-message" : "assistant-message"}`}
              >
                <div className="message-avatar">
                  {message.role === "user" ? (
                    <User size={16} />
                  ) : (
                    <Bot size={16} />
                  )}
                </div>
                <div className="message-content">
                  <div className="message-text">
                    {message.content.split("\n").map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < message.content.split("\n").length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="message-time">{formatTime(message.timestamp)}</div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="chatbot-message assistant-message">
                <div className="message-avatar">
                  <Bot size={16} />
                </div>
                <div className="message-content">
                  <div className="message-text">
                    <Loader2 size={16} className="spinner" />
                    <span>Đang suy nghĩ...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="chatbot-input-form">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isPuterReady ? "Nhập câu hỏi về du lịch..." : "Đang tải trợ lý AI..."}
              className="chatbot-input"
              disabled={isLoading || !isPuterReady}
            />
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={isLoading || !input.trim() || !isPuterReady}
            >
              {isLoading ? (
                <Loader2 size={18} className="spinner" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default TravelChatBot;


