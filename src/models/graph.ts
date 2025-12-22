import type { CreateGraphType } from "../utils/read-from-file.js";

export class Graph {
  private adjacencyList: Map<number, Set<number>>;
  private edgesList: Array<[number, number]>;

  constructor(input: CreateGraphType) {
    this.adjacencyList = new Map();
    this.edgesList = [];

    const { vertexCount, edges: inputEdges } = input;

    for (let i = 0; i < vertexCount; i++) {
      this.adjacencyList.set(i, new Set());
    }

    const edges: Array<[number, number]> = inputEdges.map((edge: number[]) => {
      const u = edge[0] ?? 0;
      const v = edge[1] ?? 0;
      return [u, v];
    });

    for (const [u, v] of edges) {
      this.addEdge(u, v);
    }
  }

  addEdge(u: number, v: number): void {
    if (u === v) {
      throw new Error("Self-loops are not allowed");
    }

    const uSet = this.adjacencyList.get(u);
    const vSet = this.adjacencyList.get(v);

    if (!uSet || !vSet) {
      throw new Error(`Vertex out of range: ${u} or ${v}`);
    }

    uSet.add(v);
    vSet.add(u);

    if (u < v) {
      this.edgesList.push([u, v]);
    } else {
      this.edgesList.push([v, u]);
    }
  }

  hasEdge(u: number, v: number): boolean {
    const uSet = this.adjacencyList.get(u);
    return uSet ? uSet.has(v) : false;
  }

  getNeighbors(v: number): Set<number> {
    const neighbors = this.adjacencyList.get(v);
    return neighbors ? new Set(neighbors) : new Set();
  }

  getVertexCount(): number {
    return this.adjacencyList.size;
  }

  getEdgeCount(): number {
    return this.edgesList.length;
  }

  getEdges(): Array<[number, number]> {
    return [...this.edgesList];
  }

  clone(): Graph {
    const n = this.getVertexCount();
    const edges = this.edgesList.map(([u, v]) => [u, v] as [number, number]);

    return new Graph({
      vertexCount: n,
      edgeCount: edges.length,
      edges: edges.map(([u, v]) => [u, v]),
    });
  }

  isIsomorphicTo(other: Graph, permutation: number[]): boolean {
    const n = this.getVertexCount();

    if (other.getVertexCount() !== n) {
      return false;
    }

    if (permutation.length !== n) {
      return false;
    }

    const permSet = new Set(permutation);
    if (permSet.size !== n) {
      return false;
    }

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

    const invPerm = this.inversePermutation(permutation);
    for (const [u, v] of other.getEdges()) {
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
