export async function encryptData(text: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    'raw', 
    enc.encode(password), 
    { name: 'PBKDF2' }, 
    false, 
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 
    { name: 'AES-GCM', length: 256 }, 
    false, 
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, 
    key, 
    enc.encode(text)
  );

  const saltB64 = arrayBufferToBase64(salt);
  const ivB64 = arrayBufferToBase64(iv);
  const encB64 = arrayBufferToBase64(encrypted);

  return `ENC:1:${saltB64}:${ivB64}:${encB64}`;
}

export async function decryptData(encryptedStr: string, password: string): Promise<string> {
  const parts = encryptedStr.split(':');
  if (parts.length !== 5 || parts[0] !== 'ENC') {
    throw new Error('Format is not an encrypted payload');
  }
  
  const salt = base64ToArrayBuffer(parts[2]);
  const iv = base64ToArrayBuffer(parts[3]);
  const encData = base64ToArrayBuffer(parts[4]);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', 
    enc.encode(password), 
    { name: 'PBKDF2' }, 
    false, 
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 
    { name: 'AES-GCM', length: 256 }, 
    false, 
    ['decrypt']
  );

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, 
      key, 
      encData
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    throw new Error('Incorrect password or corrupted data');
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}
