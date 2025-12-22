import type { Graph } from "../models/graph.js";
import type {
  Challenge,
  ProofResponse,
  ProofRound,
  ZKPProof,
  EncryptedMatrix,
} from "../models/zkp-types.js";
import {
  generateRandomPermutation,
  applyPermutationToGraph,
  applyPermutationToCycle,
} from "../utils/permutation.js";
import { generateRSAKeys, rsaEncrypt, type RSAKeys } from "../utils/crypto.js";
import {
  getAdjacencyMatrix,
  encodeMatrixWithRandom,
  encryptMatrix,
  decryptMatrix,
} from "../utils/matrix.js";

/**
 * Prover (Алиса) - знает гамильтонов цикл и доказывает это Verifier'у
 * используя протокол с RSA-шифрованием
 */
export class Prover {
  private graph: Graph;
  private hamiltonianCycle: number[];

  constructor(graph: Graph, hamiltonianCycle: number[]) {
    this.graph = graph;
    this.hamiltonianCycle = hamiltonianCycle;
  }

  /**
   * Шаг 1: Создает изоморфный граф Н, кодирует и шифрует его матрицу смежности
   * @returns объект с зашифрованной матрицей F, перестановкой, графом Н и ключами
   */
  generateEncryptedGraph(): {
    encryptedMatrix: EncryptedMatrix;
    permutedGraph: Graph;
    permutation: number[];
    keys: RSAKeys;
    encodedMatrix: bigint[][];
    randomNumbers: bigint[][];
  } {
    const n = this.graph.getVertexCount();

    // 1. Генерируем случайную перестановку вершин
    const permutation = generateRandomPermutation(n);

    // 2. Создаем изоморфный граф Н = π(G)
    const permutedGraph = applyPermutationToGraph(this.graph, permutation);

    // 3. Получаем матрицу смежности графа Н
    const adjacencyMatrix = getAdjacencyMatrix(permutedGraph);

    // 4. Кодируем матрицу случайными числами: H'ij = rij || Hij
    const { encodedMatrix, randomNumbers } =
      encodeMatrixWithRandom(adjacencyMatrix);

    // 5. Генерируем RSA ключи
    const keys = generateRSAKeys(256); // Используем 256 бит для простых чисел (N ~ 512 бит)

    // 6. Шифруем закодированную матрицу: Fij = (H'ij)^d mod N
    const encryptedMatrixData = encryptMatrix(encodedMatrix, keys);

    // 7. Формируем зашифрованную матрицу для передачи Бобу
    const encryptedMatrix: EncryptedMatrix = {
      matrix: encryptedMatrixData,
      publicKey: {
        N: keys.N.toString(),
        e: keys.e.toString(),
      },
    };

    return {
      encryptedMatrix,
      permutedGraph,
      permutation,
      keys,
      encodedMatrix,
      randomNumbers,
    };
  }

  /**
   * Шаг 3: Отвечает на challenge от Боба
   * @param challenge 0 - показать перестановку и граф Н, 1 - показать гамильтонов цикл
   * @param encryptedMatrix зашифрованная матрица F
   * @param permutation перестановка вершин
   * @param keys RSA ключи
   * @param randomNumbers случайные числа rij
   */
  respondToChallenge(
    challenge: Challenge,
    encryptedMatrix: EncryptedMatrix,
    permutation: number[],
    keys: RSAKeys,
    randomNumbers: bigint[][]
  ): ProofResponse {
    if (challenge === 0) {
      // Challenge 0: Расшифровываем F полностью, получая H'
      const decryptedMatrix = decryptMatrix(encryptedMatrix.matrix, keys);

      return {
        type: 0,
        permutation: [...permutation],
        decryptedMatrix: decryptedMatrix, // Расшифрованная закодированная матрица H'
        randomNumbers: randomNumbers, // Передаем случайные числа rij
      };
    } else {
      // Challenge 1: Расшифровываем в F только рёбра, образующие гамильтонов цикл
      const permutedCycle = applyPermutationToCycle(
        this.hamiltonianCycle,
        permutation
      );

      // Формируем рёбра цикла
      const cycleEdges: Array<[number, number]> = [];
      const decryptedCycleElements: Array<{
        i: number;
        j: number;
        value: bigint;
      }> = [];
      const cycleRandomNumbers: Array<{
        i: number;
        j: number;
        value: bigint;
      }> = [];

      for (let i = 0; i < permutedCycle.length; i++) {
        const current = permutedCycle[i];
        const next = permutedCycle[(i + 1) % permutedCycle.length];

        if (current === undefined || next === undefined) {
          throw new Error("Invalid cycle");
        }

        // Нормализуем рёбра (меньший индекс первым)
        const u = current < next ? current : next;
        const v = current < next ? next : current;
        cycleEdges.push([u, v]);

        // Расшифровываем в F ребро цикла: H'ij = (Fij)^d mod N
        const encryptedRow = encryptedMatrix.matrix[u];
        if (!encryptedRow) {
          throw new Error(`Missing encrypted row ${u}`);
        }
        const encryptedValue = encryptedRow[v];
        if (encryptedValue === undefined) {
          throw new Error(`Missing encrypted value at [${u}, ${v}]`);
        }

        // Расшифровываем Fij, получая H'ij: H'ij = (Fij)^e mod N
        const decryptedValue = rsaEncrypt(encryptedValue, keys.e, keys.N);

        const randomValue = randomNumbers[u]?.[v];
        if (randomValue === undefined) {
          throw new Error(`Missing random number for edge (${u}, ${v})`);
        }

        decryptedCycleElements.push({
          i: u,
          j: v,
          value: decryptedValue,
        });
        cycleRandomNumbers.push({
          i: u,
          j: v,
          value: randomValue,
        });
      }

      return {
        type: 1,
        cycleEdges,
        decryptedCycleElements,
        randomNumbers: cycleRandomNumbers,
      };
    }
  }

  /**
   * Генерирует полное доказательство для k раундов
   * @param k количество раундов
   * @param challenges массив challenges от Боба
   */
  generateProof(k: number, challenges: Challenge[]): ZKPProof {
    if (challenges.length !== k) {
      throw new Error(
        `Challenges array length ${challenges.length} does not match k=${k}`
      );
    }

    const rounds: ProofRound[] = [];

    for (let i = 0; i < k; i++) {
      // Шаг 1: Создаем зашифрованный граф Н
      const {
        encryptedMatrix,
        permutedGraph,
        permutation,
        keys,
        encodedMatrix,
        randomNumbers,
      } = this.generateEncryptedGraph();

      const challenge = challenges[i];
      if (challenge === undefined) {
        throw new Error(`Challenge at index ${i} is undefined`);
      }

      // Шаг 3: Отвечаем на challenge (расшифровываем F)
      const response = this.respondToChallenge(
        challenge,
        encryptedMatrix,
        permutation,
        keys,
        randomNumbers
      );

      rounds.push({
        encryptedMatrix,
        response,
      });
    }

    return {
      rounds,
      k,
    };
  }
}
