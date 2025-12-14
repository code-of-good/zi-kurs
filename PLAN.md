# План реализации ZKP для Гамильтонова цикла

## Обзор протокола

Протокол доказательства с нулевым разглашением для гамильтонова цикла работает следующим образом:

1. **Prover** знает гамильтонов цикл в графе G
2. **Prover** создает случайную перестановку π вершин графа
3. **Prover** создает перестановленный граф G' = π(G) и коммитит к нему
4. **Verifier** выбирает случайный вызов (challenge):
   - **Challenge 0**: Показать перестановку π и доказать, что G' = π(G)
   - **Challenge 1**: Показать только рёбра гамильтонова цикла в G' (без раскрытия π)
5. Процесс повторяется k раз для достижения вероятности обмана 2^(-k)

## Структура реализации

### 1. Модели данных (`src/models/`) ✅

#### `graph.ts` ✅

- Класс `Graph`:
  - `adjacencyList: Map<number, Set<number>>` - список смежности
  - `edgesList: Array<[number, number]>` - список рёбер
  - Методы:
    - `hasEdge(u: number, v: number): boolean` ✅
    - `getNeighbors(v: number): Set<number>` ✅
    - `getVertexCount(): number` ✅
    - `getEdgeCount(): number` ✅
    - `getEdges(): Array<[number, number]>` ✅
    - `clone(): Graph` ✅
    - `isIsomorphicTo(other: Graph, permutation: number[]): boolean` ✅

#### `hamiltonian-cycle.ts` ✅

- Тип `HamiltonianCycle = number[]` ✅
- Функция `isValidHamiltonianCycle(cycle: HamiltonianCycle, graph: Graph): boolean` ✅

#### `zkp-types.ts` ✅

- `Challenge = 0 | 1` ✅
- `Commitment` (hash + salt) ✅
- `ProofRound` ✅
- `ProofResponse` ✅
- `ZKPProof` ✅

### 2. Парсинг графа ✅

- `readFromFile(filePath: string): Promise<CreateGraphType>` ✅
  - Читает файл и парсит формат: первая строка n m, затем m строк с рёбрами
  - Возвращает структурированные данные для конструктора Graph
- Конструктор `Graph(input: CreateGraphType)` ✅
  - Создает граф из распарсенных данных

### 3. Криптографические коммиты (`src/utils/commitment.ts`) ✅

Используем схему коммита на основе хеширования (SHA-256):

- `createCommitment(data: string): Commitment`
  - Создает коммит к данным (использует crypto.createHash)
  - Генерирует случайный salt и хеширует data + salt
  - Возвращает hash + salt
- `openCommitment(commitment: Commitment, data: string): boolean`
  - Проверяет, что коммит соответствует данным
  - Вычисляет hash(data + salt) и сравнивает с commitment.hash
- `commitToGraph(graph: Graph, permutation: number[]): Commitment`
  - Сериализует перестановленный граф в строку
  - Коммитит к перестановленному графу G'
- `commitToPermutation(permutation: number[]): Commitment`
  - Сериализует перестановку в строку
  - Коммитит к перестановке π

### 4. Перестановки (`src/utils/permutation.ts`) ✅

- `generateRandomPermutation(n: number): number[]`
  - Генерирует случайную перестановку вершин [0..n-1]
  - Использует crypto.randomBytes для криптографически стойкого ГСЧ
- `applyPermutationToGraph(graph: Graph, perm: number[]): Graph`
  - Создает новый граф G' = π(G) с переставленными вершинами
  - Для каждого ребра (u, v) в G создает ребро (π(u), π(v)) в G'
- `applyPermutationToCycle(cycle: number[], perm: number[]): number[]`
  - Применяет перестановку к циклу: для каждой вершины v в cycle возвращает π(v)
- `inversePermutation(perm: number[]): number[]`
  - Вычисляет обратную перестановку π^(-1)
  - Используется в Graph.isIsomorphicTo для проверки изоморфизма

### 5. Prover (`src/prover.ts`) ✅

Класс `Prover`:

- `constructor(graph: Graph, hamiltonianCycle: number[])`
  - Сохраняет оригинальный граф и гамильтонов цикл
- `generateCommitment(): { permutedGraph: Graph, permutation: number[], commitment: Commitment }`
  - Генерирует случайную перестановку π
  - Создает перестановленный граф G' = π(G)
  - Создает коммит к G' (commitToGraph)
  - Возвращает все три значения
