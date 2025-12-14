import { filePath } from "./constants/path.js";
import { Graph } from "./models/graph.js";
import { readFromFile } from "./utils/read-from-file.js";
import { Prover } from "./roles/prover.js";
import { Verifier } from "./roles/verifier.js";
import { isValidHamiltonianCycle } from "./models/hamiltonian-cycle.js";

const main = async () => {
  // 1. Загружаем граф из файла
  const graphData = await readFromFile(filePath);
  const graph = new Graph(graphData);

  // 2. Определяем гамильтонов цикл (для графа из example/1.txt)
  // Граф: 5 вершин, цикл [0, 1, 2, 3, 4]
  const hamiltonianCycle = [0, 1, 2, 3, 4];

  const isValid = isValidHamiltonianCycle(hamiltonianCycle, graph);
  if (!isValid) {
    console.error("ОШИБКА: Цикл невалиден!");
    return;
  }

  // 3. Создаем Prover
  const prover = new Prover(graph, hamiltonianCycle);

  // 4. Демонстрация generateCommitment (Шаг 1 протокола)
  const { permutedGraph, permutation } = prover.generateCommitment();

  // 5. Демонстрация Challenge 0 (показать перестановку)
  prover.respondToChallenge(0, permutedGraph, permutation);

  // 6. Демонстрация Challenge 1 (показать только цикл)
  prover.respondToChallenge(1, permutedGraph, permutation);

  // 7. Полный протокол ZKP с Verifier
  const verifier = new Verifier(graph);

  // Verifier генерирует challenges
  const k = 5; // Количество раундов
  const challenges: (0 | 1)[] = [];
  for (let i = 0; i < k; i++) {
    challenges.push(verifier.generateChallenge());
  }

  // Prover генерирует доказательство
  const proof = prover.generateProof(k, challenges);

  // Verifier проверяет доказательство
  const proofIsValid = verifier.verifyProof(proof, graph);

  if (proofIsValid) {
    console.log(`✓ ДОКАЗАТЕЛЬСТВО ПРИНЯТО!`);
  } else {
    console.log(`✗ ДОКАЗАТЕЛЬСТВО ОТКЛОНЕНО!`);
  }
};

main().catch(console.error);
