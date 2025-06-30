// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';



const firebaseConfig = {
  apiKey: "AIzaSyAvit3MsXYJAi0TxCKeDQ_zhbqFWX3QOts",
  authDomain: "ekkomind-8af27.firebaseapp.com",
  projectId: "ekkomind-8af27",
  storageBucket: "ekkomind-8af27.firebasestorage.app",
  messagingSenderId: "280725787446",
  appId: "1:280725787446:web:28082ab4ddcd11dfb81997",
  measurementId: "G-GDV2MFH4XY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // ✅ ADD THIS
export const storage = getStorage(app);


