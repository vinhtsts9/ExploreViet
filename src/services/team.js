import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Get team member contributions
 * @param {string} memberId - Team member ID
 * @returns {Promise<Array>} Array of contributions
 */
export const getTeamMemberContributions = async (memberId) => {
  if (!memberId) {
    throw new Error("Member ID is required");
  }

  try {
    const docRef = doc(db, "teamMembers", memberId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.contributions || [];
    } else {
      // Return empty array if document doesn't exist
      return [];
    }
  } catch (error) {
    console.error("Error getting team member contributions:", error);
    throw error;
  }
};

/**
 * Update team member contributions
 * @param {string} memberId - Team member ID
 * @param {Array} contributions - Array of contribution objects
 * @returns {Promise<void>}
 */
export const updateTeamMemberContributions = async (memberId, contributions) => {
  if (!memberId) {
    throw new Error("Member ID is required");
  }

  if (!Array.isArray(contributions)) {
    throw new Error("Contributions must be an array");
  }

  try {
    const docRef = doc(db, "teamMembers", memberId);
    await setDoc(
      docRef,
      {
        contributions: contributions,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating team member contributions:", error);
    throw error;
  }
};


