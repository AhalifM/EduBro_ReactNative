import { auth, db } from '../firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

// Register a new user
export const registerUser = async (email, password, fullName, role, additionalData = {}) => {
  try {
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, {
      displayName: fullName
    });
    
    // Base user data
    const userData = {
      email,
      fullName,
      role,
      createdAt: new Date().toISOString(),
      photoURL: null,
      bio: additionalData.bio || '',
    };
    
    // Add role-specific fields
    if (role === 'tutor') {
      userData.phoneNumber = additionalData.phoneNumber || '';
      userData.subjects = additionalData.subjects || [];
      userData.hourlyRate = additionalData.hourlyRate || 0;
      userData.isVerified = false; // Tutors need admin verification
      userData.rating = 0; // Initial rating
      userData.totalReviews = 0;
    } else if (role === 'admin') {
      userData.isAdmin = true;
      userData.adminPrivileges = additionalData.adminPrivileges || ['users', 'tutors', 'issues', 'subjects'];
    }
    
    // Save user data in Firestore
    await setDoc(doc(db, 'users', user.uid), userData);
    
    // If registering as tutor, create application
    if (role === 'tutor') {
      await setDoc(doc(db, 'tutorApplications', user.uid), {
        userId: user.uid,
        fullName,
        email,
        phoneNumber: additionalData.phoneNumber || '',
        status: 'pending',
        subjects: additionalData.subjects || [],
        experience: additionalData.experience || '',
        education: additionalData.education || '',
        hourlyRate: additionalData.hourlyRate || 0,
        createdAt: new Date().toISOString(),
      });
    }
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Login user
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      return { success: true, user: { uid: user.uid, ...userDoc.data() } };
    } else {
      return { success: false, error: 'User data not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get current user data
export const getCurrentUser = async () => {
  const user = auth.currentUser;
  
  if (!user) return null;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return { uid: user.uid, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update user profile
export const updateUserProfile = async (userId, data) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    
    // Update Firebase Auth profile if we have auth-related fields
    if (auth.currentUser) {
      const authUpdateData = {};
      
      if (data.fullName) {
        authUpdateData.displayName = data.fullName;
      }
      
      if (data.photoURL) {
        authUpdateData.photoURL = data.photoURL;
      }
      
      // Only update if we have fields to update
      if (Object.keys(authUpdateData).length > 0) {
        await updateProfile(auth.currentUser, authUpdateData);
      }
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Apply to be a tutor
export const applyForTutor = async (userId, applicationData) => {
  try {
    // Create or update application
    await setDoc(doc(db, 'tutorApplications', userId), {
      userId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...applicationData
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Check if user exists by email
export const checkUserExists = async (email) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return false;
  }
};

/**
 * Validates if a string is a valid image URL
 * @param {string} url - The URL to validate
 * @returns {boolean} Whether the URL is valid
 */
export const isValidImageUrl = (url) => {
  try {
    return url && (
      url.startsWith('http://') || 
      url.startsWith('https://') || 
      url.startsWith('data:image/')
    );
  } catch (e) {
    return false;
  }
};

/**
 * Gets the appropriate profile image source
 * @param {Object} user - User object with photoURL
 * @param {boolean} hasError - Whether there was an error loading the image
 * @returns {Object} Image source object for React Native Avatar component
 */
export const getProfileImageSource = (user, hasError = false) => {
  if (user && user.photoURL && isValidImageUrl(user.photoURL) && !hasError) {
    return { uri: user.photoURL };
  }
  // Note: We can't use require here because it must have a static string
  // Instead, we'll return null and let the component handle the default
  return null;
}; 