import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment,
  serverTimestamp,
  where,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { createNotification } from "./notifications";

/**
 * Create a new question
 */
export const createQuestion = async (questionData, userId, user) => {
  const { title, content, tags, location } = questionData;

  if (!title || !content) {
    throw new Error("Title and content are required");
  }

  const question = {
    title,
    content,
    tags: tags || [],
    location: location || null,
    userId,
    userName: user?.displayName || "Anonymous",
    userPhotoURL: user?.photoURL || null,
    answers: 0,
    views: 0,
    isSolved: false,
    isPinned: false,
    upvotes: 0,
    upvotedBy: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "questions"), question);
  return docRef.id;
};

/**
 * Add answer to a question
 */
export const addAnswer = async (questionId, answerData, userId, user) => {
  const { content } = answerData;

  if (!content) {
    throw new Error("Answer content is required");
  }

  const answer = {
    questionId,
    content,
    userId,
    userName: user?.displayName || "Anonymous",
    userPhotoURL: user?.photoURL || null,
    upvotes: 0,
    upvotedBy: [],
    isAccepted: false,
    createdAt: serverTimestamp(),
  };

  // Add answer to subcollection
  const answerRef = await addDoc(
    collection(db, "questions", questionId, "answers"),
    answer
  );

  // Update answer count
  const questionRef = doc(db, "questions", questionId);
  const questionSnap = await getDoc(questionRef);
  const questionData = questionSnap.exists() ? questionSnap.data() : null;
  
  await updateDoc(questionRef, {
    answers: increment(1),
    updatedAt: serverTimestamp(),
  });

  // Create notification for question owner (if not the same user)
  if (questionData && questionData.userId && questionData.userId !== userId) {
    try {
      const currentUser = auth.currentUser;
      const userName = currentUser?.displayName || user?.displayName || "Ai đó";
      
      await createNotification({
        userId: questionData.userId,
        type: "comment",
        title: "Có người trả lời câu hỏi của bạn",
        message: `${userName} đã trả lời câu hỏi "${questionData.title || "của bạn"}"`,
        link: `/qa`,
      });
    } catch (error) {
      console.error("❌ Error creating answer notification:", error);
      // Don't throw, notification is not critical
    }
  }

  return answerRef.id;
};

/**
 * Upvote/Downvote a question
 */
export const toggleQuestionUpvote = async (questionId, userId) => {
  // Simplified - in production, check if user already upvoted
  const questionRef = doc(db, "questions", questionId);
  await updateDoc(questionRef, {
    upvotes: increment(1),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Upvote/Downvote an answer
 */
export const toggleAnswerUpvote = async (questionId, answerId, userId) => {
  const answerRef = doc(db, "questions", questionId, "answers", answerId);
  await updateDoc(answerRef, {
    upvotes: increment(1),
  });
};

/**
 * Mark answer as accepted
 */
export const acceptAnswer = async (questionId, answerId, userId) => {
  // Get answer data first to find answer author
  const answerRef = doc(db, "questions", questionId, "answers", answerId);
  const answerSnap = await getDoc(answerRef);
  
  if (!answerSnap.exists()) {
    throw new Error("Answer not found");
  }

  const answerData = answerSnap.data();

  // First, unaccept any previously accepted answer
  const questionRef = doc(db, "questions", questionId);
  const questionSnap = await getDoc(questionRef);
  const questionData = questionSnap.exists() ? questionSnap.data() : null;
  
  await updateDoc(questionRef, {
    isSolved: true,
    updatedAt: serverTimestamp(),
  });

  // Mark this answer as accepted
  await updateDoc(answerRef, {
    isAccepted: true,
  });

  // Create notification for answer author (if not the same user)
  if (answerData && answerData.userId && answerData.userId !== userId) {
    try {
      const currentUser = auth.currentUser;
      const userName = currentUser?.displayName || "Ai đó";
      
      await createNotification({
        userId: answerData.userId,
        type: "info",
        title: "Câu trả lời của bạn được chấp nhận",
        message: `${userName} đã chấp nhận câu trả lời của bạn cho câu hỏi "${questionData?.title || ""}"`,
        link: `/qa`,
      });
    } catch (error) {
      console.error("❌ Error creating accept answer notification:", error);
      // Don't throw, notification is not critical
    }
  }
};

/**
 * Listen to questions
 */
export const listenQuestions = (callback, filters = {}) => {
  try {
    let q;
    const conditions = [];

    // Build query conditions
    if (filters.location) {
      conditions.push(where("location", "==", filters.location));
    }
    if (filters.solved !== undefined) {
      conditions.push(where("isSolved", "==", filters.solved));
    }

    // Add orderBy
    conditions.push(orderBy("isPinned", "desc"));
    conditions.push(orderBy("createdAt", "desc"));

    q = query(collection(db, "questions"), ...conditions);

    return onSnapshot(q,
      (snapshot) => {
        const questions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(questions);
      },
      (error) => {
        console.error("Error listening to questions:", error);
        // Fallback: get all questions without orderBy if index missing
        if (error.code === 'failed-precondition') {
          const fallbackQ = query(collection(db, "questions"));
          return onSnapshot(fallbackQ, (snapshot) => {
            const questions = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            // Filter and sort manually
            let filtered = questions;
            if (filters.location) {
              filtered = filtered.filter(q => q.location === filters.location);
            }
            if (filters.solved !== undefined) {
              filtered = filtered.filter(q => q.isSolved === filters.solved);
            }
            filtered.sort((a, b) => {
              if (a.isPinned !== b.isPinned) return b.isPinned - a.isPinned;
              const aTime = a.createdAt?.seconds || 0;
              const bTime = b.createdAt?.seconds || 0;
              return bTime - aTime;
            });
            callback(filtered);
          });
        }
        callback([]);
      }
    );
  } catch (error) {
    console.error("Error setting up questions listener:", error);
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * Listen to answers for a question
 */
export const listenAnswers = (questionId, callback) => {
  try {
    const q = query(
      collection(db, "questions", questionId, "answers"),
      orderBy("isAccepted", "desc"),
      orderBy("upvotes", "desc"),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q,
      (snapshot) => {
        const answers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(answers);
      },
      (error) => {
        console.error("Error listening to answers:", error);
        // Fallback: get answers without orderBy
        if (error.code === 'failed-precondition') {
          const fallbackQ = query(collection(db, "questions", questionId, "answers"));
          return onSnapshot(fallbackQ, (snapshot) => {
            const answers = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            // Sort manually
            answers.sort((a, b) => {
              if (a.isAccepted !== b.isAccepted) return b.isAccepted - a.isAccepted;
              if (a.upvotes !== b.upvotes) return (b.upvotes || 0) - (a.upvotes || 0);
              const aTime = a.createdAt?.seconds || 0;
              const bTime = b.createdAt?.seconds || 0;
              return aTime - bTime;
            });
            callback(answers);
          });
        }
        callback([]);
      }
    );
  } catch (error) {
    console.error("Error setting up answers listener:", error);
    callback([]);
    return () => {};
  }
};

/**
 * Increment view count
 */
export const incrementQuestionViews = async (questionId) => {
  const questionRef = doc(db, "questions", questionId);
  await updateDoc(questionRef, {
    views: increment(1),
  });
};

/**
 * Delete a question
 * @param {string} questionId - Question ID
 * @returns {Promise<void>}
 */
export const deleteQuestion = async (questionId) => {
  if (!questionId) {
    throw new Error("Question ID is required");
  }

  const questionRef = doc(db, "questions", questionId);
  await deleteDoc(questionRef);
};

