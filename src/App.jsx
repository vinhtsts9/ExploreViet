import { useState, useEffect } from "react";
import { MapPin, Loader2, Sparkles, PlusCircle } from "lucide-react";
import "./index.css";
import "./App.css";

// Components & Services
import Header from "./components/Header";
import PostCard from "./components/PostCard";
import Login from "./components/Login";
import CreatePost from "./components/CreatePost";
import PostDetail from "./components/PostDetail";
import { auth, db } from "./services/firebase";
import { fetchGeminiSuggestion } from "./services/gemini";
import { createPost, likePost } from "./services/posts";
import { apiPostAuth } from "./api";

// Firebase
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [view, setView] = useState("home"); // "home" | "create" | "detail" | "login"
  const [selectedPost, setSelectedPost] = useState(null);

  // --- 1. AUTH & DATA FETCHING ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, setUser);

    const unsubscribePosts = onSnapshot(collection(db, "posts"), (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      fetchedPosts.sort(
        (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
      );

      setPosts(fetchedPosts);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribePosts();
    };
  }, []);

  // Auto return home after login
  useEffect(() => {
    if (user && view === "login") {
      setView("home");
    }
  }, [user, view]);

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
        "- Fetching AI suggestion from backend"
      );
      const aiContent = await fetchGeminiSuggestion(searchQuery);
      console.log("AI response:", aiContent);

      if (aiContent) {
        try {
          // Backend returns { location, content }
          // Create AI-generated post using createPost service
          const aiContents = [{ type: "text", value: aiContent.content }];
          // Only include media block if backend provided one
          if (aiContent.mediaUrl) {
            aiContents.push({
              type: aiContent.mediaType || "image",
              value: aiContent.mediaUrl,
            });
          }

          const aiPostData = {
            title: aiContent.location || searchQuery, // Use location as title
            location: aiContent.location,
            contents: aiContents,
          };

          // Create with AI user identity
          const aiUser = {
            uid: "gemini_ai",
            displayName: "✨ AI Travel Guide",
            photoURL: null,
          };

          console.log("Creating AI post with data:", aiPostData);
          await createPost(aiPostData, "gemini_ai", aiUser, true);
          console.log("AI-generated post created successfully");
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
    setSelectedPost(post);
    setView("detail");
  };

  // --- 3. ACTIONS ---
  const handleLike = async (postId) => {
    if (!user) return;
    try {
      await likePost(postId, user.uid);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCreatePost = async (postData) => {
    if (!user) {
      alert("Bạn cần đăng nhập để đăng bài!");
      return;
    }
    try {
      await createPost(postData, user.uid, user);
      alert("Đăng bài thành công!");
      setView("home");
    } catch (error) {
      console.error("Lỗi khi tạo bài viết:", error);
      alert("Đăng bài thất bại: " + error.message);
      throw error;
    }
  };

  // --- RENDER ---
  return (
    <div className="app-container">
      <Header
        searchQuery={searchQuery}
        user={user}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        setView={setView}
      />

      {view === "login" && <Login />}
      {view === "detail" && (
        <PostDetail
          post={selectedPost}
          onBack={() => setView("home")}
          onLike={handleLike}
          currentUserId={user?.uid}
          currentUser={user}
        />
      )}

      {view === "create" && user && (
        <CreatePost
          user={user}
          onCreatePost={handleCreatePost}
          onCancel={() => setView("home")}
        />
      )}

      {view === "home" && (
        <div className="main-content-wrapper">
          {isSearchingAi && (
            <div className="ai-searching-box">
              <Sparkles className="icon" />
              <h3>Gemini đang viết bài...</h3>
              <p>Đang tạo nội dung du lịch cho "{searchQuery}"</p>
            </div>
          )}

          {loading ? (
            <div className="loading-indicator">
              <Loader2 className="icon" size={32} />
            </div>
          ) : (
            <div className="posts-grid">
              {posts
                .filter((p) => {
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  const inLocation = p.location_lowercase?.includes(q);
                  const inTitle = p.title?.toLowerCase().includes(q);
                  const inContent = (p.content || []).some(
                    (c) =>
                      c.type === "text" && c.content?.toLowerCase().includes(q)
                  );
                  return inLocation || inTitle || inContent;
                })
                .map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    currentUserId={user?.uid}
                    onClick={() => handlePostClick(post)}
                  />
                ))}
            </div>
          )}

          {!loading && posts.length === 0 && !isSearchingAi && (
            <div className="no-posts-message">
              <MapPin size={48} className="icon" />
              <p>Chưa có bài viết nào.</p>
            </div>
          )}
        </div>
      )}

      {user && view === "home" && (
        <button
          onClick={() => setView("create")}
          className="floating-add-button"
        >
          <PlusCircle size={28} />
        </button>
      )}
    </div>
  );
}
