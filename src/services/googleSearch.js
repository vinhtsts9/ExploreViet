/**
 * Search Google and extract content from search results
 * Uses Gemini AI to process search results and create posts
 */

/**
 * Search Google and get content for a keyword
 * @param {string} keyword - The keyword to search
 * @returns {Promise<Array>} Array of post content extracted from search results
 */
export const searchGoogleAndExtractContent = async (keyword) => {
  try {
    console.log(`🔍 Searching Google for: "giới thiệu ${keyword}"`);

    const apiUrl = import.meta.env.VITE_N8N_GEMINI_WEBHOOK_URL;
    
    if (!apiUrl) {
      console.error("VITE_N8N_GEMINI_WEBHOOK_URL is not configured");
      throw new Error("API URL chưa được cấu hình. Vui lòng kiểm tra file .env");
    }

    console.log("Using API URL:", apiUrl);

    const searchQuery = `giới thiệu ${keyword}`;

    const payload = {
      action: "google_search",
      keyword: keyword,
      searchQuery: searchQuery,
      prompt: `Tôi muốn bạn tìm kiếm trên Google với từ khóa "${searchQuery}" và trích xuất nội dung từ các kết quả tìm kiếm để tạo bài viết quảng bá du lịch.

Yêu cầu:
1. Tìm kiếm trên Google với từ khóa "${searchQuery}"
2. Đọc và trích xuất nội dung từ 3-5 kết quả đầu tiên
3. Tổng hợp thông tin thành bài viết quảng bá du lịch về "${keyword}"
4. Bài viết phải có:
   - Tiêu đề hấp dẫn
   - 2-3 đoạn văn giới thiệu (mỗi đoạn 2-3 câu)
   - 2-3 URL ảnh đẹp về địa điểm (từ Unsplash hoặc nguồn uy tín)
   - Nội dung phải ngắn gọn, súc tích, quảng bá và nêu cảm nhận

Trả về JSON format:
{
  "title": "Tiêu đề bài viết",
  "location": "${keyword}",
  "content": [
    {"type": "text", "content": "Đoạn văn 1"},
    {"type": "image", "url": "URL ảnh 1", "caption": "Mô tả ảnh"},
    {"type": "text", "content": "Đoạn văn 2"},
    {"type": "image", "url": "URL ảnh 2", "caption": "Mô tả ảnh"},
    {"type": "text", "content": "Đoạn văn 3"},
    {"type": "image", "url": "URL ảnh 3", "caption": "Mô tả ảnh"} // optional
  ],
  "sources": ["URL nguồn 1", "URL nguồn 2", ...] // Các nguồn đã tham khảo
}

Lưu ý: Nội dung phải được viết lại, không copy nguyên văn từ nguồn.`,
    };

    let response;
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds

      response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      
      if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout')) {
        throw new Error("Request timeout. Vui lòng thử lại sau.");
      }
      
      if (fetchError.message.includes('Failed to fetch') || 
          fetchError.message.includes('NetworkError') ||
          fetchError.message.includes('Network request failed') ||
          fetchError.message.includes('CORS')) {
        throw new Error("Không thể kết nối đến server. Vui lòng:\n- Kiểm tra kết nối mạng\n- Kiểm tra cấu hình VITE_N8N_GEMINI_WEBHOOK_URL trong file .env\n- Đảm bảo server API đang hoạt động");
      }
      
      throw new Error(`Lỗi kết nối: ${fetchError.message}`);
    }

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = `HTTP ${response.status}`;
      }
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Received search results");

    // Handle both array and object format
    let responseData = Array.isArray(data) && data.length > 0 ? data[0] : data;

    // If backend returns structured format
    if (responseData.content && Array.isArray(responseData.content)) {
      return {
        title: responseData.title || keyword,
        location: responseData.location || keyword,
        content: responseData.content,
        sources: responseData.sources || [],
        keyword: keyword,
      };
    }

    // Fallback: try to parse text content
    if (responseData.content) {
      return parseContentToRichFormat(responseData.content, keyword, responseData.sources || []);
    }

    throw new Error("Invalid response format from API");
  } catch (error) {
    console.error("❌ Error in searchGoogleAndExtractContent:", error);
    throw error;
  }
};

/**
 * Parse text content to rich format
 */
const parseContentToRichFormat = (content, locationName, sources = []) => {
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
      sources: sources,
      keyword: locationName,
    };
  }

  return {
    title: locationName,
    location: locationName,
    content: blocks,
    sources: sources,
    keyword: locationName,
  };
};

