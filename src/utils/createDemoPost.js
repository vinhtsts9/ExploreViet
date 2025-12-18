import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { geocodeLocation } from "../services/geocoding";

/**
 * Tạo bài viết demo với ID cụ thể "demo-post"
 * Có thể gọi từ console: window.createDemoPost()
 */
export const createDemoPost = async () => {
  try {
    // Kiểm tra xem bài viết đã tồn tại chưa
    const existingPost = await getDoc(doc(db, "posts", "demo-post"));
    if (existingPost.exists()) {
      console.log("⚠️ Bài viết demo đã tồn tại. Đang cập nhật...");
    }

    // Geocode Hà Nội để lấy coordinates
    let hanoiCoords;
    try {
      hanoiCoords = await geocodeLocation("Hà Nội");
    } catch (error) {
      console.warn("Không thể geocode Hà Nội, sử dụng coordinates mặc định");
      hanoiCoords = { latitude: 21.0285, longitude: 105.8542 };
    }
    
    const demoPost = {
      title: "Khám phá Hà Nội - Thủ đô nghìn năm văn hiến",
      location: "Hà Nội",
      location_lowercase: "hà nội",
      content: [
        {
          type: "text",
          content: "# Giới thiệu về Hà Nội\n\nHà Nội là thủ đô của Việt Nam, một thành phố có lịch sử hơn 1000 năm với nhiều di tích lịch sử và văn hóa đặc sắc.\n\n## Các địa điểm nổi tiếng\n\n### 1. Hồ Hoàn Kiếm\n\nHồ Hoàn Kiếm nằm ở trung tâm thành phố, là biểu tượng của Hà Nội. Xung quanh hồ có nhiều di tích lịch sử như Tháp Rùa, Đền Ngọc Sơn.\n\n### 2. Văn Miếu - Quốc Tử Giám\n\nVăn Miếu là trường đại học đầu tiên của Việt Nam, được xây dựng từ năm 1070. Đây là nơi thờ Khổng Tử và các bậc hiền tài.\n\n### 3. Phố cổ Hà Nội\n\nKhu phố cổ với 36 phố phường mang đậm nét văn hóa truyền thống, nơi bạn có thể tìm thấy nhiều món ăn đường phố đặc sắc.\n\n## Ẩm thực Hà Nội\n\nHà Nội nổi tiếng với nhiều món ăn đặc sắc như phở, bún chả, chả cá Lã Vọng, bánh mì, cà phê trứng...\n\n## Thời tiết\n\nHà Nội có 4 mùa rõ rệt: xuân, hạ, thu, đông. Mùa thu (tháng 9-11) là thời điểm đẹp nhất để tham quan.\n\n## Lời kết\n\nHà Nội là một thành phố đáng để khám phá với văn hóa lâu đời, ẩm thực phong phú và người dân thân thiện."
        },
        {
          type: "text",
          content: "## Mẹo du lịch Hà Nội\n\n- Nên đi bộ hoặc thuê xe máy để khám phá phố cổ\n- Thử các quán cà phê cổ điển như Cà phê Giảng, Cà phê Phố cổ\n- Tham quan các bảo tàng như Bảo tàng Lịch sử Việt Nam, Bảo tàng Dân tộc học\n- Mua sắm tại chợ Đồng Xuân hoặc các cửa hàng lưu niệm trên phố Hàng Gai"
        }
      ],
      userId: "demo-user",
      userName: "ExploreViet Demo",
      userPhotoURL: null,
      likes: 0,
      likedBy: [],
      commentCount: 0,
      isAiGenerated: false,
      rating: 4.5,
      ratingCount: 10,
      coordinates: hanoiCoords && hanoiCoords.latitude && hanoiCoords.longitude 
        ? [hanoiCoords.latitude, hanoiCoords.longitude]
        : [21.0285, 105.8542], // Default coordinates for Hà Nội
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Tạo hoặc cập nhật bài viết với ID cụ thể
    const postRef = doc(db, "posts", "demo-post");
    await setDoc(postRef, demoPost, { merge: true });

    console.log("✅ Đã tạo/cập nhật bài viết demo thành công!");
    console.log("📝 ID: demo-post");
    console.log("🌐 URL: /post/demo-post");
    return "demo-post";
  } catch (error) {
    console.error("❌ Lỗi khi tạo bài viết demo:", error);
    throw error;
  }
};

// Expose to window for console access
if (typeof window !== "undefined") {
  window.createDemoPost = createDemoPost;
}
