import { filePath } from "./constants/path.js";
import { Graph } from "./models/graph.js";
import { readFromFile } from "./utils/read-from-file.js";
import { Prover } from "./roles/prover.js";
import { isValidHamiltonianCycle } from "./models/hamiltonian-cycle.js";

const main = async () => {
  console.log("=== ZKP Demo: Гамильтонов цикл ===\n");

  // 1. Загружаем граф из файла
  console.log("1. Загрузка графа...");
  const graphData = await readFromFile(filePath);
  const graph = new Graph(graphData);
  console.log(
    `   Граф загружен: ${graph.getVertexCount()} вершин, ${graph.getEdgeCount()} рёбер`
  );
  console.log(`   Рёбра:`, graph.getEdges());
  console.log();

  // 2. Определяем гамильтонов цикл (для графа из example/1.txt)
  // Граф: 5 вершин, цикл [0, 1, 2, 3, 4]
  const hamiltonianCycle = [0, 1, 2, 3, 4];

  console.log("2. Проверка гамильтонова цикла...");
  const isValid = isValidHamiltonianCycle(hamiltonianCycle, graph);
  if (!isValid) {
    console.error("   ОШИБКА: Цикл невалиден!");
    return;
  }
  console.log(`   Цикл валиден:`, hamiltonianCycle);
  console.log();

  // 3. Создаем Prover
  console.log("3. Создание Prover...");
  const prover = new Prover(graph, hamiltonianCycle);
  console.log("   Prover создан (знает секретный цикл)");
  console.log();

  // 4. Демонстрация generateCommitment (Шаг 1 протокола)
  console.log("4. Генерация коммита (Шаг 1 протокола)...");
  const { permutedGraph, permutation, commitment } =
    prover.generateCommitment();
  console.log(`   Перестановка π:`, permutation);
  console.log(`   Коммит (hash):`, commitment.hash.substring(0, 16) + "...");
  console.log(
    `   Перестановленный граф G' имеет ${permutedGraph.getEdgeCount()} рёбер`
  );
  console.log(`   Рёбра G':`, permutedGraph.getEdges());
  console.log();

  // 5. Демонстрация Challenge 0 (показать перестановку)
  console.log("5. Демонстрация Challenge 0 (показать перестановку)...");
  const response0 = prover.respondToChallenge(0, permutedGraph, permutation);
  if (response0.type === 0) {
    console.log(`   Prover открыл перестановку π:`, response0.permutation);
    console.log(`   Prover открыл все рёбра G':`, response0.permutedGraphEdges);
    console.log("   Verifier может проверить, что G' = π(G)");
  }
  console.log();

  // 6. Демонстрация Challenge 1 (показать только цикл)
  console.log("6. Демонстрация Challenge 1 (показать только цикл)...");
  const response1 = prover.respondToChallenge(1, permutedGraph, permutation);
  if (response1.type === 1) {
    console.log(
      `   Prover открыл только рёбра цикла H' в G':`,
      response1.cycleEdges
    );
    console.log("   Перестановка π НЕ раскрыта!");
    console.log(
      "   Verifier может проверить, что это валидный гамильтонов цикл в G'"
    );
  }
  console.log();

  // 7. Демонстрация generateProof (k раундов)
  console.log("7. Генерация полного доказательства (k=3 раунда)...");
  const challenges: (0 | 1)[] = [0, 1, 0]; // Verifier выбирает challenges
  const proof = prover.generateProof(3, challenges);
  console.log(`   Сгенерировано ${proof.k} раундов доказательства`);

  proof.rounds.forEach((round, i) => {
    console.log(`   Раунд ${i + 1}:`);
    console.log(
      `     Challenge: ${
        round.response.type === 0 ? "0 (показать π)" : "1 (показать цикл)"
      }`
    );
    console.log(`     Коммит: ${round.commitment.hash.substring(0, 16)}...`);
    if (round.response.type === 0) {
      console.log(`     Ответ: перестановка и все рёбра G'`);
    } else {
      console.log(
        `     Ответ: только рёбра цикла (${round.response.cycleEdges.length} рёбер)`
      );
    }
  });
  console.log();

  console.log("=== Демо завершено ===");
  console.log(
    "\nПримечание: Verifier еще не реализован, поэтому проверка коммитов не выполняется."
  );
  console.log(
    "Следующий шаг: реализовать Verifier для полной проверки доказательства."
  );
};

main().catch(console.error);
