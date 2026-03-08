'use client';

import { signInWithPopup, signInWithRedirect, signOut, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from './config';
import { User } from './types';

export const signInWithGoogle = async (): Promise<User> => {
  try {
    // First try popup authentication
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      const user: User = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || 'Anonymous',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || undefined,
        color: generateUserColor(firebaseUser.uid),
      };
      
      return user;
    } catch (popupError: unknown) {
      // If popup fails, try redirect
      const error = popupError as { code?: string };
      if (error.code === 'auth/popup-closed-by-user' || 
          error.code === 'auth/popup-blocked' ||
          error.code === 'auth/popup-request-cancelled' ||
          error.code === 'auth/cancelled-popup-request') {
        
        console.log('Popup authentication failed, trying redirect...');
        await signInWithRedirect(auth, googleProvider);
        
        // This won't execute immediately due to redirect
        // The result will be handled by getRedirectResult
        throw new Error('redirect');
      }
      
      // Handle network errors specifically
      if (error.code === 'auth/network-request-failed') {
        throw new Error('network-error');
      }
      
      throw popupError;
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'redirect') {
      throw error; // Re-throw redirect signal
    }
    if (error instanceof Error && error.message === 'network-error') {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    }
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const handleRedirectResult = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const firebaseUser = result.user;
      
      const user: User = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || 'Anonymous',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || undefined,
        color: generateUserColor(firebaseUser.uid),
      };
      
      return user;
    }
    return null;
  } catch (error) {
    console.error('Error handling redirect result:', error);
    return null;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
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
