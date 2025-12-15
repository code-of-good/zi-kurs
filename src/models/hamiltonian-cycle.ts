import type { Graph } from "./graph.js";

export type HamiltonianCycle = number[];

export function isValidHamiltonianCycle(
  cycle: HamiltonianCycle,
  graph: Graph
): boolean {
  const n = graph.getVertexCount();

  if (cycle.length !== n) {
    return false;
  }

  const seen = new Set<number>();
  for (const vertex of cycle) {
    if (vertex < 0 || vertex >= n) {
      return false;
    }
    if (seen.has(vertex)) {
      return false;
    }
    seen.add(vertex);
  }

  for (let i = 0; i < n; i++) {
    const current = cycle[i];
    const next = cycle[(i + 1) % n];

    if (current === undefined || next === undefined) {
      return false;
    }

    if (!graph.hasEdge(current, next)) {
      return false;
    }
  }

  return true;
}
