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

export function findPrimitiveRoot(p: bigint | number): bigint {
  p = BigInt(p);

  const phi = p - 1n;
  const factors: bigint[] = [];
  let temp = phi;

  for (let i = 2n; i * i <= temp; i++) {
    if (temp % i === 0n) {
      factors.push(i);
      while (temp % i === 0n) {
        temp = temp / i;
      }
    }
  }
  if (temp > 1n) {
    factors.push(temp);
  }

  for (let g = 2n; g < p; g++) {
    let isPrimitive = true;

    for (const factor of factors) {
      if (fastExpMod(g, phi / factor, p) === 1n) {
        isPrimitive = false;
        break;
      }
    }

    if (isPrimitive) {
      return g;
    }
  }

  return 2n;
}
