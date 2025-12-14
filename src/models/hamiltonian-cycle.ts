import type { Graph } from "./graph.js";

/**
 * Гамильтонов цикл - последовательность вершин, образующих цикл
 */
export type HamiltonianCycle = number[];

/**
 * Проверяет, является ли последовательность вершин валидным гамильтоновым циклом в графе
 */
export function isValidHamiltonianCycle(
  cycle: HamiltonianCycle,
  graph: Graph
): boolean {
  const n = graph.getVertexCount();

  // Цикл должен содержать все вершины ровно один раз
  if (cycle.length !== n) {
    return false;
  }

  // Проверяем, что все вершины уникальны
  const seen = new Set<number>();
  for (const vertex of cycle) {
    if (vertex < 0 || vertex >= n) {
      return false; // Вершина вне диапазона
    }
    if (seen.has(vertex)) {
      return false; // Дубликат вершины
    }
    seen.add(vertex);
  }

  // Проверяем, что последовательные вершины соединены рёбрами
  for (let i = 0; i < n; i++) {
    const current = cycle[i];
    const next = cycle[(i + 1) % n]; // Замыкаем цикл

    if (current === undefined || next === undefined) {
      return false;
    }

    if (!graph.hasEdge(current, next)) {
      return false;
    }
  }

  return true;
}
