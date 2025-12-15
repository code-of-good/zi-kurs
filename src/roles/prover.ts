import type { Graph } from "../models/graph.js";
import type {
  Challenge,
  Commitment,
  ProofResponse,
  ProofRound,
  ZKPProof,
} from "../models/zkp-types.js";
import { commitToGraph } from "../utils/commitment.js";
import {
  generateRandomPermutation,
  applyPermutationToGraph,
  applyPermutationToCycle,
} from "../utils/permutation.js";

export class Prover {
  private graph: Graph;
  private hamiltonianCycle: number[];

  constructor(graph: Graph, hamiltonianCycle: number[]) {
    this.graph = graph;
    this.hamiltonianCycle = hamiltonianCycle;
  }

  generateCommitment(): {
    permutedGraph: Graph;
    permutation: number[];
    commitment: Commitment;
  } {
    const n = this.graph.getVertexCount();

    const permutation = generateRandomPermutation(n);

    const permutedGraph = applyPermutationToGraph(this.graph, permutation);

    const commitment = commitToGraph(permutedGraph, permutation);

    return {
      permutedGraph,
      permutation,
      commitment,
    };
  }

  respondToChallenge(
    challenge: Challenge,
    permutedGraph: Graph,
    permutation: number[]
  ): ProofResponse {
    if (challenge === 0) {
      return {
        type: 0,
        permutation: [...permutation],
        permutedGraphEdges: permutedGraph.getEdges(),
      };
    } else {
      const permutedCycle = applyPermutationToCycle(
        this.hamiltonianCycle,
        permutation
      );

      const cycleEdges: Array<[number, number]> = [];
      for (let i = 0; i < permutedCycle.length; i++) {
        const current = permutedCycle[i];
        const next = permutedCycle[(i + 1) % permutedCycle.length];

        if (current === undefined || next === undefined) {
          throw new Error("Invalid cycle");
        }

        if (current < next) {
          cycleEdges.push([current, next]);
        } else {
          cycleEdges.push([next, current]);
        }
      }

      return {
        type: 1,
        permutedGraphEdges: permutedGraph.getEdges(),
        cycleEdges,
      };
    }
  }

  generateProof(k: number, challenges: Challenge[]): ZKPProof {
    if (challenges.length !== k) {
      throw new Error(
        `Challenges array length ${challenges.length} does not match k=${k}`
      );
    }

    const rounds: ProofRound[] = [];

    for (let i = 0; i < k; i++) {
      const { permutedGraph, permutation, commitment } =
        this.generateCommitment();

      const challenge = challenges[i];
      if (challenge === undefined) {
        throw new Error(`Challenge at index ${i} is undefined`);
      }

      const response = this.respondToChallenge(
        challenge,
        permutedGraph,
        permutation
      );

      rounds.push({
        commitment,
        response,
      });
    }

    return {
      rounds,
      k,
    };
  }
}
