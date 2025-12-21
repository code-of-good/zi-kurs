import crypto from "crypto";
import type { Graph } from "../models/graph.js";
import { rsaEncrypt, rsaDecrypt, type RSAKeys } from "./crypto.js";

/**
 * Получает матрицу смежности графа
 * @param graph граф
 * @returns матрица смежности (n x n), где 1 означает наличие ребра, 0 - отсутствие
 */
export function getAdjacencyMatrix(graph: Graph): number[][] {
  const n = graph.getVertexCount();
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    const row: number[] = new Array(n);
    for (let j = 0; j < n; j++) {
      row[j] = graph.hasEdge(i, j) ? 1 : 0;
    }
    matrix[i] = row;
  }

  return matrix;
}

/**
 * Кодирует матрицу смежности случайными числами
 * H'ij = rij || Hij (конкатенация случайного числа и элемента матрицы)
 * @param matrix матрица смежности (0 или 1)
 * @param randomBits количество бит для случайного числа (по умолчанию 64)
 * @returns объект с закодированной матрицей и случайными числами
 */
export function encodeMatrixWithRandom(
  matrix: number[][],
  randomBits: number = 64
): {
  encodedMatrix: bigint[][];
  randomNumbers: bigint[][];
} {
  const n = matrix.length;
  const encodedMatrix: bigint[][] = [];
  const randomNumbers: bigint[][] = [];

  for (let i = 0; i < n; i++) {
    const encodedRow: bigint[] = [];
    const randomRow: bigint[] = [];
    const row = matrix[i];
    if (!row) {
      throw new Error(`Matrix row ${i} is undefined`);
    }
    for (let j = 0; j < n; j++) {
      // Генерируем случайное число rij
      const rij = BigInt(
        "0x" + crypto.randomBytes(Math.ceil(randomBits / 8)).toString("hex")
      );
      randomRow[j] = rij;

      // H'ij = rij || Hij (конкатенация: rij * 10 + Hij)
      // Для больших чисел используем сдвиг битов: rij << 1 | Hij
      // Но проще использовать строковую конкатенацию и преобразование
      const hij = BigInt(row[j] ?? 0);
      // Конкатенация: rij * (max(Hij) + 1) + Hij
      // Поскольку Hij может быть 0 или 1, используем: rij * 2 + Hij
      const encoded = rij * 2n + hij;
      encodedRow[j] = encoded;
    }
    encodedMatrix[i] = encodedRow;
    randomNumbers[i] = randomRow;
  }

  return { encodedMatrix, randomNumbers };
}

/**
 * Декодирует закодированную матрицу, извлекая исходные значения
 * @param encodedMatrix закодированная матрица
 * @param randomNumbers случайные числа, использованные при кодировании
 * @returns исходная матрица смежности (0 или 1)
 */
export function decodeMatrix(
  encodedMatrix: bigint[][],
  randomNumbers: bigint[][]
): number[][] {
  const n = encodedMatrix.length;
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    const encodedRow = encodedMatrix[i];
    if (!encodedRow) {
      throw new Error(`Encoded matrix row ${i} is undefined`);
    }
    for (let j = 0; j < n; j++) {
      // H'ij = rij * 2 + Hij, поэтому Hij = H'ij mod 2
      const encodedValue = encodedRow[j];
      if (encodedValue === undefined) {
        throw new Error(`Encoded matrix value at [${i}, ${j}] is undefined`);
      }
      const hij = Number(encodedValue % 2n);
      row[j] = hij;
    }
    matrix[i] = row;
  }

  return matrix;
}

/**
 * Шифрует закодированную матрицу с помощью RSA
 * Fij = (H'ij)^d mod N
 * @param encodedMatrix закодированная матрица
 * @param keys RSA ключи (используется d и N)
 * @returns зашифрованная матрица F
 */
export function encryptMatrix(
  encodedMatrix: bigint[][],
  keys: RSAKeys
): bigint[][] {
  const n = encodedMatrix.length;
  const encryptedMatrix: bigint[][] = [];

  for (let i = 0; i < n; i++) {
    const encryptedRow: bigint[] = [];
    const encodedRow = encodedMatrix[i];
    if (!encodedRow) {
      throw new Error(`Encoded matrix row ${i} is undefined`);
    }
    for (let j = 0; j < n; j++) {
      // Fij = (H'ij)^d mod N
      const encodedValue = encodedRow[j];
      if (encodedValue === undefined) {
        throw new Error(`Encoded matrix value at [${i}, ${j}] is undefined`);
      }
      encryptedRow[j] = rsaEncrypt(encodedValue, keys.d, keys.N);
    }
    encryptedMatrix[i] = encryptedRow;
  }

  return encryptedMatrix;
}

/**
 * Расшифровывает зашифрованную матрицу с помощью RSA
 * H'ij = (Fij)^e mod N
 * @param encryptedMatrix зашифрованная матрица F
 * @param keys RSA ключи (используется e и N)
 * @returns расшифрованная закодированная матрица H'
 */
export function decryptMatrix(
  encryptedMatrix: bigint[][],
  keys: RSAKeys
): bigint[][] {
  const n = encryptedMatrix.length;
  const decryptedMatrix: bigint[][] = [];

  for (let i = 0; i < n; i++) {
    const decryptedRow: bigint[] = [];
    const encryptedRow = encryptedMatrix[i];
    if (!encryptedRow) {
      throw new Error(`Encrypted matrix row ${i} is undefined`);
    }
    for (let j = 0; j < n; j++) {
      // H'ij = (Fij)^e mod N
      const encryptedValue = encryptedRow[j];
      if (encryptedValue === undefined) {
        throw new Error(`Encrypted matrix value at [${i}, ${j}] is undefined`);
      }
      decryptedRow[j] = rsaDecrypt(encryptedValue, keys.e, keys.N);
    }
    decryptedMatrix[i] = decryptedRow;
  }

  return decryptedMatrix;
}

/**
 * Проверяет, что расшифрованная матрица соответствует зашифрованной
 * путем повторного шифрования
 * @param decryptedMatrix расшифрованная матрица H'
 * @param encryptedMatrix исходная зашифрованная матрица F
 * @param keys RSA ключи
 * @returns true, если проверка прошла успешно
 */
export function verifyDecryption(
  decryptedMatrix: bigint[][],
  encryptedMatrix: bigint[][],
  keys: RSAKeys
): boolean {
  const n = decryptedMatrix.length;

  if (encryptedMatrix.length !== n) {
    return false;
  }

  for (let i = 0; i < n; i++) {
    const decryptedRow = decryptedMatrix[i];
    const encryptedRow = encryptedMatrix[i];
    if (!decryptedRow || !encryptedRow) {
      return false;
    }
    if (decryptedRow.length !== n || encryptedRow.length !== n) {
      return false;
    }
    for (let j = 0; j < n; j++) {
      // Проверяем: Fij == (H'ij)^d mod N
      const decryptedValue = decryptedRow[j];
      const encryptedValue = encryptedRow[j];
      if (decryptedValue === undefined || encryptedValue === undefined) {
        return false;
      }
      const reEncrypted = rsaEncrypt(decryptedValue, keys.d, keys.N);
      if (reEncrypted !== encryptedValue) {
        return false;
      }
    }
  }

  return true;
}
