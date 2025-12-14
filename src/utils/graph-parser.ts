import { readFile } from "fs/promises";
import type { HamiltonianCycle } from "../models/hamiltonian-cycle.js";

/**
 * Парсит гамильтонов цикл из файла
 * Формат: одна строка с последовательностью вершин (0-indexed)
 * Например: "0 1 2 3 4" или "0 1 2 3 4 0"
 */
export async function parseHamiltonianCycle(
  filePath: string
): Promise<HamiltonianCycle> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.trim().split("\n");

  if (lines.length === 0) {
    throw new Error("Empty file data for Hamiltonian cycle");
  }

  // Берём первую строку как цикл
  const firstLine = lines[0];
  if (!firstLine || firstLine.trim().length === 0) {
    throw new Error("First line must contain cycle vertices");
  }

  // Парсим вершины (они уже в 0-indexed формате)
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
