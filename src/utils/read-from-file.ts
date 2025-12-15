import { readFile } from "fs/promises";
import type { HamiltonianCycle } from "../models/hamiltonian-cycle.js";

export type CreateGraphType = {
  vertexCount: number;
  edgeCount: number;
  edges: number[][];
};

export const readFromFile = async (
  filePath: string
): Promise<CreateGraphType> => {
  const content = await readFile(filePath, "utf-8");
  const lines: string[][] = content
    .trim()
    .split("\n")
    .map((el) => el.split(" "));

  const firstLine = lines[0];
  if (!firstLine || firstLine.length < 2) {
    throw new Error("First line must contain n and m");
  }

  const vertexCountStr = firstLine[0];
  const edgeCountStr = firstLine[1];
  if (!vertexCountStr || !edgeCountStr) {
    throw new Error("First line must contain n and m");
  }

  return {
    vertexCount: Number(vertexCountStr),
    edgeCount: Number(edgeCountStr),
    edges: lines.slice(1).map((el) => el.map((item) => Number(item))),
  };
};

/**
 * Читает гамильтонов цикл из текстового файла
 * Формат: одна строка с последовательностью вершин (0-indexed)
 * Например: "0 1 2 3 4" или "0 1 2 3 4 0"
 */
export const readCycleFromFile = async (
  filePath: string
): Promise<HamiltonianCycle> => {
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
};
