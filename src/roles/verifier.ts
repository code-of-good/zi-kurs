import crypto from "crypto";
import { Graph } from "../models/graph.js";
import type {
  Challenge,
  ProofRound,
  ProofResponse,
  ZKPProof,
} from "../models/zkp-types.js";
import { isValidHamiltonianCycle } from "../models/hamiltonian-cycle.js";
import type { CreateGraphType } from "../utils/read-from-file.js";
import { rsaEncrypt } from "../utils/crypto.js";
import { decodeMatrix, getAdjacencyMatrix } from "../utils/matrix.js";

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

  /**
   * Шаг 4: Проверяет правильность расшифровки путем повторного шифрования
   * @param proofRound раунд доказательства
   * @param originalGraph исходный граф G
   * @param roundNumber номер раунда
   */
  verifyRound(
    proofRound: ProofRound,
    originalGraph: Graph,
    roundNumber: number
  ): { valid: boolean; errorType?: string } {
    const { encryptedMatrix, response } = proofRound;
    const n = originalGraph.getVertexCount();

    // Получаем публичный ключ RSA
    const N = BigInt(encryptedMatrix.publicKey.N);
    const e = BigInt(encryptedMatrix.publicKey.e);

    const challengeType = response.type;

    if (challengeType === 0) {
      // Challenge 0: Проверяем перестановку и полную расшифровку графа Н
      const { permutation, decryptedMatrix } = response;

      // 1. Проверяем валидность перестановки
      if (!this.isValidPermutation(permutation, n)) {
        return {
          valid: false,
          errorType: "Перестановка невалидна",
        };
      }

      // 2. Проверяем правильность расшифровки путем повторного шифрования
      // В протоколе используется схема подписи RSA:
      // - Алиса "подписывает" (шифрует приватным ключом d): Fij = (H'ij)^d mod N
      // - Боб проверяет (расшифровывает публичным ключом e): (Fij)^e mod N == H'ij
      for (let i = 0; i < n; i++) {
        const decryptedRow = decryptedMatrix[i];
        const encryptedRow = encryptedMatrix.matrix[i];
        if (!decryptedRow || !encryptedRow) {
          return {
            valid: false,
            errorType: `Отсутствует строка ${i} в матрице`,
          };
        }
        for (let j = 0; j < n; j++) {
          const decryptedValue = decryptedRow[j]; // H'ij
          const encryptedValue = encryptedRow[j]; // Fij
          if (decryptedValue === undefined || encryptedValue === undefined) {
            return {
              valid: false,
              errorType: `Отсутствует элемент [${i}, ${j}] в матрице`,
            };
          }

          // Проверяем: (Fij)^e mod N == H'ij
          const verified = rsaEncrypt(encryptedValue, e, N);
          if (verified !== decryptedValue) {
            return {
              valid: false,
              errorType: `Несоответствие при проверке расшифровки для элемента [${i}, ${j}]`,
            };
          }
        }
      }

      // 3. Декодируем матрицу, извлекая исходные значения (0 или 1)
      const adjacencyMatrix = decodeMatrix(decryptedMatrix);

      // 4. Восстанавливаем граф Н из матрицы смежности
      const permutedGraph = this.reconstructGraphFromMatrix(adjacencyMatrix, n);

      // 5. Проверяем изоморфизм: Н = π(G)
      if (!originalGraph.isIsomorphicTo(permutedGraph, permutation)) {
        return {
          valid: false,
          errorType: "Граф Н не изоморфен G с данной перестановкой",
        };
      }

      return { valid: true };
    } else {
      // Challenge 1: Проверяем гамильтонов цикл
      const { cycleEdges, decryptedCycleElements } = response;

      // 1. Проверяем количество рёбер
      if (cycleEdges.length !== n) {
        return {
          valid: false,
          errorType: "Неправильное количество рёбер в цикле",
        };
      }

      // 2. Проверяем валидность рёбер
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

      // 3. Проверяем правильность расшифровки для каждого ребра цикла
      // Создаем мапу для быстрого доступа к расшифрованным значениям
      const decryptedMap = new Map<string, bigint>();

      for (const elem of decryptedCycleElements) {
        const key = `${elem.i},${elem.j}`;
        decryptedMap.set(key, elem.value);
      }

      for (const [u, v] of cycleEdges) {
        const key = `${u},${v}`;
        const decryptedValue = decryptedMap.get(key);

        if (decryptedValue === undefined) {
          return {
            valid: false,
            errorType: `Отсутствует расшифрованное значение для ребра (${u}, ${v})`,
          };
        }

        // Проверяем правильность расшифровки
        const encryptedRow = encryptedMatrix.matrix[u];
        if (!encryptedRow) {
          return {
            valid: false,
            errorType: `Отсутствует строка ${u} в зашифрованной матрице`,
          };
        }
        const encryptedValue = encryptedRow[v];
        if (encryptedValue === undefined) {
          return {
            valid: false,
            errorType: `Отсутствует элемент [${u}, ${v}] в зашифрованной матрице`,
          };
        }
        // Проверяем: (Fij)^e mod N == H'ij
        const verified = rsaEncrypt(encryptedValue, e, N);
        if (verified !== decryptedValue) {
          return {
            valid: false,
            errorType: `Несоответствие при проверке расшифровки для ребра (${u}, ${v})`,
          };
        }

        // Проверяем, что ребро действительно существует (Hij = 1)
        // Декодируем: Hij = H'ij mod 2
        const hij = Number(decryptedValue % 2n);
        if (hij !== 1) {
          return {
            valid: false,
            errorType: `Ребро (${u}, ${v}) не существует в графе (Hij = ${hij}, ожидается 1)`,
          };
        }
      }

      // 4. Проверяем, что рёбра образуют валидный гамильтонов цикл
      const cycle = this.edgesToCycle(cycleEdges, n);
      if (cycle === null) {
        return {
          valid: false,
          errorType: "Рёбра не образуют валидный гамильтонов цикл",
        };
      }

      // edgesToCycle уже проверил, что:
      // - все вершины покрыты (цикл длины n)
      // - каждая вершина имеет ровно 2 соседа
      // - цикл замкнут (последняя вершина соединена с первой)
      // Дополнительно мы проверили выше, что все рёбра правильно расшифрованы и существуют (Hij = 1)

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

  /**
   * Восстанавливает граф из матрицы смежности
   */
  private reconstructGraphFromMatrix(
    adjacencyMatrix: number[][],
    vertexCount: number
  ): Graph {
    const edges: number[][] = [];

    for (let i = 0; i < vertexCount; i++) {
      const row = adjacencyMatrix[i];
      if (!row) {
        continue;
      }
      for (let j = i + 1; j < vertexCount; j++) {
        if (row[j] === 1) {
          edges.push([i, j]);
        }
      }
    }

    const graphData: CreateGraphType = {
      vertexCount,
      edgeCount: edges.length,
      edges,
    };

    return new Graph(graphData);
  }

  verifyProof(
    proof: ZKPProof,
    originalGraph: Graph
  ): {
    valid: boolean;
    failedRound?: number;
    errorType?: string;
  } {
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
        console.error(`ОШИБКА: Раунд ${i + 1} - ${errorMsg}`);
        return {
          valid: false,
          failedRound: i + 1,
          ...(result.errorType && { errorType: result.errorType }),
        };
      }
      const challengeType = round.response?.type;
      if (challengeType === undefined) {
        return {
          valid: false,
          failedRound: i + 1,
          errorType: "Отсутствует response в раунде",
        };
      }
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
            )}], полностью расшифрован граф Н (перестановка π раскрыта)`
          );
        }
      } else {
        const response1 = round.response;
        if (response1.type === 1) {
          console.log(
            `  Раскрыто верификатору: рёбра гамильтонова цикла = ${JSON.stringify(
              response1.cycleEdges
            )} (перестановка π НЕ раскрыта)`
          );
        }
      }
    }

    return { valid: true };
  }
}
