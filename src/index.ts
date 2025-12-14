import { filePath } from "./constants/path.js";
import { Graph } from "./models/graph.js";
import { readFromFile } from "./utils/read-from-file.js";
import { Prover } from "./roles/prover.js";
import { Verifier } from "./roles/verifier.js";
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

  // 7. Полный протокол ZKP с Verifier
  console.log("7. Полный протокол ZKP с Verifier");
  console.log("=".repeat(60));

  // Создаем Verifier
  const verifier = new Verifier(graph);
  console.log("\nVerifier создан (знает граф G, но не знает цикл)");

  // Verifier генерирует challenges
  const k = 5; // Количество раундов
  const challenges: (0 | 1)[] = [];
  for (let i = 0; i < k; i++) {
    challenges.push(verifier.generateChallenge());
  }
  console.log(`\nVerifier выбрал ${k} challenges: ${challenges.join(", ")}`);
  console.log("  (0 = показать перестановку, 1 = показать цикл)");

  // Prover генерирует доказательство
  console.log("\nProver генерирует доказательство...");
  const proof = prover.generateProof(k, challenges);

  // Verifier проверяет доказательство
  console.log("\n" + "=".repeat(60));
  const proofIsValid = verifier.verifyProof(proof, graph);

  console.log(`\n${"=".repeat(60)}`);
  console.log("ФИНАЛЬНЫЙ РЕЗУЛЬТАТ");
  console.log("=".repeat(60));
  if (proofIsValid) {
    console.log(`\n✓ ДОКАЗАТЕЛЬСТВО ПРИНЯТО!`);
    console.log(`  Prover успешно доказал знание гамильтонова цикла`);
    console.log(`  Вероятность обмана: 2^(-${k}) = ${Math.pow(2, -k)}`);
    console.log(`  Verifier НЕ узнал исходный цикл (zero-knowledge) ✓`);
  } else {
    console.log(`\n✗ ДОКАЗАТЕЛЬСТВО ОТКЛОНЕНО!`);
    console.log(`  Prover не смог доказать знание цикла`);
  }
  console.log();
};

main().catch(console.error);
