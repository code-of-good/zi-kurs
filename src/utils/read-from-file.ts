import { readFile } from "fs/promises";
import { join } from "path";

export const readFromFile = async (filePath: string): Promise<string[][]> => {
  const content = await readFile(filePath, "utf-8");
  const lines = content.trim().split("\n");

  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.trim().split(/\s+/));
};
