
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// 파이어베이스 전용 API 키 (Gemini API 키와 별개)
const firebaseConfig = {
  apiKey: "AIzaSyCNVCDQFIxpKVqBa6j-l46lqP6l2wSTpkU",
  authDomain: "mystic-lotto.firebaseapp.com",
  projectId: "mystic-lotto",
  storageBucket: "mystic-lotto.firebasestorage.app",
  messagingSenderId: "697455331590",
  appId: "1:697455331590:web:e9549aa13fa867f6047687",
  measurementId: "G-VEER5M5JZC",
  databaseURL: "https://mystic-lotto-default-rtdb.asia-southeast1.firebasedatabase.app"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Google Login Error:", error.message);
    return null;
  }
};

/**
 * 익명 로그인: AI Studio 환경에서 도메인 승인 없이 백엔드 연동을 테스트할 때 사용합니다.
 */
export const loginAsGuest = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error: any) {
    console.error("Anonymous Login Error:", error.message);
    return null;
  }
};

export const logout = () => signOut(auth);
