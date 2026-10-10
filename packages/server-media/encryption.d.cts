export interface DocumentEncryptionEnv { DOC_ENCRYPTION_KEY?: string; DOC_ENCRYPTION_KEK_ID?: string; [key: string]: string | undefined; }
export interface EncryptedDocument { ciphertext: Buffer; encIv: string; encTag: string; wrappedDek: string; wrapIv: string; wrapTag: string; kekId: string; algo: 'AES-256-GCM'; }
export interface EncryptedDocumentInput { ciphertext: Uint8Array; encIv: string; encTag: string; wrappedDek: string; wrapIv: string; wrapTag: string; kekId?: string; }
export function isEncryptionConfigured(env: DocumentEncryptionEnv): boolean;
export function loadKek(env: DocumentEncryptionEnv): { kekId: string; key: Buffer };
export function encryptDocument(plaintextBuf: Buffer, env: DocumentEncryptionEnv): EncryptedDocument;
export function decryptDocument(record: EncryptedDocumentInput, env: DocumentEncryptionEnv): Buffer;
