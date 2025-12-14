import { filePath } from "./constants/path.js";
import { readFromFile } from "./utils/read-from-file.js";

const main = () => {
  const martrix = readFromFile(filePath);
};

main();
