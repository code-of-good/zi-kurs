import { filePath } from "./constants/path.js";
import { readFromFile } from "./utils/read-from-file.js";

const main = async () => {
  const matrix = await readFromFile(filePath);
  console.log(matrix);
};

main();
