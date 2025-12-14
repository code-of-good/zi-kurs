import type { Graph } from "./models/graph.js";
import type {
  Challenge,
  Commitment,
  ProofResponse,
  ProofRound,
  ZKPProof,
} from "./models/zkp-types.js";
import { commitToGraph } from "./utils/commitment.js";
import {
  generateRandomPermutation,
  applyPermutationToGraph,
  applyPermutationToCycle,
} from "./utils/permutation.js";

/**
 * Prover в протоколе ZKP для гамильтонова цикла
 * Знает гамильтонов цикл и может доказать его существование без раскрытия
 */
export class Prover {
  private graph: Graph;
  private hamiltonianCycle: number[];

  constructor(graph: Graph, hamiltonianCycle: number[]) {
    this.graph = graph;
    this.hamiltonianCycle = hamiltonianCycle;
  }

  /**
   * Генерирует коммит к перестановленному графу (Шаг 1 протокола)
   * @returns Перестановленный граф G', перестановку π и коммит к G'
   */
  generateCommitment(): {
    permutedGraph: Graph;
    permutation: number[];
    commitment: Commitment;
  } {
    const n = this.graph.getVertexCount();

    // Генерируем случайную перестановку π
    const permutation = generateRandomPermutation(n);

    // Создаем перестановленный граф G' = π(G)
    const permutedGraph = applyPermutationToGraph(this.graph, permutation);

    // Коммитим к перестановленному графу
    const commitment = commitToGraph(permutedGraph, permutation);

    return {
      permutedGraph,
      permutation,
      commitment,
    };
  }

  /**
   * Отвечает на challenge (Шаг 3 протокола)
   * @param challenge - Тип вызова (0 или 1)
   * @param permutedGraph - Перестановленный граф G'
   * @param permutation - Перестановка π
   * @returns Ответ на challenge
   */
  respondToChallenge(
    challenge: Challenge,
    permutedGraph: Graph,
    permutation: number[]
  ): ProofResponse {
    if (challenge === 0) {
      // Challenge 0: Показать перестановку и все рёбра G'
      return {
        type: 0,
        permutation: [...permutation], // Копируем массив
        permutedGraphEdges: permutedGraph.getEdges(),
      };
    } else {
      // Challenge 1: Показать только рёбра гамильтонова цикла в G'
      // Применяем перестановку к циклу
      const permutedCycle = applyPermutationToCycle(
        this.hamiltonianCycle,
        permutation
      );

      // Преобразуем цикл в массив рёбер
      const cycleEdges: Array<[number, number]> = [];
      for (let i = 0; i < permutedCycle.length; i++) {
        const current = permutedCycle[i];
        const next = permutedCycle[(i + 1) % permutedCycle.length];

        if (current === undefined || next === undefined) {
          throw new Error("Invalid cycle");
        }

        // Нормализуем порядок рёбер (меньший индекс первым)
        if (current < next) {
          cycleEdges.push([current, next]);
        } else {
          cycleEdges.push([next, current]);
        }
      }

      return {
        type: 1,
        cycleEdges,
      };
    }
  }

  /**
   * Генерирует полное доказательство из k раундов (Шаг 4 протокола)
   * @param k - Количество раундов
   * @param challenges - Массив challenges для каждого раунда (должен быть длины k)
   * @returns Полное доказательство ZKP
   */
  generateProof(k: number, challenges: Challenge[]): ZKPProof {
    if (challenges.length !== k) {
      throw new Error(
        `Challenges array length ${challenges.length} does not match k=${k}`
      );
    }

    const rounds: ProofRound[] = [];

    for (let i = 0; i < k; i++) {
      // Шаг 1: Генерируем коммит
      const { permutedGraph, permutation, commitment } =
        this.generateCommitment();

      // Шаг 2: Получаем challenge (из массива)
      const challenge = challenges[i];
      if (challenge === undefined) {
        throw new Error(`Challenge at index ${i} is undefined`);
      }

      // Шаг 3: Формируем ответ
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
