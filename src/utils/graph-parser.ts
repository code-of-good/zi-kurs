import { readFile } from "fs/promises";
import type { HamiltonianCycle } from "../models/hamiltonian-cycle.js";

export async function parseHamiltonianCycle(
  filePath: string
): Promise<HamiltonianCycle> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.trim().split("\n");

  if (lines.length === 0) {
    throw new Error("Empty file data for Hamiltonian cycle");
  }

  const firstLine = lines[0];
  if (!firstLine || firstLine.trim().length === 0) {
    throw new Error("First line must contain cycle vertices");
  }

  const cycle: number[] = firstLine
    .trim()
    .split(/\s+/)
    .map((vertexStr) => {
      const vertex = parseInt(vertexStr, 10);
      if (isNaN(vertex)) {
        throw new Error(`Invalid vertex in cycle: ${vertexStr}`);
      }
      return vertex;
    })
    .filter((vertex) => !isNaN(vertex));

  if (cycle.length === 0) {
    throw new Error("Cycle must contain at least one vertex");
  }

  return cycle;
}
