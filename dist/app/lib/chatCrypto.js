import crypto from "crypto";
const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
function getEncryptionKey() {
    const secret = process.env.CHAT_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error("CHAT_ENCRYPTION_KEY (or NEXTAUTH_SECRET) is required");
    }
    // Normalize to 32 bytes for AES-256
    return crypto.createHash("sha256").update(secret).digest();
}
export function encryptChatText(plainText) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plainText, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return {
        textCipher: encrypted.toString("base64"),
        textIv: iv.toString("base64"),
        textTag: authTag.toString("base64"),
        encryptionVersion: 1,
    };
}
export function decryptChatText(payload) {
    const { textCipher, textIv, textTag } = payload;
    if (!textCipher || !textIv || !textTag)
        return "";
    const key = getEncryptionKey();
    const iv = Buffer.from(textIv, "base64");
    const encrypted = Buffer.from(textCipher, "base64");
    const authTag = Buffer.from(textTag, "base64");
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
}
