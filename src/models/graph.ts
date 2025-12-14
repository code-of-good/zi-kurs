import type { CreateGraphType } from "../utils/read-from-file.js";

/**
 * Представление неориентированного графа
 */
export class Graph {
  private adjacencyList: Map<number, Set<number>>;
  private edgesList: Array<[number, number]>;

  constructor(input: CreateGraphType) {
    this.adjacencyList = new Map();
    this.edgesList = [];

    const { vertexCount, edges: inputEdges } = input;

    // Инициализируем список смежности для всех вершин
    for (let i = 0; i < vertexCount; i++) {
      this.adjacencyList.set(i, new Set());
    }

    // Конвертируем number[][] в [number, number][] (вершины уже 0-indexed)
    // Нормализация порядка произойдёт в addEdge
    const edges: Array<[number, number]> = inputEdges
      .filter((edge: number[]) => edge.length >= 2)
      .map((edge: number[]) => {
        const u = edge[0] ?? 0;
        const v = edge[1] ?? 0;
        return [u, v];
      });

    // Добавляем рёбра (addEdge сам нормализует порядок)
    for (const [u, v] of edges) {
      this.addEdge(u, v);
    }
  }

  /**
   * Добавляет неориентированное ребро между вершинами u и v
   */
  addEdge(u: number, v: number): void {
    if (u === v) {
      throw new Error("Self-loops are not allowed");
    }

    const uSet = this.adjacencyList.get(u);
    const vSet = this.adjacencyList.get(v);

    if (!uSet || !vSet) {
      throw new Error(`Vertex out of range: ${u} or ${v}`);
    }

    // Добавляем в обе стороны (неориентированный граф)
    uSet.add(v);
    vSet.add(u);

    // Добавляем в список рёбер (только одно направление, чтобы избежать дубликатов)
    if (u < v) {
      this.edgesList.push([u, v]);
    } else {
      this.edgesList.push([v, u]);
    }
  }

  /**
   * Проверяет наличие ребра между вершинами u и v
   */
  hasEdge(u: number, v: number): boolean {
    const uSet = this.adjacencyList.get(u);
    return uSet ? uSet.has(v) : false;
  }

  /**
   * Возвращает множество соседей вершины v
   */
  getNeighbors(v: number): Set<number> {
    const neighbors = this.adjacencyList.get(v);
    return neighbors ? new Set(neighbors) : new Set();
  }

  /**
   * Возвращает количество вершин
   */
  getVertexCount(): number {
    return this.adjacencyList.size;
  }

  /**
   * Возвращает количество рёбер
   */
  getEdgeCount(): number {
    return this.edgesList.length;
  }

  /**
   * Возвращает список всех рёбер
   */
  getEdges(): Array<[number, number]> {
    return [...this.edgesList];
  }

  /**
   * Возвращает копию графа
   */
  clone(): Graph {
    const n = this.getVertexCount();
    // Рёбра уже в 0-indexed формате
    const edges = this.edgesList.map(([u, v]) => [u, v] as [number, number]);

    return new Graph({
      vertexCount: n,
      edgeCount: edges.length,
      edges: edges.map(([u, v]) => [u, v]),
    });
  }

  /**
   * Проверяет, что два графа изоморфны (имеют одинаковую структуру)
   * Используется для проверки, что G' = π(G)
   */
  isIsomorphicTo(other: Graph, permutation: number[]): boolean {
    const n = this.getVertexCount();

    if (other.getVertexCount() !== n) {
      return false;
    }

    if (permutation.length !== n) {
      return false;
    }

    // Проверяем, что permutation - валидная перестановка
    const permSet = new Set(permutation);
    if (permSet.size !== n) {
      return false;
    }

    // Проверяем, что каждое ребро (u, v) в this соответствует ребру (π(u), π(v)) в other
    for (const [u, v] of this.edgesList) {
      const permU = permutation[u];
      const permV = permutation[v];

      if (permU === undefined || permV === undefined) {
        return false;
      }

      if (!other.hasEdge(permU, permV)) {
        return false;
      }
    }

    // Проверяем обратное: каждое ребро в other должно соответствовать ребру в this
    // Вычисляем обратную перестановку один раз
    const invPerm = this.inversePermutation(permutation);
    for (const [u, v] of other.getEdges()) {
      // Находим оригинальные вершины через обратную перестановку
      const origU = invPerm[u];
      const origV = invPerm[v];

      if (origU === undefined || origV === undefined) {
        return false;
      }

      if (!this.hasEdge(origU, origV)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Вычисляет обратную перестановку
   */
  private inversePermutation(perm: number[]): number[] {
    const inv: number[] = new Array(perm.length);
    for (let i = 0; i < perm.length; i++) {
      const permValue = perm[i];
      if (permValue === undefined) {
        throw new Error("Invalid permutation: undefined value");
      }
      inv[permValue] = i;
    }
    return inv;
  }
}
