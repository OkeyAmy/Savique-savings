/**
 * proofStore.ts — Firestore read/write for shareable savings-proof metadata.
 *
 * PRIVACY: a proof document NEVER contains the user's wallet address or vault
 * address. It stores only the public thresholds, the verifier contract that
 * confirmed the proof on-chain, and timestamps — nothing that links back to
 * the prover's identity.
 */
import { db } from "./firebase";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { nanoid } from "nanoid";

const PROOFS_COLLECTION = "proofs";

export interface ProofDocument {
  proofId: string; // same as the document ID
  minAmount: string; // threshold in token base units (string to avoid precision loss)
  minAmountUsd: number; // threshold in dollars, for display
  minDuration: number; // threshold in seconds
  minDurationDays: number; // threshold in days, for display
  decimals: number; // token decimals used for the base-unit conversion
  currentTime: number; // unix seconds when the proof was generated
  verifierContract: string; // verifier contract address from deployment.json
  createdAt: number; // unix seconds
  // *** wallet / vault address intentionally omitted ***
}

/**
 * Write a new proof document. Returns the generated proofId (document ID).
 */
export async function saveProof(
  data: Omit<ProofDocument, "proofId" | "createdAt">
): Promise<string> {
  const proofId = nanoid(10);
  const createdAt = Math.floor(Date.now() / 1000);

  const docData: ProofDocument = { ...data, proofId, createdAt };

  await setDoc(doc(db, PROOFS_COLLECTION, proofId), {
    ...docData,
    firebaseCreatedAt: Timestamp.now(),
  });

  return proofId;
}

/**
 * Fetch a proof document by proofId. Returns null if it doesn't exist.
 */
export async function getProof(proofId: string): Promise<ProofDocument | null> {
  const snap = await getDoc(doc(db, PROOFS_COLLECTION, proofId));
  if (!snap.exists()) return null;

  const d = snap.data();
  return {
    proofId: snap.id,
    minAmount: String(d.minAmount ?? "0"),
    minAmountUsd: Number(d.minAmountUsd ?? 0),
    minDuration: Number(d.minDuration ?? 0),
    minDurationDays: Number(d.minDurationDays ?? 0),
    decimals: Number(d.decimals ?? 6),
    currentTime: Number(d.currentTime ?? 0),
    verifierContract: String(d.verifierContract ?? ""),
    createdAt: Number(d.createdAt ?? 0),
  };
}
