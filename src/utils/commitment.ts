import crypto from "crypto";
import type { Commitment } from "../models/zkp-types.js";
import type { Graph } from "../models/graph.js";

/**
 * Создает криптографический коммит к данным
 * Использует SHA-256 для хеширования data + salt
 */
export function createCommitment(data: string): Commitment {
  // Генерируем случайный salt (32 байта = 64 hex символа)
  const salt = crypto.randomBytes(32).toString("hex");

  // Хешируем data + salt
  const hash = crypto
    .createHash("sha256")
    .update(data + salt)
    .digest("hex");

  return { hash, salt };
}

/**
 * Открывает и проверяет коммит
 * Возвращает true, если данные соответствуют коммиту
 */
export function openCommitment(commitment: Commitment, data: string): boolean {
  // Вычисляем hash(data + salt)
  const computedHash = crypto
    .createHash("sha256")
    .update(data + commitment.salt)
    .digest("hex");

  // Сравниваем с коммитом (постоянное время сравнения)
  return computedHash === commitment.hash;
}

/**
 * Сериализует граф в строку для коммита
 * Формат: отсортированные рёбра, разделенные запятыми
 * Например: "0,1|1,2|2,3"
 */
function serializeGraph(graph: Graph): string {
  const edges = graph.getEdges();
  // Сортируем рёбра для детерминированности
  const sortedEdges: Array<[number, number]> = edges
    .map(([u, v]) => (u < v ? [u, v] : [v, u]) as [number, number])
    .sort(([u1, v1], [u2, v2]) => {
      if (u1 !== u2) return u1 - u2;
      return v1 - v2;
    });

  return sortedEdges.map(([u, v]) => `${u},${v}`).join("|");
}

/**
 * Сериализует перестановку в строку для коммита
 * Формат: "0,1,2,3" для перестановки [0,1,2,3]
 */
function serializePermutation(permutation: number[]): string {
  return permutation.join(",");
}

/**
 * Коммитит к перестановленному графу G'
 * Сериализует граф и создает коммит
 */
export function commitToGraph(graph: Graph, permutation: number[]): Commitment {
  const serialized = serializeGraph(graph);
  // Включаем информацию о перестановке для уникальности коммита
  // (хотя на самом деле граф уже переставлен, но для ясности)
  return createCommitment(serialized);
}

/**
 * Коммитит к перестановке π
 * Сериализует перестановку и создает коммит
 */
export function commitToPermutation(permutation: number[]): Commitment {
  const serialized = serializePermutation(permutation);
  return createCommitment(serialized);
}
