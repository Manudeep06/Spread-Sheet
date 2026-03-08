'use client';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Test Firebase connection
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    const testConfig = {
      apiKey: "AIzaSyDv8lXJg-6Ims5h-xTFqpsC3jyhjzhNfBk",
      authDomain: "trademarkia-fc4c2.firebaseapp.com",
      projectId: "trademarkia-fc4c2",
      storageBucket: "trademarkia-fc4c2.firebasestorage.app",
      messagingSenderId: "882457325549",
      appId: "1:882457325549:web:76209105c3a5aeee9201e4"
    };

    const testApp = initializeApp(testConfig, "testApp");
    const testAuth = getAuth(testApp);
    
    // Try anonymous sign-in to test connection
    await signInAnonymously(testAuth);
    
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
};
