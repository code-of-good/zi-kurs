import { filePath } from "./constants/path.js";
import { Graph } from "./models/graph.js";
import { readFromFile } from "./utils/read-from-file.js";

const main = async () => {
  const graphData = await readFromFile(filePath);
  const graph = new Graph(graphData);
  console.log(graph.getEdges());
};

main();
