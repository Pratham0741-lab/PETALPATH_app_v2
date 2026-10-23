/**
 * Parental consent to store child data, recorded before the first child
 * profile is created (ParentConsentScreen). Stored on the device first and
 * sent to POST /auth/consent; an unsent record is retried whenever consent is
 * checked again.
 */
import { apiClient } from '../../services/api/apiClient';
import { storageService, StorageKeys } from '../../services/storage';

/** Bump when the consent text changes; parents are asked again. */
export const CONSENT_VERSION = '2026-10-v1';

interface ConsentRecord {
  version: string;
  acceptedAt: string;
  synced: boolean;
}

type ConsentMap = Record<string, ConsentRecord>;

async function load(): Promise<ConsentMap> {
  return (await storageService.getItem<ConsentMap>(StorageKeys.PARENT_CONSENT)) ?? {};
}

async function send(userId: string, record: ConsentRecord): Promise<void> {
  try {
    await apiClient.post('/auth/consent', { version: record.version });
    const map = await load();
    if (map[userId]) await storageService.setItem(StorageKeys.PARENT_CONSENT, { ...map, [userId]: { ...map[userId], synced: true } });
  } catch {
    // Offline: kept locally, retried on the next hasConsent() check.
  }
}

/** True when this parent has accepted the current consent version on this device. */
export async function hasConsent(userId: string): Promise<boolean> {
  const record = (await load())[userId];
  if (!record || record.version !== CONSENT_VERSION) return false;
  if (!record.synced) void send(userId, record);
  return true;
}

export async function recordConsent(userId: string): Promise<void> {
  const record: ConsentRecord = { version: CONSENT_VERSION, acceptedAt: new Date().toISOString(), synced: false };
  const map = await load();
  await storageService.setItem(StorageKeys.PARENT_CONSENT, { ...map, [userId]: record });
  void send(userId, record);
}
