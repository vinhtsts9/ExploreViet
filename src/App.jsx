import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { MapPin, Loader2, Sparkles, PlusCircle, FileText, Map, CalendarDays } from "lucide-react";
import "./index.css";
import "./App.css";

// Components & Services
import Header from "./components/Header";
import PostCard from "./components/PostCard";
import Login from "./components/Login";
import AdminLogin from "./components/AdminLogin";
import CreatePost from "./components/CreatePost";
import EditPost from "./components/EditPost";
import PostDetail from "./components/PostDetail";
import Filter from "./components/Filter";
import Footer from "./components/Footer";
import LeftSidebar from "./components/LeftSidebar";
import RightSidebar from "./components/RightSidebar";
import QA from "./components/QA";
import WeatherForecast from "./components/WeatherForecast";
import WeatherForecastForLocation from "./components/WeatherForecastForLocation";
import TeamMemberDetail from "./components/TeamMemberDetail";
import FavoriteList from "./components/FavoriteList";
import ScrollToTop from "./components/ScrollToTop";
import AdminDashboard from "./components/AdminDashboard";
import { ItineraryPlanner } from "./components/ItineraryPlanner";
import { ItineraryListPage } from "./components/ItineraryListPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { auth, db } from "./services/firebase";
import {
  fetchGeminiSuggestion,
  generateRichPostContent,
} from "./services/gemini";
import { createPost, likePost, unlikePost, deletePost } from "./services/posts";
import { createOrUpdateUserDoc, isUserAdmin } from "./services/admin";
import { checkAdminStatus } from "./services/adminAuth";
import { apiPostAuth } from "./api";
import { createDemoPost } from "./utils/createDemoPost";

// Firebase
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

// Wrapper component for ItineraryPlanner to get itineraryId from URL
function ItineraryPlannerWrapper({ user, navigate }) {
  const { itineraryId } = useParams();
  console.log("ItineraryPlannerWrapper: itineraryId from useParams:", itineraryId);

  return (
    user ? (
      <ItineraryPlanner itineraryId={itineraryId} />
    ) : (
      <div className="main-content-wrapper">
        <div className="page-header">
          <h2>Bạn cần đăng nhập</h2>
          <p>Vui lòng đăng nhập để tạo lịch trình</p>
          <button
            onClick={() => navigate("/login")}
            className="create-first-post-button"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    )
  );
}

