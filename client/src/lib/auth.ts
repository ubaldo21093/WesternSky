import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "employee" | "homeowner";
  avatarUrl?: string;
}

let currentUser: User | null = null;
let userLoadPromise: Promise<User | null> | null = null;

export const getCurrentUser = (): User | null => currentUser;

export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;
    
    // Send user data to backend
    const response = await apiRequest("POST", "/api/auth/login", {
      email: firebaseUser.email,
      name: firebaseUser.displayName,
      avatarUrl: firebaseUser.photoURL,
      role: "homeowner", // Default role - admin can change this later
    });
    
    const data = await response.json();
    currentUser = data.user;
    
    if (!currentUser) {
      throw new Error("Failed to get user data");
    }
    
    // Store user in localStorage for persistence across requests
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    return currentUser;
  } catch (error) {
    console.error("Sign in error:", error);
    throw new Error("Failed to sign in");
  }
};

export const signOut = async (): Promise<void> => {
  try {
    // First clear the server session
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    // Then clear Firebase auth
    await firebaseSignOut(auth);
    currentUser = null;
    localStorage.removeItem('currentUser');
  } catch (error) {
    console.error("Sign out error:", error);
    throw new Error("Failed to sign out");
  }
};

export const loadUser = (): Promise<User | null> => {
  if (userLoadPromise) {
    return userLoadPromise;
  }

  userLoadPromise = new Promise(async (resolve) => {
    try {
      // First, check for session-based authentication
      const sessionResponse = await fetch("/api/auth/me");
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        currentUser = sessionData.user;
        resolve(currentUser);
        return;
      }
    } catch (error) {
      console.log("No session found, checking Firebase auth...");
    }

    // If no session, fall back to Firebase auth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      unsubscribe();
      
      if (!firebaseUser) {
        currentUser = null;
        resolve(null);
        return;
      }

      try {
        // Try to get user from backend using Firebase email
        const response = await fetch(`/api/auth/me?email=${encodeURIComponent(firebaseUser.email || "")}`);

        if (response.ok) {
          const data = await response.json();
          currentUser = data.user;
          resolve(currentUser);
        } else {
          // User not found in backend, create them
          const loginResponse = await apiRequest("POST", "/api/auth/login", {
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            avatarUrl: firebaseUser.photoURL,
            role: "homeowner",
          });
          
          const loginData = await loginResponse.json();
          currentUser = loginData.user;
          resolve(currentUser);
        }
      } catch (error) {
        console.error("Load user error:", error);
        currentUser = null;
        resolve(null);
      }
    });
  });

  return userLoadPromise;
};

// Initialize user loading
loadUser();
