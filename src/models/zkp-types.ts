/**
 * Тип вызова в протоколе ZKP
 * 0 - показать перестановку и доказать корректность графа
 * 1 - показать только рёбра гамильтонова цикла
 */
export type Challenge = 0 | 1;

/**
 * Криптографический коммит
 */
export interface Commitment {
  hash: string;
  salt: string;
}

/**
 * Данные одного раунда доказательства
 */
export interface ProofRound {
  commitment: Commitment;
  response: ProofResponse;
}

/**
 * Ответ на вызов в зависимости от типа challenge
 */
export type ProofResponse =
  | {
      type: 0;
      permutation: number[];
      permutedGraphEdges: Array<[number, number]>;
    }
  | {
      type: 1;
      cycleEdges: Array<[number, number]>;
    };

/**
 * Полное доказательство (k раундов)
 * k можно получить как rounds.length, но храним явно для валидации
 */
export interface ZKPProof {
  rounds: ProofRound[];
  k: number;
}
