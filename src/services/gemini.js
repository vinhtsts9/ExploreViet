import { apiPostAuth } from "../api";

/**
 * Fetch basic AI suggestion (legacy - for backward compatibility)
 */
export const fetchGeminiSuggestion = async (locationName) => {
  try {
    console.log(`🔍 Fetching AI suggestion for: "${locationName}"`);

    // Use n8n webhook endpoint directly
    const apiUrl = import.meta.env.VITE_N8N_GEMINI_WEBHOOK_URL;

    const payload = {
      location: locationName,
    };

    console.log("📤 Sending request to backend ai-generate endpoint...");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log(`📊 API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();
    console.log("✅ Received response from backend");

    // Handle both array format (from N8N) and object format
    let responseData = data;

    if (Array.isArray(data) && data.length > 0) {
      // N8N returns array format: [{ content: "..." }]
      responseData = data[0];
    }

    if (!responseData || !responseData.content) {
      console.error("❌ Invalid response format:", data);
      return null;
    }

    // Process the content: replace \n with actual line breaks
    const processedContent = responseData.content.replace(/\\n/g, "\n").trim();

    const result = {
      location: locationName,
      content: processedContent,
    };

    console.log("✅ Successfully parsed AI-generated content");

    return result;
  } catch (error) {
    console.error("❌ Error in fetchGeminiSuggestion:", error.message);
    return null;
  }
};

/**
 * Generate rich post content with multiple images and text blocks
 * Format: text-image-text-image-text (2-3 images, 2-3 text blocks)
 */
export const generateRichPostContent = async (locationName) => {
  try {
    console.log(`🎨 Generating rich content for: "${locationName}"`);

    const apiUrl = import.meta.env.VITE_N8N_GEMINI_WEBHOOK_URL;

    // Enhanced prompt for rich content generation
    const payload = {
      location: locationName,
      format: "rich", // Flag để backend biết cần format đặc biệt
      prompt: `Tạo bài viết quảng bá du lịch về "${locationName}" với format sau:
- 1 đoạn văn giới thiệu ngắn gọn (2-3 câu)
- 1 URL ảnh đẹp về địa điểm (từ Unsplash hoặc nguồn uy tín)
- 1 đoạn văn nêu cảm nhận và điểm nổi bật (2-3 câu)
- 1 URL ảnh khác về địa điểm
- 1 đoạn văn kết luận và lời khuyên (2-3 câu)
- (Tùy chọn) 1 ảnh thứ 3 nếu có

Trả về JSON format:
{
  "title": "Tiêu đề hấp dẫn",
  "location": "${locationName}",
  "content": [
    {"type": "text", "content": "Đoạn văn 1"},
    {"type": "image", "url": "URL ảnh 1", "caption": "Mô tả ảnh"},
    {"type": "text", "content": "Đoạn văn 2"},
    {"type": "image", "url": "URL ảnh 2", "caption": "Mô tả ảnh"},
    {"type": "text", "content": "Đoạn văn 3"},
    {"type": "image", "url": "URL ảnh 3", "caption": "Mô tả ảnh"} // optional
  ]
}

Nội dung phải ngắn gọn, súc tích, quảng bá và nêu cảm nhận chân thực.`,
    };

    console.log("📤 Sending rich content request...");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();
    console.log("✅ Received rich content response");

    // Handle both array and object format
    let responseData = Array.isArray(data) && data.length > 0 ? data[0] : data;

    // If backend returns structured format
    if (responseData.content && Array.isArray(responseData.content)) {
      return {
        title: responseData.title || locationName,
        location: responseData.location || locationName,
        content: responseData.content,
      };
    }

    // Fallback: Parse text content and try to extract structure
    if (responseData.content) {
      return parseContentToRichFormat(responseData.content, locationName);
    }

    return null;
  } catch (error) {
    console.error("❌ Error in generateRichPostContent:", error.message);
    return null;
  }
};

/**
 * Fallback: Parse text content to rich format
 * Tries to extract images and text from unstructured content
 */
const parseContentToRichFormat = (content, locationName) => {
  // Try to find image URLs in content
  const imageUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;
  const images = content.match(imageUrlRegex) || [];

  // Split content by image URLs
  const parts = content.split(imageUrlRegex);
  const blocks = [];

  let imageIndex = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // Check if this part is an image URL
    if (imageUrlRegex.test(part)) {
      blocks.push({
        type: "image",
        url: part,
        caption: `${locationName} - Ảnh ${imageIndex + 1}`,
      });
      imageIndex++;
    } else if (part.trim().length > 20) {
      // Only add text blocks with meaningful content
      blocks.push({
        type: "text",
        content: part.trim(),
      });
    }
  }

  // If no images found, add placeholder images from Unsplash
  if (blocks.filter((b) => b.type === "image").length === 0) {
    // Insert images between text blocks
    const textBlocks = blocks.filter((b) => b.type === "text");
    const newBlocks = [];

    textBlocks.forEach((block, index) => {
      newBlocks.push(block);
      if (index < textBlocks.length - 1 && index < 2) {
        // Add max 2 images
        newBlocks.push({
          type: "image",
          url: `https://source.unsplash.com/800x600/?${encodeURIComponent(locationName)},vietnam,tourism`,
          caption: `${locationName}`,
        });
      }
    });

    return {
      title: locationName,
      location: locationName,
      content: newBlocks,
    };
  }

  return {
    title: locationName,
    location: locationName,
    content: blocks,
  };
};
