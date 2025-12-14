import { readFile } from "fs/promises";

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
