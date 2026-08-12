import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPtP02ae09zSVElRJwranOcV4r3iAj2ZM",
  authDomain: "modern-xylocarp-mrwfn.firebaseapp.com",
  projectId: "modern-xylocarp-mrwfn",
  storageBucket: "modern-xylocarp-mrwfn.firebasestorage.app",
  messagingSenderId: "941339419985",
  appId: "1:941339419985:web:beb29501e8296148099f70"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID
export const DATABASE_ID = "ai-studio-novascholar-43309b7d-4390-4249-87a2-d3c11ac19581";
export const db = getFirestore(app, DATABASE_ID);

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  type User
};
