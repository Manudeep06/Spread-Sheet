import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDv8lXJg-6Ims5h-xTFqpsC3jyhjzhNfBk",
  authDomain: "trademarkia-fc4c2.firebaseapp.com",
  projectId: "trademarkia-fc4c2",
  storageBucket: "trademarkia-fc4c2.firebasestorage.app",
  messagingSenderId: "882457325549",
  appId: "1:882457325549:web:76209105c3a5aeee9201e4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
