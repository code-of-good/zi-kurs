export type Challenge = 0 | 1;

export interface Commitment {
  hash: string;
  salt: string;
}

export interface ProofRound {
  commitment: Commitment;
  response: ProofResponse;
}

export type ProofResponse =
  | {
      type: 0;
      permutation: number[];
      permutedGraphEdges: Array<[number, number]>;
    }
  | {
      type: 1;
      permutedGraphEdges: Array<[number, number]>;
      cycleEdges: Array<[number, number]>;
    };

export interface ZKPProof {
  rounds: ProofRound[];
  k: number;
}
