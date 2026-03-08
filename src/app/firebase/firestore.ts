'use client';

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';
import { Document, Cell, Presence } from './types';

const DOCUMENTS_COLLECTION = 'documents';
const PRESENCE_COLLECTION = 'presence';

export const createDocument = async (title: string, authorId: string, authorName: string): Promise<string> => {
  const docRef = doc(collection(db, DOCUMENTS_COLLECTION));
  const newDoc: Document = {
    id: docRef.id,
    title,
    createdAt: new Date(),
    updatedAt: new Date(),
    authorId,
    authorName,
    cells: {},
    linkAccess: 'edit', // default: anyone with link can edit
  };

  await setDoc(docRef, {
    ...newDoc,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const getDocument = async (documentId: string): Promise<Document | null> => {
  const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      cells: data.cells || {},
      linkAccess: data.linkAccess || 'edit', // default for old documents
    } as Document;
  }

  return null;
};

export const getDocuments = async (userId?: string): Promise<Document[]> => {
  let querySnapshot;

  if (userId) {
    // First filter by authorId, then sort in memory
    const q = query(collection(db, DOCUMENTS_COLLECTION), where('authorId', '==', userId));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        cells: data.cells || {},
        linkAccess: data.linkAccess || 'edit',
      } as Document;
    });

    // Sort by updatedAt in descending order
    return docs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } else {
    // For all documents, we can still use orderBy since there's no where clause
    const q = query(collection(db, DOCUMENTS_COLLECTION), orderBy('updatedAt', 'desc'));
    querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        cells: data.cells || {},
        linkAccess: data.linkAccess || 'edit',
      } as Document;
    });
  }
};

export const updateDocument = async (documentId: string, updates: Partial<Document>): Promise<void> => {
  const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const updateLinkAccess = async (documentId: string, access: 'edit' | 'view'): Promise<void> => {
  const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
  await updateDoc(docRef, { linkAccess: access, updatedAt: serverTimestamp() });
};

export const updateCell = async (documentId: string, cellId: string, cell: Cell): Promise<void> => {
  const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);

  // Firestore does not support `undefined` field values.
  // Strip all undefined keys before writing so that e.g. `formula: undefined`
  // on a plain-value cell doesn't cause an error.
  const sanitized = Object.fromEntries(
    Object.entries(cell).filter(([, v]) => v !== undefined)
  );

  await updateDoc(docRef, {
    [`cells.${cellId}`]: sanitized,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToDocument = (documentId: string, callback: (document: Document | null) => void) => {
  const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const document: Document = {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        cells: data.cells || {},
        linkAccess: data.linkAccess || 'edit',
      } as Document;
      callback(document);
    } else {
      callback(null);
    }
  });
};

export const updatePresence = async (documentId: string, presence: Presence): Promise<void> => {
  const presenceRef = doc(db, PRESENCE_COLLECTION, `${documentId}_${presence.userId}`);
  await setDoc(presenceRef, {
    ...presence,
    lastSeen: serverTimestamp(),
  });
};

export const subscribeToPresence = (documentId: string, callback: (presences: Presence[]) => void) => {
  // Query all presence documents and filter client-side
  const q = query(collection(db, PRESENCE_COLLECTION));

  return onSnapshot(q, (querySnapshot) => {
    const presences: Presence[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (doc.id.startsWith(documentId)) {
        presences.push({
          ...data,
          lastSeen: data.lastSeen?.toDate() || new Date(),
        } as Presence);
      }
    });
    callback(presences);
  });
};

export const removePresence = async (documentId: string, userId: string): Promise<void> => {
  const presenceRef = doc(db, PRESENCE_COLLECTION, `${documentId}_${userId}`);
  await deleteDoc(presenceRef);
};
