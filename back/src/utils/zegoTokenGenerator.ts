import { randomBytes, createCipheriv } from "crypto";

export interface ZegoError {
  errorCode: number;
  errorMessage: string;
}

function createError(errorCode: number, errorMessage: string): ZegoError {
  return {
    errorCode,
    errorMessage,
  };
}

function makeNonce(): number {
  const min = -Math.pow(2, 31); // -2^31
  const max = Math.pow(2, 31) - 1; // 2^31 - 1
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function aesGcmEncrypt(plainText: string, secret: string) {
  let key: Buffer;
  if (secret.length === 64) {
    key = Buffer.from(secret, "hex");
  } else {
    key = Buffer.from(secret, "utf8");
  }

  if (![16, 24, 32].includes(key.length)) {
    throw createError(5, "Invalid Secret length. Key must be 16, 24, or 32 bytes.");
  }
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAutoPadding(true);
  const encrypted = cipher.update(plainText, "utf8");
  const encryptBuf = Buffer.concat([
    encrypted,
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return { encryptBuf, nonce };
}

export function generateToken04(
  appId: number,
  userId: string,
  secret: string,
  effectiveTimeInSeconds: number,
  payload?: string
): string {
  if (!appId || typeof appId !== "number") {
    throw createError(1, "appID invalid");
  }
  if (!userId || typeof userId !== "string" || userId.length > 64) {
    throw createError(3, "userId invalid");
  }
  if (!secret || typeof secret !== "string" || (secret.length !== 32 && secret.length !== 64)) {
    throw createError(5, "secret must be a 32 byte string or a 64 character hex string");
  }
  if (!(effectiveTimeInSeconds > 0)) {
    throw createError(6, "effectiveTimeInSeconds invalid");
  }

  const VERSION_FLAG = "04";
  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: makeNonce(),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: payload || "",
  };

  const plaintText = JSON.stringify(tokenInfo);

  const { encryptBuf, nonce } = aesGcmEncrypt(plaintText, secret);

  const b1 = new Uint8Array(8);
  const b2 = new Uint8Array(2);
  const b3 = new Uint8Array(2);
  const b4 = new Uint8Array(1);

  new DataView(b1.buffer).setBigInt64(0, BigInt(tokenInfo.expire), false);
  new DataView(b2.buffer).setUint16(0, nonce.byteLength, false);
  new DataView(b3.buffer).setUint16(0, encryptBuf.byteLength, false);
  new DataView(b4.buffer).setUint8(0, 1); // AesEncryptMode.GCM

  const buf = Buffer.concat([
    Buffer.from(b1),
    Buffer.from(b2),
    Buffer.from(nonce),
    Buffer.from(b3),
    Buffer.from(encryptBuf),
    Buffer.from(b4),
  ]);

  return VERSION_FLAG + buf.toString("base64");
}
