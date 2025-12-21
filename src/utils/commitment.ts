import crypto from "crypto";
import type { Graph } from "../models/graph.js";

// Старый тип Commitment больше не используется, но оставляем функции для совместимости
export interface Commitment {
  hash: string;
  salt: string;
}

export function createCommitment(data: string): Commitment {
  const salt = crypto.randomBytes(32).toString("hex");

  const hash = crypto
    .createHash("sha256")
    .update(data + salt)
    .digest("hex");

  return { hash, salt };
}

export function openCommitment(commitment: Commitment, data: string): boolean {
  const computedHash = crypto
    .createHash("sha256")
    .update(data + commitment.salt)
    .digest("hex");

  return computedHash === commitment.hash;
}

function serializeGraph(graph: Graph): string {
  const edges = graph.getEdges();
  const sortedEdges: Array<[number, number]> = edges
    .map(([u, v]) => (u < v ? [u, v] : [v, u]) as [number, number])
    .sort(([u1, v1], [u2, v2]) => {
      if (u1 !== u2) return u1 - u2;
      return v1 - v2;
    });

  return sortedEdges.map(([u, v]) => `${u},${v}`).join("|");
}

function serializePermutation(permutation: number[]): string {
  return permutation.join(",");
}

export function commitToGraph(graph: Graph, permutation: number[]): Commitment {
  const serialized = serializeGraph(graph);
  return createCommitment(serialized);
}

export function commitToPermutation(permutation: number[]): Commitment {
  const serialized = serializePermutation(permutation);
  return createCommitment(serialized);
}
