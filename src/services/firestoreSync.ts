import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ProjectRecord } from '../types/project';

export function sanitizeFirestoreId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  return cleaned || 'default-project';
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

function timestampToIso(ts: unknown, fallbackIso: string): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString();
  }
  if (typeof ts === 'string' && ts.trim()) {
    return ts;
  }
  return fallbackIso;
}

export async function syncUserProfileToFirestore(
  user: User,
  analystName: string
): Promise<void> {
  if (!user.emailVerified) return;

  const uid = sanitizeFirestoreId(user.uid);
  const publicPath = `users/${uid}`;
  const displayName = (user.displayName || analystName || 'Analyste Riz').slice(0, 120);

  const publicPayload: Record<string, unknown> = {
    displayName,
    updatedAt: serverTimestamp(),
  };
  if (user.photoURL && user.photoURL.length <= 500) {
    publicPayload.photoURL = user.photoURL;
  }

  try {
    await setDoc(doc(db, 'users', uid), publicPayload, { merge: false });
  } catch (err) {
    // Try update if doc exists and write checks affectedKeys
    try {
      await updateDoc(doc(db, 'users', uid), publicPayload);
    } catch {
      handleFirestoreError(err, OperationType.WRITE, publicPath);
    }
  }

  if (user.email) {
    const privatePath = `users/${uid}/private/profile`;
    const privateRef = doc(db, 'users', uid, 'private', 'profile');
    try {
      const existingSnap = await getDoc(privateRef);
      if (!existingSnap.exists()) {
        await setDoc(privateRef, {
          uid,
          email: user.email.slice(0, 200),
          analystName: (analystName || displayName).slice(0, 120),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(privateRef, {
          email: user.email.slice(0, 200),
          analystName: (analystName || displayName).slice(0, 120),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, privatePath);
    }
  }
}

export async function saveProjectToFirestore(
  uid: string,
  project: ProjectRecord
): Promise<void> {
  const safeUid = sanitizeFirestoreId(uid);
  const safeId = sanitizeFirestoreId(project.id);
  const docPath = `projects/${safeId}`;
  const ref = doc(db, 'projects', safeId);

  const sanitizedAssumptions = stripUndefinedDeep(project.assumptions);
  const sanitizedScenarios = stripUndefinedDeep(project.savedScenarios).slice(0, 25);
  const sanitizedPestel = project.pestelAnalysis
    ? stripUndefinedDeep(project.pestelAnalysis)
    : undefined;
  const sanitizedNotes = (project.dashboardReportNotes ?? '').slice(0, 10000);

  const updatablePayload: Record<string, unknown> = {
    name: (project.name || 'Projet Riz').slice(0, 160),
    description: (project.description || '').slice(0, 500),
    source: project.source === 'excel' || project.source === 'copy' ? project.source : 'default',
    activeScenarioId: sanitizeFirestoreId(project.activeScenarioId || 'base'),
    assumptions: sanitizedAssumptions,
    savedScenarios: sanitizedScenarios,
    dashboardReportNotes: sanitizedNotes,
    updatedAt: serverTimestamp(),
  };

  if (sanitizedPestel) {
    updatablePayload.pestelAnalysis = sanitizedPestel;
  }

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: safeId,
        ownerId: safeUid,
        ...updatablePayload,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, updatablePayload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export function subscribeUserProjectsFromFirestore(
  uid: string,
  onProjects: (projects: ProjectRecord[]) => void
): () => void {
  const safeUid = sanitizeFirestoreId(uid);
  const q = query(
    collection(db, 'projects'),
    where('ownerId', '==', safeUid),
    limit(25)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const nowIso = new Date().toISOString();
      const loaded: ProjectRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data || !data.assumptions) return;
        loaded.push({
          id: String(data.id || docSnap.id),
          name: String(data.name || 'Projet Cloud'),
          description: String(data.description || ''),
          source:
            data.source === 'excel' || data.source === 'copy'
              ? data.source
              : 'default',
          activeScenarioId: String(data.activeScenarioId || ''),
          assumptions: data.assumptions,
          savedScenarios: Array.isArray(data.savedScenarios)
            ? data.savedScenarios
            : [],
          auditLog: [],
          pestelAnalysis: data.pestelAnalysis,
          dashboardReportNotes:
            typeof data.dashboardReportNotes === 'string'
              ? data.dashboardReportNotes
              : '',
          createdAt: timestampToIso(data.createdAt, nowIso),
          updatedAt: timestampToIso(data.updatedAt, nowIso),
        });
      });
      onProjects(loaded);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    }
  );
}

export async function deleteProjectFromFirestore(
  projectId: string
): Promise<void> {
  const safeId = sanitizeFirestoreId(projectId);
  const docPath = `projects/${safeId}`;
  try {
    await deleteDoc(doc(db, 'projects', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}
