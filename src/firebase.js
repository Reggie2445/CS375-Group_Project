import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyDAlk33IJDi4m8CGfZwZNYDY9OaAvtSeEs",
  authDomain: "musiclov-d0e4b.firebaseapp.com",
  projectId: "musiclov-d0e4b",
  storageBucket: "musiclov-d0e4b.firebasestorage.app",
  messagingSenderId: "331124210976",
  appId: "1:331124210976:web:69bfb646449a508ede6b45",
  measurementId: "G-EREBKJS2PY"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

