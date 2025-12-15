import crypto from "crypto";
import { Graph } from "../models/graph.js";
import type { CreateGraphType } from "./read-from-file.js";

export function generateRandomPermutation(n: number): number[] {
  const permutation: number[] = [];
  for (let i = 0; i < n; i++) {
    permutation.push(i);
  }

  for (let i = n - 1; i > 0; i--) {
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0);
    const j = randomValue % (i + 1);

    const temp = permutation[i];
    if (temp === undefined || permutation[j] === undefined) {
      throw new Error("Invalid permutation index");
    }
    permutation[i] = permutation[j]!;
    permutation[j] = temp;
  }

  return permutation;
}

export function applyPermutationToGraph(graph: Graph, perm: number[]): Graph {
  const n = graph.getVertexCount();

  if (perm.length !== n) {
    throw new Error(
      `Permutation length ${perm.length} does not match graph size ${n}`
    );
  }

  const permSet = new Set(perm);
  if (permSet.size !== n) {
    throw new Error("Invalid permutation: not a bijection");
  }

  const originalEdges = graph.getEdges();
  const permutedEdges: number[][] = [];

  for (const [u, v] of originalEdges) {
    const permU = perm[u];
    const permV = perm[v];

    if (permU === undefined || permV === undefined) {
      throw new Error(`Invalid permutation index for edge (${u}, ${v})`);
    }

    permutedEdges.push([permU, permV]);
  }

  const graphData: CreateGraphType = {
    vertexCount: n,
    edgeCount: permutedEdges.length,
    edges: permutedEdges,
  };

  return new Graph(graphData);
}

export function applyPermutationToCycle(
  cycle: number[],
  perm: number[]
): number[] {
  return cycle.map((vertex) => {
    const permuted = perm[vertex];
    if (permuted === undefined) {
      throw new Error(`Invalid permutation index for vertex ${vertex}`);
    }
    return permuted;
  });
}

export function inversePermutation(perm: number[]): number[] {
  const inv: number[] = new Array(perm.length);
  for (let i = 0; i < perm.length; i++) {
    const permValue = perm[i];
    if (permValue === undefined) {
      throw new Error("Invalid permutation: undefined value");
    }
    if (permValue < 0 || permValue >= perm.length) {
      throw new Error(`Invalid permutation value: ${permValue}`);
    }
    inv[permValue] = i;
  }
  return inv;
}
