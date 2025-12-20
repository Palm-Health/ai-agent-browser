import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { MemoryEventType } from './memoryTypes';

export interface PrivacySettings {
    privateMode: boolean;
    disabledCategories: MemoryEventType[];
    allowPHI: boolean;
    encryptionKey?: string;
}

const DEFAULT_SETTINGS: PrivacySettings = {
    privateMode: false,
    disabledCategories: [],
    allowPHI: false,
    encryptionKey: process.env.MEMORY_SECRET,
};

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'auth', 'ssn'];

export class PrivacyManager {
    private settings: PrivacySettings;

    constructor(settings: Partial<PrivacySettings> = {}) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
    }

    public isEventAllowed(type: MemoryEventType): boolean {
        if (this.settings.privateMode) return false;
        return !this.settings.disabledCategories.includes(type);
    }

    public sanitizePayload<T extends Record<string, any>>(payload: T): T {
        if (this.settings.allowPHI) return payload;
        const clean: Record<string, any> = {};
        Object.entries(payload).forEach(([key, value]) => {
            if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
                return;
            }
            clean[key] = value;
        });
        return clean as T;
    }

    public enablePrivateMode(): void {
        this.settings.privateMode = true;
    }

    public disablePrivateMode(): void {
        this.settings.privateMode = false;
    }

    public disableCategory(type: MemoryEventType): void {
        if (!this.settings.disabledCategories.includes(type)) {
            this.settings.disabledCategories.push(type);
        }
    }

    public enableCategory(type: MemoryEventType): void {
        this.settings.disabledCategories = this.settings.disabledCategories.filter((t) => t !== type);
    }

    public wipeMemory(filePath: string): void {
        if (fs.existsSync(filePath)) {
            fs.rmSync(filePath, { force: true });
        }
    }

    public encrypt(data: string): string {
        const key = this.getKey();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
        const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    }

    public decrypt(payload: string): string {
        const [ivHex, dataHex] = payload.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const key = this.getKey();
        const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
        const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
        return decrypted.toString('utf8');
    }

    public saveSettings(filePath: string): void {
        const payload = JSON.stringify(this.settings, null, 2);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, payload, 'utf8');
    }

    public loadSettings(filePath: string): PrivacySettings {
        if (!fs.existsSync(filePath)) return this.settings;
        const raw = fs.readFileSync(filePath, 'utf8');
        this.settings = { ...this.settings, ...JSON.parse(raw) };
        return this.settings;
    }

    private getKey(): Buffer {
        const key = this.settings.encryptionKey || process.env.MEMORY_SECRET || 'default-local-memory-key';
        return crypto.createHash('sha256').update(key).digest();
    }
}

export const privacyManager = new PrivacyManager();
