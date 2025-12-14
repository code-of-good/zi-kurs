/**
 * Представление неориентированного графа
 */
export class Graph {
  private adjacencyList: Map<number, Set<number>>;
  private edgesList: Array<[number, number]>;

  constructor(n: number) {
    this.adjacencyList = new Map();
    this.edgesList = [];

    // Инициализируем список смежности для всех вершин
    for (let i = 0; i < n; i++) {
      this.adjacencyList.set(i, new Set());
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
    const newGraph = new Graph(n);

    for (const [u, v] of this.edgesList) {
      newGraph.addEdge(u, v);
    }

    return newGraph;
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

  /**
   * Создает граф из данных файла
   * Формат: первая строка - n m, затем m строк с рёбрами
   */
  static fromFileData(data: string[][]): Graph {
    if (data.length === 0) {
      throw new Error("Empty file data");
    }

    const firstLine = data[0];
    if (!firstLine || firstLine.length < 2) {
      throw new Error("First line must contain n and m");
    }

    const nStr = firstLine[0];
    const mStr = firstLine[1];
    if (!nStr || !mStr) {
      throw new Error("First line must contain n and m");
    }

    const n = parseInt(nStr, 10);
    const m = parseInt(mStr, 10);

    if (isNaN(n) || isNaN(m) || n < 0 || m < 0) {
      throw new Error(`Invalid n or m: n=${nStr}, m=${mStr}`);
    }

    if (n >= 1001) {
      throw new Error(`n must be < 1001, got ${n}`);
    }

    const graph = new Graph(n);

    // Парсим рёбра
    for (let i = 1; i <= m && i < data.length; i++) {
      const line = data[i];
      if (!line || line.length < 2) {
        throw new Error(`Edge line ${i} must contain two vertices`);
      }

      const uStr = line[0];
      const vStr = line[1];
      if (!uStr || !vStr) {
        throw new Error(`Edge line ${i} must contain two vertices`);
      }

      const u = parseInt(uStr, 10);
      const v = parseInt(vStr, 10);

      if (isNaN(u) || isNaN(v)) {
        throw new Error(`Invalid edge at line ${i + 1}: ${line.join(" ")}`);
      }

      // Вершины в файле могут быть 1-indexed, конвертируем в 0-indexed
      const u0 = u - 1;
      const v0 = v - 1;

      if (u0 < 0 || u0 >= n || v0 < 0 || v0 >= n) {
        throw new Error(
          `Edge out of range at line ${i + 1}: vertices ${u}, ${v} (n=${n})`
        );
      }

      graph.addEdge(u0, v0);
    }

    return graph;
  }
}
