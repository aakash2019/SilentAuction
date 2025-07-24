import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyD1HaYG9w_gx6iLaOMmd-OlddYpTr7Oj_U",
  authDomain: "silent-auction-81fc9.firebaseapp.com",
  projectId: "silent-auction-81fc9",
  storageBucket: "silent-auction-81fc9.firebasestorage.app",
  messagingSenderId: "241189378599",
  appId: "1:241189378599:web:1affb433bce332e728cc02",
  measurementId: "G-KHHGTGJNVK"
};

// Initialize Firebase App only if it doesn't exist
const app = initializeApp(firebaseConfig);

// Initialize Auth
let auth;
auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { auth, db, storage };
export default app;