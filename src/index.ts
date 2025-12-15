import { filePath, cycleFilePath } from "./constants/path.js";
import { Graph } from "./models/graph.js";
import { readFromFile, readCycleFromFile } from "./utils/read-from-file.js";
import { Prover } from "./roles/prover.js";
import { Verifier } from "./roles/verifier.js";
import { isValidHamiltonianCycle } from "./models/hamiltonian-cycle.js";

const main = async () => {
  // 1. Загружаем граф из файла
  const graphData = await readFromFile(filePath);
  const graph = new Graph(graphData);

  // 2. Загружаем гамильтонов цикл из файла
  const hamiltonianCycle = await readCycleFromFile(cycleFilePath);

  const isValid = isValidHamiltonianCycle(hamiltonianCycle, graph);
  if (!isValid) {
    console.error("ОШИБКА: Цикл невалиден!");
    return;
  }

  // Выводим информацию о графе
  console.log(
    `Граф: ${graph.getVertexCount()} вершин, ${graph.getEdgeCount()} рёбер`
  );
  console.log(`Известный доказывающему цикл: [${hamiltonianCycle.join(", ")}]`);
  console.log();

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

  // Выводим параметры протокола
  console.log(
    `Параметры протокола: ${k} раундов (вероятность обмана: 1/2^${k} ≈ ${Math.pow(
      2,
      -k
    )})`
  );

  console.log();

  // Prover генерирует доказательство
  const proof = prover.generateProof(k, challenges);

  // Verifier проверяет доказательство
  const result = verifier.verifyProof(proof, graph);

  // Выводим финальный результат
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
