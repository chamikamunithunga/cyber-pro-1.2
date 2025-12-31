import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';

// Firebase configuration - can be set via environment variables or use defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCvlUUGA4itp0mCEbMJmTEmrDW0Kp2l-U4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cyber-pro-76e01.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cyber-pro-76e01",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cyber-pro-76e01.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "612497371304",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:612497371304:web:df17502f1661975ed6129d"
};

// Initialize Firebase
let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('✅ Firebase initialized successfully (client-side)');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

// Collection name
const COLLECTION_NAME = 'visitorData';

// Save visitor data to Firebase (client-side)
export async function saveVisitorData(data) {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      createdAt: Timestamp.now(),
      timestamp: data.timestamp || new Date().toISOString()
    });
    console.log('✅ Visitor data saved to Firebase with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error saving to Firebase:', error);
    throw error;
  }
}

// Get all visitor data
export async function getAllVisitorData() {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const data = [];
    
    querySnapshot.forEach((doc) => {
      const docData = doc.data();
      // Convert Firestore Timestamp to ISO string if needed
      if (docData.createdAt && docData.createdAt.toDate) {
        docData.createdAt = docData.createdAt.toDate().toISOString();
      }
      data.push({
        id: doc.id,
        ...docData
      });
    });
    
    console.log('✅ Fetched', data.length, 'visitor records from Firebase');
    return data;
  } catch (error) {
    console.error('❌ Error fetching from Firebase:', error);
    throw error;
  }
}

// Get visitor data from last N minutes
export async function getRecentVisitorData(minutes = 30) {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const now = new Date();
    const minutesAgo = new Date(now.getTime() - minutes * 60 * 1000);
    const timestampAgo = Timestamp.fromDate(minutesAgo);
    
    let querySnapshot;
    let usedOrderBy = false;
    
    // Try query with orderBy first (requires index)
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('createdAt', '>=', timestampAgo),
        orderBy('createdAt', 'desc')
      );
      querySnapshot = await getDocs(q);
      usedOrderBy = true;
    } catch (indexError) {
      // If index doesn't exist, use simpler query and sort in memory
      console.warn('⚠️ Firestore index missing, using alternative query:', indexError.message);
      try {
        const q = query(
          collection(db, COLLECTION_NAME),
          where('createdAt', '>=', timestampAgo)
        );
        querySnapshot = await getDocs(q);
        usedOrderBy = false;
      } catch (queryError) {
        // If even the simple query fails (e.g., no data), return empty array
        console.warn('⚠️ Firestore query failed, returning empty array:', queryError.message);
        return [];
      }
    }
    
    const data = [];
    
    querySnapshot.forEach((doc) => {
      const docData = doc.data();
      // Convert Firestore Timestamp to ISO string if needed
      if (docData.createdAt && docData.createdAt.toDate) {
        docData.createdAt = docData.createdAt.toDate().toISOString();
      }
      data.push({
        id: doc.id,
        ...docData
      });
    });
    
    // Sort by createdAt descending if we didn't use orderBy
    if (!usedOrderBy && data.length > 0) {
      data.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return timeB - timeA; // Descending
      });
    }
    
    console.log('✅ Fetched', data.length, 'recent visitor records (last', minutes, 'minutes) from Firebase');
    return data;
  } catch (error) {
    console.error('❌ Error fetching recent data from Firebase:', error);
    throw error;
  }
}

// Get visitor statistics
export async function getVisitorStats() {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  try {
    const allData = await getAllVisitorData();
    const uniqueIPs = new Set(allData.map(item => item.publicIP || item.ip));
    
    return {
      total: allData.length,
      unique: uniqueIPs.size
    };
  } catch (error) {
    console.error('❌ Error calculating stats:', error);
    throw error;
  }
}

// Check if Firebase is initialized
export function isFirebaseInitialized() {
  return db !== null && db !== undefined;
}

export { db };

