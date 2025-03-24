import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase/config';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh user data from Firestore
  const refreshUserData = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const freshUserData = userDoc.data();
        
        // Merge the new data with Firebase auth user
        setUser(prevUser => ({
          ...prevUser,
          ...freshUserData
        }));
        
        // Update userData state
        setUserData(freshUserData);
        
        return { success: true };
      }
      return { success: false, error: 'User data not found' };
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // User is signed in
        setUser(authUser);
        
        // Get additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          if (userDoc.exists()) {
            const firestoreData = userDoc.data();
            setUserData(firestoreData);
            
            // Merge Firebase auth user with Firestore data
            setUser(prevUser => ({ 
              ...prevUser, 
              ...firestoreData 
            }));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        // User is signed out
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, error: error.message };
    }
  };

  // Provide the authentication context to the application
  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        signOut,
        refreshUserData,
        role: userData?.role,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 