// Wrapper component for EditPost to get postId from URL
function EditPostWrapper({ posts, user, onUpdatePost, onCancelEdit, navigate }) {
  const { id } = useParams();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [checkingAdmin, setCheckingAdmin] = React.useState(true);
  const post = posts.find((p) => p && p.id === id);

  React.useEffect(() => {
    const checkAdmin = async () => {
      if (user?.uid) {
        const adminStatus = await checkAdminStatus(user.uid);
        setIsAdmin(adminStatus);
      }
      setCheckingAdmin(false);
    };
    checkAdmin();
  }, [user]);

  if (!post) {
    return (
      <div className="main-content-wrapper">
        <div className="page-header">
          <h2>Bài viết không tìm thấy</h2>
          <button onClick={() => navigate("/")} className="create-first-post-button">
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (checkingAdmin) {
    return (
      <div className="main-content-wrapper">
        <div className="page-header">
          <h2>Đang kiểm tra quyền...</h2>
        </div>
      </div>
    );
  }
  
  const isOwner = post.userId === user?.uid;
  if (!isOwner && !isAdmin) {
    return (
      <div className="main-content-wrapper">
        <div className="page-header">
          <h2>Bạn không có quyền chỉnh sửa bài viết này</h2>
          <button onClick={() => navigate(-1)} className="create-first-post-button">
            Quay lại
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <EditPost
      post={post}
      user={user}
      onUpdatePost={onUpdatePost}
      onCancel={onCancelEdit}
    />
  );
}

// Wrapper component for PostDetail to get postId from URL
function PostDetailWrapper({ posts, user, onLike, onPostClick, onDeletePost, onEditPost }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("🔍 PostDetailWrapper - ID từ URL:", id);
    console.log(
      "📋 Posts từ props:",
      Array.isArray(posts) ? posts.length : "không phải array"
    );

    if (!id) {
      console.error("❌ Không có ID bài viết");
      setError("Không có ID bài viết");
      setLoading(false);
      return;
    }

    // Reset state
    setPost(null);
    setLoading(true);
    setError(null);

    // Đợi posts load từ props trước
    const postsArray = Array.isArray(posts) ? posts : [];
    console.log("📋 Posts array length:", postsArray.length);

    // Tìm post trong danh sách
    const foundPost = postsArray.find((p) => p && p.id === id);
    console.log("🔎 Tìm thấy post trong array:", foundPost ? "CÓ" : "KHÔNG");

    if (foundPost) {
      console.log("✅ Sử dụng post từ props:", foundPost.id);
      setPost(foundPost);
      setLoading(false);
      setError(null);
      return;
    }

    // Nếu không tìm thấy trong posts, thử fetch trực tiếp từ Firebase
    const fetchPostFromFirebase = async () => {
      console.log("🌐 Fetching post từ Firebase với ID:", id);
      try {
        const postRef = doc(db, "posts", id);
        const postSnap = await getDoc(postRef);

        console.log("📄 Post snapshot exists:", postSnap.exists());

        if (postSnap.exists()) {
          const postData = {
            id: postSnap.id,
            ...postSnap.data(),
          };
          console.log(
            "✅ Đã fetch post từ Firebase:",
            postData.id,
            postData.title
          );
          setPost(postData);
          setError(null);
        } else {
          console.error("❌ Post không tồn tại trong Firebase");
          setError("not-found");
        }
      } catch (err) {
        console.error("❌ Error fetching post from Firebase:", err);
        setError("fetch-error");
      } finally {
        setLoading(false);
      }
    };

    // Đợi một chút để posts có thể load, sau đó fetch từ Firebase
    const timer = setTimeout(() => {
      console.log("⏰ Timeout - Fetching từ Firebase");
      fetchPostFromFirebase();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [id, posts]);

  // Loading state
  if (loading) {
    return (
      <div className="main-content-wrapper">
        <div className="page-header">
          <Loader2
            className="icon"
            size={32}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <p>Đang tải bài viết...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    console.log("❌ Error state:", error);
    return (
      <div className="main-content-wrapper">
        <div className="page-header">
          <h2>Bài viết không tìm thấy</h2>
          <p>Bài viết này có thể đã bị xóa hoặc không tồn tại.</p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#64748b",
              marginTop: "0.5rem",
            }}
          >
            ID: {id} | Error: {error}
          </p>
          <button
            onClick={() => navigate("/")}
            className="create-first-post-button"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Post not found
  if (!post) {
    console.log("❌ Post is null");
    return (
      <div className="main-content-wrapper">
        <div className="page-header">
          <h2>Bài viết không tìm thấy</h2>
          <p>Bài viết này có thể đã bị xóa hoặc không tồn tại.</p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#64748b",
              marginTop: "0.5rem",
            }}
          >
            ID: {id}
          </p>
          <button
            onClick={() => navigate("/")}
            className="create-first-post-button"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Render post
  console.log("✅ Rendering PostDetail với post:", post.id, post.title);
  return (
    <PostDetailErrorBoundary navigate={navigate}>
      <PostDetail
        post={post}
        onBack={() => navigate("/")}
        onLike={onLike}
        currentUserId={user?.uid}
        currentUser={user}
        posts={Array.isArray(posts) ? posts : []}
        onPostClick={onPostClick}
        onDelete={onDeletePost}
        onEdit={onEditPost}
      />
    </PostDetailErrorBoundary>
  );
}

// Error Boundary for PostDetail
class PostDetailErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("PostDetail Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="main-content-wrapper">
          <div className="page-header">
            <h2>Đã xảy ra lỗi</h2>
            <p>Không thể hiển thị bài viết. Vui lòng thử lại sau.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                const navigate =
                  this.props.navigate || (() => (window.location.href = "/"));
                navigate("/");
              }}
              className="create-first-post-button"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser: user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [filters, setFilters] = useState({
    province: "",
    category: "",
    sortBy: "newest",
    minRating: 0,
  });

  // --- 1. AUTH & DATA FETCHING ---
  useEffect(() => {
    let demoPostCreated = false;

    const unsubscribePosts = onSnapshot(
      collection(db, "posts"),
      async (snapshot) => {
        const fetchedPosts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Kiểm tra xem bài viết demo đã tồn tại chưa
        const hasDemoPost = fetchedPosts.some((p) => p && p.id === "demo-post");

        // Nếu chưa có bài viết demo và chưa tạo, tự động tạo
        if (!hasDemoPost && !demoPostCreated && !loading) {
          demoPostCreated = true;
          try {
            console.log("📝 Tự động tạo bài viết demo...");
            await createDemoPost();
            console.log("✅ Đã tạo bài viết demo thành công! ID: demo-post");
            console.log("🌐 Truy cập: /post/demo-post");
          } catch (error) {
            console.error("❌ Lỗi khi tạo bài viết demo:", error);
            demoPostCreated = false; // Reset để thử lại lần sau
          }
        }

        fetchedPosts.sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
        );

        setPosts(fetchedPosts);
        setLoading(false);
      }
    );

    // Expose createDemoPost to window for console access
    if (typeof window !== "undefined") {
      window.createDemoPost = createDemoPost;
    }

    return () => {
      unsubscribePosts();
    };
  }, []);

  // Auto return home after login
  useEffect(() => {
    if (user && location.pathname === "/login") {
      navigate("/");
    }
  }, [user, location.pathname, navigate]);

  // --- 2. LOGIC SEARCH + AI ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const q = searchQuery.toLowerCase();
    const hasResult = posts.some((p) => {
      const inLocation =
        p.location_lowercase?.includes(q) ||
        p.location?.toLowerCase().includes(q);
      const inTitle = p.title?.toLowerCase().includes(q);
      const inContent = (p.content || []).some(
        (c) => c.type === "text" && c.content?.toLowerCase().includes(q)
      );
      return inLocation || inTitle || inContent;
    });

    if (!hasResult) {
      setIsSearchingAi(true);
      console.log(
        "No results found for:",
        searchQuery,
        "- Generating rich AI content from backend"
      );

      // Use new rich content generator with multiple images and text blocks
      const richContent = await generateRichPostContent(searchQuery);
      console.log("AI rich content response:", richContent);

      if (
        richContent &&
        richContent.content &&
        richContent.content.length > 0
      ) {
        try {
          // Transform rich content to createPost format
          const aiContents = richContent.content
            .map((block) => {
              if (block.type === "text") {
                return {
                  type: "text",
                  value: block.content,
                };
              } else if (block.type === "image") {
                return {
                  type: "image",
                  value: block.url,
                  caption: block.caption || "",
                };
              }
              return null;
            })
            .filter(Boolean);

          if (aiContents.length === 0) {
            // Fallback to old method if rich content failed
            const aiContent = await fetchGeminiSuggestion(searchQuery);
            if (aiContent) {
              aiContents.push({ type: "text", value: aiContent.content });
            }
          }

          if (aiContents.length > 0) {
            const aiPostData = {
              title: richContent.title || searchQuery,
              location: richContent.location || searchQuery,
              contents: aiContents,
            };

            // Create with AI user identity
            const aiUser = {
              uid: "gemini_ai",
              displayName: "✨ AI Travel Guide",
              photoURL: null,
            };

            console.log("Creating rich AI post with data:", aiPostData);
            await createPost(aiPostData, "gemini_ai", aiUser, true);
            console.log("AI-generated rich post created successfully");
          }
        } catch (err) {
          console.error("Failed to create AI post:", err);
        }
      } else {
        console.log("AI returned no content for:", searchQuery);
      }
      setIsSearchingAi(false);
    }
  };

  const handlePostClick = (post) => {
    navigate(`/post/${post.id}`);
  };

  const handleDeletePost = async (postId) => {
    if (!user) {
      alert("Bạn cần đăng nhập để xóa bài viết");
      return;
    }

    const post = posts.find((p) => p && p.id === postId);
    if (!post) {
      alert("Không tìm thấy bài viết");
      return;
    }

    if (post.userId !== user.uid) {
      alert("Bạn không có quyền xóa bài viết này");
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) {
      return;
    }

    try {
      await deletePost(postId);
      alert("Đã xóa bài viết thành công!");
      // Nếu đang ở trang chi tiết, quay về trang chủ
      if (location.pathname.startsWith("/post/")) {
        navigate("/");
      }
    } catch (error) {
      console.error("Lỗi khi xóa bài viết:", error);
      alert("Xóa bài viết thất bại: " + error.message);
    }
  };

  // --- 3. ACTIONS ---
  const handleLike = async (postId) => {
    if (!user) return;
    try {
      const post = posts.find((p) => p.id === postId);
      const isLiked = post?.likedBy?.includes(user.uid);

      if (isLiked) {
        await unlikePost(postId, user.uid);
      } else {
        await likePost(postId, user.uid);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  // Filter and sort posts
  const getFilteredAndSortedPosts = () => {
    let filtered = [...posts];

    // Only show approved posts (unless user is admin or own user's posts)
    filtered = filtered.filter((p) => {
      // Show all posts for the post owner or admins
      if (p.userId === user?.uid) return true;
      // Show only approved posts for other users
      return p.status === "approved" || !p.status; // !p.status for backward compatibility
    });

    // Text search filter - chỉ match theo location và title
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        // Ưu tiên exact match với location (case-insensitive)
        const locationLower = (p.location_lowercase || p.location?.toLowerCase() || "").trim();
        const exactLocationMatch = locationLower === q || locationLower.startsWith(q + ",") || locationLower.startsWith(q + " ");
        const inLocation = exactLocationMatch || locationLower.includes(q);
        const inTitle = p.title?.toLowerCase().includes(q);
        return inLocation || inTitle;
      });
    }

    // Province filter
    if (filters.province) {
      filtered = filtered.filter((p) => {
        const locationParts = p.location?.split(",") || [];
        const province = locationParts[locationParts.length - 1]?.trim();
        return province === filters.province;
      });
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter((p) => p.category === filters.category);
    }

    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter((p) => (p.rating || 0) >= filters.minRating);
    }

    // Sort
    switch (filters.sortBy) {
      case "popular":
        filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "likes":
        filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case "newest":
      default:
        filtered.sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
        );
        break;
    }

    return filtered;
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    navigate(`/edit/${post.id}`);
  };

  const handleUpdatePost = async () => {
    setEditingPost(null);
    navigate(-1); // Quay lại trang trước
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    navigate(-1);
  };

  const handleCreatePost = async (postData) => {
    if (!user) {
      alert("Bạn cần đăng nhập để đăng bài!");
      return;
    }
    try {
      await createPost(postData, user.uid, user);
      alert("Đăng bài thành công!");
      navigate("/");
    } catch (error) {
      console.error("Lỗi khi tạo bài viết:", error);
      alert("Đăng bài thất bại: " + error.message);
      throw error;
    }
  };

  // Get current view from pathname
  const getCurrentView = () => {
    const path = location.pathname;
    if (path === "/") return "home";
    if (path.startsWith("/post/")) return "detail";
    if (path === "/create") return "create";
    if (path === "/my-posts") return "myPosts";
    if (path === "/qa") return "qa";
    if (path === "/weather-forecast") return "weatherForecast";
    if (path === "/login") return "login";
    return "home";
  };

  const currentView = getCurrentView();

  // --- RENDER ---
  return (
    <div className="app-container">
      <ScrollToTop />
      <Header
        searchQuery={searchQuery}
        user={user}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        currentView={currentView}
      />

      <Routes>
        {/* Home Page */}
        <Route
          path="/"
          element={
            <div className="main-layout">
              {/* Left Sidebar */}
              <LeftSidebar
                posts={posts}
                user={user}
                activeCategory={filters.category}
                onFilterClick={(filter) => {
                  if (typeof filter === "string") {
                    // Kiểm tra xem có phải là category hợp lệ không
                    const validCategories = ["beach", "mountain", "culture", "food", "adventure", "relax"];
                    if (validCategories.includes(filter)) {
                      setFilters((prev) => ({ ...prev, category: filter }));
                    } else {
                      // Nếu không phải category, thì đó là location - set vào searchQuery
                      setSearchQuery(filter);
                    }
                  } else {
                    setSearchQuery(filter);
                  }
                }}
                onTagClick={(tag) => {
                  setSearchQuery(tag);
                }}
              />

              {/* Main Content */}
              <div className="main-content-wrapper">
                {isSearchingAi && (
                  <div className="ai-searching-box">
                    <Sparkles className="icon" />
                    <h3>Gemini đang viết bài...</h3>
                    <p>Đang tạo nội dung du lịch cho "{searchQuery}"</p>
                  </div>
                )}

                <Filter onFilterChange={setFilters} posts={posts} />

                {loading ? (
                  <div className="loading-indicator">
                    <Loader2 className="icon" size={32} />
                  </div>
                ) : (
                  <div className="posts-grid">
                    {getFilteredAndSortedPosts().map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onLike={handleLike}
                        currentUserId={user?.uid}
                        currentUser={user}
                        onDelete={handleDeletePost}
                        onEdit={handleEditPost}
                        onClick={() => handlePostClick(post)}
                      />
                    ))}
                  </div>
                )}

                {!loading &&
                  getFilteredAndSortedPosts().length === 0 &&
                  !isSearchingAi && (
                    <div className="no-posts-message">
                      <MapPin size={48} className="icon" />
                      <p>Không tìm thấy bài viết nào.</p>
                    </div>
                  )}
              </div>

              {/* Right Sidebar */}
              <RightSidebar
                posts={posts}
                users={user}
                onPostClick={handlePostClick}
              />
            </div>
          }
        />

        {/* Post Detail Page */}
        <Route
          path="/post/:id"
          element={
            <PostDetailWrapper
              posts={posts}
              user={user}
              onLike={handleLike}
              onPostClick={handlePostClick}
              onDeletePost={handleDeletePost}
              onEditPost={handleEditPost}
            />
          }
        />

        {/* Edit Post Page */}
        <Route
          path="/edit/:id"
          element={
            user ? (
              <EditPostWrapper
                posts={posts}
                user={user}
                onUpdatePost={handleUpdatePost}
                onCancelEdit={handleCancelEdit}
                navigate={navigate}
              />
            ) : (
              <div className="main-content-wrapper">
                <div className="page-header">
                  <h2>Bạn cần đăng nhập</h2>
                  <button onClick={() => navigate("/login")} className="create-first-post-button">
                    Đăng nhập
                  </button>
                </div>
              </div>
            )
          }
        />

        {/* Create Post Page */}
        <Route
          path="/create"
          element={
            user ? (
              <CreatePost
                user={user}
                onCreatePost={handleCreatePost}
                onCancel={() => navigate("/")}
              />
            ) : (
              <div className="main-content-wrapper">
                <div className="page-header">
                  <h2>Bạn cần đăng nhập</h2>
                  <p>Vui lòng đăng nhập để tạo bài viết</p>
                  <button
                    onClick={() => navigate("/login")}
                    className="create-first-post-button"
                  >
                    Đăng nhập
                  </button>
                </div>
              </div>
            )
          }
        />

        {/* My Posts Page */}
        <Route
          path="/my-posts"
          element={
            user ? (
              <div className="main-content-wrapper">
                <div className="page-header">
                  <h2>Bài viết của tôi</h2>
                  <p>Quản lý và xem các bài viết bạn đã đăng</p>
                </div>

                {loading ? (
                  <div className="loading-indicator">
                    <Loader2 className="icon" size={32} />
                  </div>
                ) : (
                  <div className="posts-grid">
                    {posts
                      .filter((p) => p.userId === user.uid)
                      .map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          onLike={handleLike}
                          currentUserId={user?.uid}
                          currentUser={user}
                          onDelete={handleDeletePost}
                          onEdit={handleEditPost}
                          onClick={() => handlePostClick(post)}
                        />
                      ))}
                  </div>
                )}

                {!loading &&
                  posts.filter((p) => p.userId === user.uid).length === 0 && (
                    <div className="no-posts-message">
                      <FileText size={48} className="icon" />
                      <p>Bạn chưa có bài viết nào.</p>
                      <button
                        onClick={() => navigate("/create")}
                        className="create-first-post-button"
                      >
                        Tạo bài viết đầu tiên
                      </button>
                    </div>
                  )}
              </div>
            ) : (
              <div className="main-content-wrapper">
                <div className="page-header">
                  <h2>Bạn cần đăng nhập</h2>
                  <p>Vui lòng đăng nhập để xem bài viết của bạn</p>
                  <button
                    onClick={() => navigate("/login")}
                    className="create-first-post-button"
                  >
                    Đăng nhập
                  </button>
                </div>
              </div>
            )
          }
        />

        {/* Favorite List Page */}
        <Route
          path="/favorites"
          element={
            <FavoriteList
              user={user}
              authLoading={authLoading}
              posts={posts}
              onLike={handleLike}
              onPostClick={handlePostClick}
              onDeletePost={handleDeletePost}
            />
          }
        />

        {/* Q&A Page */}
        <Route
          path="/qa"
          element={<QA user={user} onBack={() => navigate("/")} />}
        />

        {/* Weather Forecast Page */}
        <Route
          path="/weather-forecast"
          element={<WeatherForecast onBack={() => navigate("/")} />}
        />

        {/* Weather Forecast for Specific Location */}
        <Route
          path="/weather/:locationName"
          element={<WeatherForecastForLocation />}
        />

        {/* Team Member Detail Page */}
        <Route path="/team/:memberId" element={<TeamMemberDetail />} />

        {/* Login Page */}
        <Route path="/login" element={<Login />} />

        {/* Admin Login Page */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={
            user ? (
              <AdminDashboard user={user} />
            ) : (
              <div className="main-content-wrapper">
                <div className="page-header">
                  <h2>Bạn cần đăng nhập</h2>
                  <p>Vui lòng đăng nhập để truy cập trang quản trị</p>
                  <button
                    onClick={() => navigate("/login")}
                    className="create-first-post-button"
                  >
                    Đăng nhập
                  </button>
                </div>
              </div>
            )
          }
        />
        {/* Itinerary Planner Page */}
        <Route
          path="/itinerary-planner/:itineraryId"
          element={<ItineraryPlannerWrapper user={user} navigate={navigate} />}
        />
        {/* My Itineraries Page */}
        <Route path="/my-itineraries" element={<ItineraryListPage />} />
      </Routes>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default AppContent;
