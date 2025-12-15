import crypto from "crypto";
import { Graph } from "../models/graph.js";
import type {
  Challenge,
  ProofRound,
  ProofResponse,
  ZKPProof,
} from "../models/zkp-types.js";
import { openCommitment } from "../utils/commitment.js";
import { isValidHamiltonianCycle } from "../models/hamiltonian-cycle.js";
import type { CreateGraphType } from "../utils/read-from-file.js";

export class Verifier {
  private graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  generateChallenge(): Challenge {
    const randomBytes = crypto.randomBytes(1);
    const randomByte = randomBytes[0];
    if (randomByte === undefined) {
      throw new Error("Failed to generate random challenge");
    }
    return (randomByte % 2) as Challenge;
  }

  private isValidPermutation(permutation: number[], n: number): boolean {
    if (permutation.length !== n) {
      return false;
    }

    const seen = new Set<number>();
    for (const value of permutation) {
      if (value < 0 || value >= n) {
        return false;
      }
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
    }

    return seen.size === n;
  }

  private reconstructGraphFromEdges(
    edges: Array<[number, number]>,
    vertexCount: number
  ): Graph {
    const graphData: CreateGraphType = {
      vertexCount,
      edgeCount: edges.length,
      edges: edges.map(([u, v]) => [u, v]),
    };

    return new Graph(graphData);
  }

  verifyRound(
    proofRound: ProofRound,
    originalGraph: Graph,
    roundNumber: number
  ): { valid: boolean; errorType?: string } {
    const { commitment, response } = proofRound;
    const n = originalGraph.getVertexCount();

    const challengeType = response.type;

    if (challengeType === 0) {
      const { permutation, permutedGraphEdges } = response;

      if (!this.isValidPermutation(permutation, n)) {
        return {
          valid: false,
          errorType: "Перестановка невалидна",
        };
      }

      const permutedGraph = this.reconstructGraphFromEdges(
        permutedGraphEdges,
        n
      );

      const serialized = this.serializeGraph(permutedGraph);
      if (!openCommitment(commitment, serialized)) {
        return {
          valid: false,
          errorType: "Коммит не соответствует графу G'",
        };
      }

      if (!originalGraph.isIsomorphicTo(permutedGraph, permutation)) {
        return {
          valid: false,
          errorType: "Несоответствие при проверке изоморфизма",
        };
      }

      return { valid: true };
    } else {
      const { permutedGraphEdges, cycleEdges } = response;

      const permutedGraph = this.reconstructGraphFromEdges(
        permutedGraphEdges,
        n
      );

      const serialized = this.serializeGraph(permutedGraph);
      if (!openCommitment(commitment, serialized)) {
        return {
          valid: false,
          errorType: "Коммит не соответствует графу G'",
        };
      }

      if (cycleEdges.length !== n) {
        return {
          valid: false,
          errorType: "Неправильное количество рёбер в цикле",
        };
      }

      for (const [u, v] of cycleEdges) {
        if (u < 0 || u >= n || v < 0 || v >= n) {
          return {
            valid: false,
            errorType: "Ребро вне допустимого диапазона",
          };
        }
        if (u === v) {
          return {
            valid: false,
            errorType: "Self-loop недопустим",
          };
        }
      }

      // КРИТИЧЕСКАЯ ПРОВЕРКА: все рёбра цикла должны существовать в G'
      for (const [u, v] of cycleEdges) {
        if (!permutedGraph.hasEdge(u, v)) {
          return {
            valid: false,
            errorType: `Ребро цикла (${u}, ${v}) не существует в графе G'`,
          };
        }
      }

      const cycle = this.edgesToCycle(cycleEdges, n);
      if (cycle === null) {
        return {
          valid: false,
          errorType: "Рёбра не образуют цикл",
        };
      }

      // Проверяем, что рёбра образуют валидный гамильтонов цикл
      if (!isValidHamiltonianCycle(cycle, permutedGraph)) {
        return {
          valid: false,
          errorType: "Предъявленный цикл некорректен",
        };
      }

      return { valid: true };
    }
  }

  private edgesToCycle(
    edges: Array<[number, number]>,
    n: number
  ): number[] | null {
    if (edges.length !== n) {
      return null;
    }

    const adjacency = new Map<number, Set<number>>();
    for (let i = 0; i < n; i++) {
      adjacency.set(i, new Set());
    }

    for (const [u, v] of edges) {
      adjacency.get(u)?.add(v);
      adjacency.get(v)?.add(u);
    }

    for (let i = 0; i < n; i++) {
      const neighbors = adjacency.get(i);
      if (!neighbors || neighbors.size !== 2) {
        return null;
      }
    }

    const cycle: number[] = [0];
    const visited = new Set<number>();
    visited.add(0);

    let current = 0;
    for (let i = 0; i < n - 1; i++) {
      const neighbors = Array.from(adjacency.get(current) || []);
      const next = neighbors.find((v) => !visited.has(v));

      if (next === undefined) {
        return null;
      }

      cycle.push(next);
      visited.add(next);
      current = next;
    }

    const last = cycle[cycle.length - 1];
    if (last === undefined) {
      return null;
    }
    const firstNeighbors = adjacency.get(0);
    if (!firstNeighbors || !firstNeighbors.has(last)) {
      return null;
    }

    return cycle;
  }

  private serializeGraph(graph: Graph): string {
    const edges = graph.getEdges();
    const sortedEdges: Array<[number, number]> = edges
      .map(([u, v]) => (u < v ? [u, v] : [v, u]) as [number, number])
      .sort(([u1, v1], [u2, v2]) => {
        if (u1 !== u2) return u1 - u2;
        return v1 - v2;
      });

    return sortedEdges.map(([u, v]) => `${u},${v}`).join("|");
  }

  verifyProof(
    proof: ZKPProof,
    originalGraph: Graph
  ): {
    valid: boolean;
    failedRound?: number;
    errorType?: string;
  } {
    if (proof.rounds.length !== proof.k) {
      return {
        valid: false,
        failedRound: 0,
        errorType: "Количество раундов не соответствует k",
      };
    }

    for (let i = 0; i < proof.rounds.length; i++) {
      const round = proof.rounds[i];
      if (!round) {
        return {
          valid: false,
          failedRound: i + 1,
          errorType: "Раунд отсутствует",
        };
      }

      const result = this.verifyRound(round, originalGraph, i + 1);
      if (!result.valid) {
        const errorMsg = result.errorType || "Неизвестная ошибка";
        console.error(`❌ ОШИБКА: Раунд ${i + 1} - ${errorMsg}`);
        return {
          valid: false,
          failedRound: i + 1,
          ...(result.errorType && { errorType: result.errorType }),
        };
      }
      const challengeType = round.response.type;
      console.log(
        `✓ Раунд ${i + 1} пройден (Challenge ${challengeType}: ${
          challengeType === 0 ? "показать перестановку" : "показать цикл"
        })`
      );

      if (challengeType === 0) {
        const response0 = round.response;
        if (response0.type === 0) {
          console.log(
            `  Раскрыто верификатору: перестановка π = [${response0.permutation.join(
              ", "
            )}], все рёбра G' = ${JSON.stringify(response0.permutedGraphEdges)}`
          );
        }
      } else {
        const response1 = round.response;
        if (response1.type === 1) {
          console.log(
            `  Раскрыто верификатору: все рёбра G' = ${JSON.stringify(
              response1.permutedGraphEdges
            )}, рёбра цикла = ${JSON.stringify(
              response1.cycleEdges
            )} (перестановка π НЕ раскрыта)`
          );
        }
      }
    }

    return { valid: true };
  }
}