- `respondToChallenge(challenge: Challenge, permutedGraph: Graph, permutation: number[]): ProofResponse`
  - Challenge 0: возвращает `{ type: 0, permutation, permutedGraphEdges }`
    - Открывает перестановку π
    - Открывает все рёбра перестановленного графа G'
  - Challenge 1: возвращает `{ type: 1, cycleEdges }`
    - Применяет перестановку к циклу: cycle' = π(cycle)
    - Возвращает только рёбра цикла в G' (без раскрытия π)
- `generateProof(k: number, challenges: Challenge[]): ZKPProof`
  - Генерирует k раундов доказательства
  - Принимает массив challenges длины k
  - Для каждого раунда: создает коммит, получает challenge из массива, формирует response

### 6. Verifier (`src/roles/verifier.ts`) ✅

Класс `Verifier`:

- `constructor(graph: Graph)`
  - Сохраняет оригинальный граф G
- `generateChallenge(): Challenge`
  - Случайно выбирает 0 или 1 (использует crypto.randomBytes)
- `verifyRound(proofRound: ProofRound, originalGraph: Graph): boolean`
  - Проверяет коммит (openCommitment)
  - Challenge 0:
    1. Проверяет, что перестановка валидна (биекция [0..n-1])
    2. Восстанавливает G' из permutedGraphEdges
    3. Проверяет, что G' = π(G) через Graph.isIsomorphicTo
  - Challenge 1:
    1. Восстанавливает граф G' из коммита (если нужно) или использует сохраненный
    2. Проверяет, что cycleEdges образуют валидный гамильтонов цикл в G'
    3. Использует isValidHamiltonianCycle для проверки
- `verifyProof(proof: ZKPProof, originalGraph: Graph): boolean`
  - Проверяет, что proof.k === proof.rounds.length
  - Проверяет все k раундов через verifyRound
  - Возвращает true только если все раунды прошли проверку

### 7. Главный файл (`src/index.ts`) ⏳

Обновить для демонстрации протокола:

- Загрузка графа из файла (уже есть через readFromFile)
- Загрузка гамильтонова цикла (из файла или хардкод для теста)
- Создание Prover и Verifier
- Запуск протокола с k раундами (например, k=20)
- Вывод результатов (успех/неудача верификации)

## Детали реализации

### Challenge 0 (Показать перестановку)

- Prover открывает:
  - Перестановку π
  - Все рёбра перестановленного графа G'
- Verifier проверяет:
  1. Коммит корректен (openCommitment)
  2. Перестановка валидна (биекция [0..n-1])
  3. G' действительно равен π(G) через Graph.isIsomorphicTo

### Challenge 1 (Показать цикл)

- Prover открывает:
  - Только рёбра гамильтонова цикла в G' (без раскрытия π)
- Verifier проверяет:
  1. Коммит корректен (openCommitment для G')
  2. Показанные рёбра образуют валидный гамильтонов цикл длины n в G'
  3. Использует isValidHamiltonianCycle для проверки
  4. НЕ раскрывается перестановка π (только рёбра цикла)

### Безопасность

- Используем криптографически стойкое хеширование (SHA-256)
- Случайные перестановки генерируются криптографически стойким ГСЧ
- k должно быть достаточно большим (например, 20-40 раундов)

## Порядок реализации

1. ✅ Базовые криптографические утилиты (crypto.ts - есть, но для других целей)
2. ✅ Модели данных (Graph, HamiltonianCycle, ZKP типы)
3. ✅ Парсинг графа (readFromFile + конструктор Graph)
4. ✅ Реализовать систему коммитов (`src/utils/commitment.ts`)
5. ✅ Реализовать работу с перестановками (`src/utils/permutation.ts`)
6. ✅ Реализовать Prover (`src/prover.ts`)
7. ✅ Реализовать Verifier (`src/roles/verifier.ts`)
8. ✅ Интегрировать всё в main (`src/index.ts`)
9. ⏳ Тестирование на примерах

## Файлы для создания

```
src/
├── models/ ✅
│   ├── graph.ts ✅
│   ├── hamiltonian-cycle.ts ✅
│   └── zkp-types.ts ✅
├── utils/
│   ├── read-from-file.ts ✅
│   ├── crypto.ts ✅ (но для других целей)
│   ├── commitment.ts ✅
│   └── permutation.ts ✅
├── prover.ts ✅
├── roles/
│   ├── prover.ts ✅
│   └── verifier.ts ✅
└── index.ts ✅ (обновлен)
```
