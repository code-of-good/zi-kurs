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

### 1. Модели данных (`src/models/`)

#### `graph.ts`

- Класс `Graph`:
  - `n: number` - количество вершин
  - `m: number` - количество рёбер
  - `adjacencyList: Map<number, Set<number>>` - список смежности
  - `edges: Array<[number, number]>` - список рёбер
  - Методы:
    - `hasEdge(u: number, v: number): boolean`
    - `getNeighbors(v: number): Set<number>`
    - `isValidHamiltonianCycle(cycle: number[]): boolean`
    - `static fromFileData(data: string[][]): Graph`

#### `hamiltonian-cycle.ts`

- Тип `HamiltonianCycle = number[]` - массив вершин, образующих цикл
- Функция валидации цикла

#### `zkp-types.ts`

- `Commitment` - структура коммита (hash + дополнительные данные)
- `ProofRound` - данные одного раунда доказательства
- `ZKPProof` - полное доказательство (k раундов)
- `Challenge` - тип вызова (0 или 1)

### 2. Парсинг графа (`src/utils/graph-parser.ts`)

- `parseGraphFile(data: string[][]): Graph`
  - Парсит формат: первая строка n m, затем m строк с рёбрами
- `parseHamiltonianCycle(data: string[][]): number[]`
  - Парсит гамильтонов цикл (из отдельного файла или той же структуры)

### 3. Криптографические коммиты (`src/utils/commitment.ts`)

Используем схему коммита на основе хеширования:

- `createCommitment(data: string): Commitment`
  - Создает коммит к данным (использует crypto.createHash)
  - Возвращает hash + salt для открытия
- `openCommitment(commitment: Commitment, data: string): boolean`
  - Проверяет, что коммит соответствует данным
- `commitToGraph(graph: Graph, permutation: number[]): Commitment`
  - Коммитит к перестановленному графу
- `commitToPermutation(permutation: number[]): Commitment`
  - Коммитит к перестановке

### 4. Перестановки (`src/utils/permutation.ts`)

- `generateRandomPermutation(n: number): number[]`
  - Генерирует случайную перестановку вершин [0..n-1]
- `applyPermutation<T>(arr: T[], perm: number[]): T[]`
  - Применяет перестановку к массиву
- `applyPermutationToGraph(graph: Graph, perm: number[]): Graph`
  - Создает новый граф с переставленными вершинами
- `applyPermutationToCycle(cycle: number[], perm: number[]): number[]`
  - Применяет перестановку к циклу
- `inversePermutation(perm: number[]): number[]`
  - Вычисляет обратную перестановку

### 5. Prover (`src/prover.ts`)

Класс `Prover`:

- `constructor(graph: Graph, hamiltonianCycle: number[])`
- `generateCommitment(): { permutedGraph: Graph, permutation: number[], commitment: Commitment }`
  - Генерирует случайную перестановку, переставляет граф, создает коммит
- `respondToChallenge(challenge: Challenge, permutedGraph: Graph, permutation: number[]): ProofRound`
  - Challenge 0: возвращает перестановку и доказывает, что G' = π(G)
  - Challenge 1: возвращает только рёбра цикла в переставленном графе
- `generateProof(k: number): ZKPProof`
  - Генерирует k раундов доказательства

### 6. Verifier (`src/verifier.ts`)

Класс `Verifier`:

- `constructor(graph: Graph)`
- `generateChallenge(): Challenge`
  - Случайно выбирает 0 или 1
- `verifyRound(proofRound: ProofRound, originalGraph: Graph): boolean`
  - Challenge 0: проверяет, что G' = π(G)
  - Challenge 1: проверяет, что показанные рёбра образуют гамильтонов цикл в G'
- `verifyProof(proof: ZKPProof, originalGraph: Graph): boolean`
  - Проверяет все k раундов

### 7. Главный файл (`src/index.ts`)

Обновить для демонстрации протокола:

- Загрузка графа из файла
- Загрузка гамильтонова цикла
- Создание Prover и Verifier
- Запуск протокола с k раундами
- Вывод результатов

## Детали реализации

### Challenge 0 (Показать перестановку)

- Prover открывает коммит к перестановке
- Verifier проверяет:
  1. Коммит корректен
  2. G' действительно равен π(G)
  3. Перестановка валидна (биекция)

### Challenge 1 (Показать цикл)

- Prover открывает только рёбра гамильтонова цикла в G'
- Verifier проверяет:
  1. Показанные рёбра образуют цикл длины n
  2. Все рёбра существуют в G'
  3. НЕ раскрывается перестановка π

### Безопасность

- Используем криптографически стойкое хеширование (SHA-256)
- Случайные перестановки генерируются криптографически стойким ГСЧ
- k должно быть достаточно большим (например, 20-40 раундов)

## Порядок реализации

1. ✅ Базовые криптографические утилиты (уже есть)
2. ✅ Создать модели данных (Graph, типы для ZKP)
3. Реализовать парсер графа
4. Реализовать систему коммитов
5. Реализовать работу с перестановками
6. Реализовать Prover
7. Реализовать Verifier
8. Интегрировать всё в main
9. Тестирование на примерах

## Файлы для создания

```
src/
├── models/
│   ├── graph.ts
│   ├── hamiltonian-cycle.ts
│   └── zkp-types.ts
├── utils/
│   ├── graph-parser.ts
│   ├── commitment.ts
│   └── permutation.ts
├── prover.ts
├── verifier.ts
└── index.ts (обновить)
```
