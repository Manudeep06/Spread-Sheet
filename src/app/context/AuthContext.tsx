'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { User } from '../firebase/types';
import { handleRedirectResult } from '../firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthContext: Initializing auth...');
      
      // Check for redirect result first
      const redirectUser = await handleRedirectResult();
      if (redirectUser) {
        console.log('AuthContext: Found redirect user:', redirectUser.displayName);
        setUser(redirectUser);
      }

      // Check for demo user fallback
      const demoUser = localStorage.getItem('spreadsheet-user');
      if (demoUser && !redirectUser) {
        console.log('AuthContext: Found demo user');
        setUser(JSON.parse(demoUser));
      }

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        console.log('AuthContext: Firebase auth state changed:', firebaseUser?.displayName);
        if (firebaseUser) {
          const user: User = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Anonymous',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || undefined,
            color: generateUserColor(firebaseUser.uid),
          };
          setUser(user);
        } else if (!demoUser) {
          setUser(null);
        }
        setLoading(false);
      });

      return unsubscribe;
    };

    initializeAuth();
  }, []);

  const signIn = async () => {
    const { signInWithGoogle } = await import('../firebase/auth');
    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      // Handle redirect case - don't show error for expected redirect
      if (error instanceof Error && error.message === 'redirect') {
        console.log('Redirecting to Google for authentication...');
        return; // Don't show error for redirect
      }
      
      // Handle network errors
      if (error instanceof Error && error.message?.includes('Network connection failed')) {
        alert('Network connection failed. Please check your internet connection and try again.');
        return;
      }
      
      console.error('Sign in error:', error);
      alert('Sign in failed. Please try again.');
    }
  };

  const signOutUser = async () => {
    const { signOutUser } = await import('../firebase/auth');
    await signOutUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const generateUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};
