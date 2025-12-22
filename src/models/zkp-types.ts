export type Challenge = 0 | 1;

/**
 * Зашифрованная матрица F, передаваемая от Алисы к Бобу
 * Fij = (H'ij)^d mod N, где H'ij = rij || Hij
 */
export interface EncryptedMatrix {
  matrix: bigint[][]; // зашифрованная матрица F
  publicKey: {
    N: string; // модуль RSA (в виде строки для сериализации)
    e: string; // публичная экспонента (в виде строки для сериализации)
  };
}

/**
 * Ответ Алисы на Challenge 0: показать перестановку и граф Н
 */
export interface ResponseType0 {
  type: 0;
  permutation: number[]; // перестановка вершин
  decryptedMatrix: bigint[][]; // расшифрованная закодированная матрица H'
}

/**
 * Ответ Алисы на Challenge 1: показать гамильтонов цикл
 */
export interface ResponseType1 {
  type: 1;
  cycleEdges: Array<[number, number]>; // рёбра гамильтонова цикла
  decryptedCycleElements: Array<{
    i: number;
    j: number;
    value: bigint; // расшифрованное значение H'ij для рёбер цикла
  }>;
}

export type ProofResponse = ResponseType0 | ResponseType1;

export interface ProofRound {
  encryptedMatrix: EncryptedMatrix; // зашифрованная матрица F
  response: ProofResponse;
}

export interface ZKPProof {
  rounds: ProofRound[];
  k: number;
}
