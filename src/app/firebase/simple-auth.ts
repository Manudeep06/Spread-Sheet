'use client';

// Simple fallback authentication for testing
export const signInAnonymously = async () => {
  const user = {
    uid: 'demo-user-' + Math.random().toString(36).substr(2, 9),
    displayName: 'Demo User',
    email: 'demo@example.com',
    photoURL: undefined,
    color: '#FF6B6B',
  };
  
  // Store in localStorage for persistence
  localStorage.setItem('spreadsheet-user', JSON.stringify(user));
  return user;
};

export const signOutSimple = async () => {
  localStorage.removeItem('spreadsheet-user');
};

export const getCurrentUser = () => {
  const stored = localStorage.getItem('spreadsheet-user');
  return stored ? JSON.parse(stored) : null;
};
