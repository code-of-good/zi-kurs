import { filePath, cycleFilePath } from "./constants/path.js";
import { Graph } from "./models/graph.js";
import { readFromFile, readCycleFromFile } from "./utils/read-from-file.js";
import { Prover } from "./roles/prover.js";
import { Verifier } from "./roles/verifier.js";
import { isValidHamiltonianCycle } from "./models/hamiltonian-cycle.js";
import type { Challenges } from "./types/index.js";

const challengesCount = 5;

const main = async () => {
  const graphData = await readFromFile(filePath);
  const graph = new Graph(graphData);

  const hamiltonianCycle = await readCycleFromFile(cycleFilePath);

  const isValid = isValidHamiltonianCycle(hamiltonianCycle, graph);
  if (!isValid) {
    console.error("ОШИБКА: Цикл невалиден!");
    return;
  }

  console.log(
    `Граф: ${graph.getVertexCount()} вершин, ${graph.getEdgeCount()} рёбер`
  );
  console.log(`Известный доказывающему цикл: [${hamiltonianCycle.join(", ")}]`);
  console.log();

  const prover = new Prover(graph, hamiltonianCycle);
  const verifier = new Verifier(graph);

  const challenges: Challenges = [];
  for (let i = 0; i < challengesCount; i++) {
    challenges.push(verifier.generateChallenge());
  }

  const proof = prover.generateProof(challengesCount, challenges);

  const result = verifier.verifyProof(proof, graph);

  console.log();
  if (result.valid) {
    console.log("РЕЗУЛЬТАТ: Доказательство ПРИНЯТО");
  } else {
    console.log(
      `РЕЗУЛЬТАТ: Доказательство ОТВЕРГНУТО на раунде ${result.failedRound}`
    );
  }
};

main().catch(console.error);
