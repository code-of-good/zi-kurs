import crypto from "crypto";

export function fastExpMod(
  a: bigint | number,
  x: bigint | number,
  p: bigint | number
): bigint {
  a = BigInt(a);
  x = BigInt(x);
  p = BigInt(p);

  let y = 1n;
  let s = a % p;
  while (x > 0n) {
    if (x % 2n === 1n) {
      y = (y * s) % p;
    }
    x = x / 2n;
    s = (s * s) % p;
  }
  return y;
}

export function fermatPrimalityTest(
  n: bigint | number,
  k: number = 50
): boolean {
  n = BigInt(n);
  if (n <= 1n) return false;
  if (n <= 3n) return true;
  if (n % 2n === 0n) return false;

  for (let i = 0; i < k; i++) {
    const a = randomBigInt(2n, n - 2n);
    if (fastExpMod(a, n - 1n, n) !== 1n) {
      return false;
    }
  }
  return true;
}

export function randomBigInt(
  min: bigint | number,
  max: bigint | number
): bigint {
  min = BigInt(min);
  max = BigInt(max);
  const range = max - min + 1n;
  const bits = range.toString(2).length;
  let result: bigint;
  do {
    result = BigInt(
      "0x" + crypto.randomBytes(Math.ceil(bits / 8)).toString("hex")
    );
  } while (result >= range);
  return result + min;
}

export function generatePrime(
  minVal: bigint | number,
  maxVal: bigint | number
): bigint {
  while (true) {
    const candidate = randomBigInt(BigInt(minVal), BigInt(maxVal));
    if (fermatPrimalityTest(candidate)) {
      return candidate;
    }
  }
}

export function gcd(a: bigint | number, b: bigint | number): bigint {
  let aBig = BigInt(a);
  let bBig = BigInt(b);
  while (bBig !== 0n) {
    const temp: bigint = bBig;
    bBig = aBig % bBig;
    aBig = temp;
  }
  return aBig;
}

export function modInverse(a: bigint | number, m: bigint | number): bigint {
  let aBig = BigInt(a);
  let mBig = BigInt(m);

  const m0 = mBig;
  let x0 = 0n;
  let x1 = 1n;

  if (mBig === 1n) return 0n;

  while (aBig > 1n) {
    const q = aBig / mBig;
    let t: bigint = mBig;
    mBig = aBig % mBig;
    aBig = t;
    t = x0;
    x0 = x1 - q * x0;
    x1 = t;
  }

  if (x1 < 0n) x1 += m0;

  return x1;
}

export interface RSAKeys {
  N: bigint; // модуль (p * q)
  e: bigint; // публичная экспонента
  d: bigint; // приватная экспонента
  p: bigint; // первый простой множитель
  q: bigint; // второй простой множитель
}

/**
 * Генерирует RSA ключи для шифрования
 * @param bitLength длина простых чисел в битах (по умолчанию 512, итого N ~ 1024 бита)
 * @returns RSA ключи {N, e, d, p, q}
 */
export function generateRSAKeys(bitLength: number = 512): RSAKeys {
  // Генерируем два больших простых числа
  const minPrime = 2n ** BigInt(bitLength - 1);
  const maxPrime = 2n ** BigInt(bitLength) - 1n;

  let p = generatePrime(minPrime, maxPrime);
  let q = generatePrime(minPrime, maxPrime);

  // Убеждаемся, что p != q
  while (p === q) {
    q = generatePrime(minPrime, maxPrime);
  }

  const N = p * q;
  const phiN = (p - 1n) * (q - 1n);

  // Выбираем публичную экспоненту e (обычно 65537)
  let e = 65537n;
  if (e >= phiN || gcd(e, phiN) !== 1n) {
    // Если 65537 не подходит, ищем другое
    e = 3n;
    while (e < phiN && gcd(e, phiN) !== 1n) {
      e += 2n;
    }
  }

  // Вычисляем приватную экспоненту d
  const d = modInverse(e, phiN);

  return { N, e, d, p, q };
}

/**
 * RSA шифрование: c = m^e mod N
 */
export function rsaEncrypt(message: bigint, e: bigint, N: bigint): bigint {
  return fastExpMod(message, e, N);
}

/**
 * RSA расшифрование: m = c^d mod N
 */
export function rsaDecrypt(ciphertext: bigint, d: bigint, N: bigint): bigint {
  return fastExpMod(ciphertext, d, N);
}
