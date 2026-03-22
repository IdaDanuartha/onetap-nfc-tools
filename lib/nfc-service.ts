'use client';

import { type NfcReadResult } from '@/lib/types';

/**
 * Check if Web NFC API is supported in the current browser.
 * Only available on Android Chrome with a secure context (HTTPS).
 */
export function isNFCSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

/**
 * Start scanning for NFC tags. Calls onReading for each detected tag,
 * and onError if scanning fails.
 *
 * Returns a cleanup function that aborts scanning.
 */
export async function readTag(
  onReading: (result: NfcReadResult) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ndef = new (window as any).NDEFReader();
  const abortController = new AbortController();

  try {
    await ndef.scan({ signal: abortController.signal });

    ndef.addEventListener('reading', ({ serialNumber, message }: { serialNumber: string; message: any }) => {
      const decoder = new TextDecoder();
      const records: string[] = [];
      let primaryMessage: string | null = null;

      for (const record of message.records) {
        if (record.recordType === 'text' && record.data) {
          const text = decoder.decode(record.data);
          records.push(text);
          if (!primaryMessage) primaryMessage = text;
        } else if (record.recordType === 'url' && record.data) {
          const url = decoder.decode(record.data);
          records.push(url);
          if (!primaryMessage) primaryMessage = url;
        }
      }

      onReading({
        serialNumber,
        message: primaryMessage,
        records,
      });
    });

    ndef.addEventListener('readingerror', () => {
      onError(new Error('Cannot read data from the NFC tag. Try a different tag.'));
    });
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Failed to start NFC scan'));
  }

  // Return cleanup function
  return () => abortController.abort();
}

/**
 * Write a JSON payload as a text record to an NFC tag.
 * The payload is serialized to JSON string before writing.
 */
export async function writeTag(payload: Record<string, unknown>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ndef = new (window as any).NDEFReader();
  const data = JSON.stringify(payload);

  await ndef.write({
    records: [{ recordType: 'text', data }],
  });
}

/**
 * Clear an NFC tag by writing an empty NDEF record.
 */
export async function clearTag(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ndef = new (window as any).NDEFReader();

  await ndef.write({
    records: [{ recordType: 'empty' }],
  });
}
