declare module "crypto" {
  interface RandomBytesOptions {
    length: number;
  }
  
  function randomBytes(size: number): Buffer;
  function randomBytes(size: number, callback: (err: Error | null, buf: Buffer) => void): void;
  
  const crypto: {
    randomBytes: typeof randomBytes;
    [key: string]: any;
  };
  
  export default crypto;
  export { randomBytes };
}

