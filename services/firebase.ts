import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { SavedNote, AIInsights, SummaryResult } from '../types';
import { parseNoteMetadata } from './storage';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

const googleProvider = new GoogleAuthProvider();

// Auth functions
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string) {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
}

export async function signupWithEmail(email: string, pass: string) {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  return result.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Firestore Notes Storage Functions
export async function saveNoteToCloud(
  userId: string, 
  data: {
    id?: string;
    note: string;
    insights?: AIInsights | null;
    summaryData?: SummaryResult | null;
    templateName?: string;
  }
): Promise<SavedNote> {
  const now = Date.now();
  const { title, patientName, chiefComplaint } = parseNoteMetadata(data.note);
  const noteId = data.id || `note_${now}_${Math.random().toString(36).substr(2, 6)}`;

  const noteDocRef = doc(db, 'notes', noteId);

  const payload: SavedNote & { userId: string } = {
    id: noteId,
    userId,
    title,
    content: data.note,
    insights: data.insights || null,
    summaryData: data.summaryData || null,
    createdAt: now,
    updatedAt: now,
    patientName: patientName || '',
    chiefComplaint: chiefComplaint || '',
    templateName: data.templateName || '',
  };

  // Convert undefined values to null for Firestore compliance
  const cleanPayload = JSON.parse(JSON.stringify(payload));

  await setDoc(noteDocRef, cleanPayload, { merge: true });

  return payload;
}

export async function getCloudNotes(userId: string): Promise<SavedNote[]> {
  try {
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const notes: SavedNote[] = [];
    snapshot.forEach(docSnap => {
      notes.push(docSnap.data() as SavedNote);
    });
    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error("Error fetching cloud notes:", err);
    return [];
  }
}

export function subscribeToCloudNotes(userId: string, callback: (notes: SavedNote[]) => void) {
  const q = query(
    collection(db, 'notes'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const notes: SavedNote[] = [];
    snapshot.forEach((docSnap) => {
      notes.push(docSnap.data() as SavedNote);
    });
    notes.sort((a, b) => b.updatedAt - a.updatedAt);
    callback(notes);
  }, (error) => {
    console.error("Realtime notes subscription error:", error);
  });
}

export async function deleteCloudNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, 'notes', noteId));
}
