'use client';

import { type NfcReadResult, type DetailedNfcReadResult } from '@/lib/types';

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

      for (const record of message?.records || []) {
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
 * Dedicated reader function that dumps the exact NDEF message structure,
 * byte sizes, and raw values. Ideal for a generic NFC reading tool.
 */
export async function readDetailedTag(
  onReading: (result: DetailedNfcReadResult) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  const ndef = new (window as any).NDEFReader();
  const abortController = new AbortController();

  try {
    await ndef.scan({ signal: abortController.signal });

    ndef.addEventListener('reading', ({ serialNumber, message }: any) => {
      const decoder = new TextDecoder();
      let totalBytes = 0;
      const parsedRecords = [];

      for (const record of message.records || []) {
        const bytes = record.data ? record.data.byteLength : 0;
        totalBytes += bytes;

        let decodedData = '';
        try {
          if (record.data) decodedData = decoder.decode(record.data);
        } catch {
          decodedData = '[Binary Data]';
        }

        parsedRecords.push({
          recordType: record.recordType || 'unknown',
          mediaType: record.mediaType,
          id: record.id,
          data: decodedData,
          byteLength: bytes,
        });
      }

      onReading({
        serialNumber,
        recordCount: message.records ? message.records.length : 0,
        messageBytes: totalBytes,
        records: parsedRecords,
      });
    });

    ndef.addEventListener('readingerror', () => {
      onError(new Error('Cannot read data from the NFC tag. Try a different tag.'));
    });
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Failed to start NFC scan'));
  }

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
 * Write a standard NDEF record (URL or Text) to the tag.
 */
export async function writeCustomRecord(type: 'url' | 'text' | 'json' | 'erase', data: string): Promise<void> {
  if (!isNFCSupported()) throw new Error('Web NFC is not supported');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ndef = new (window as any).NDEFReader();
  let record: any;

  if (type === 'erase') {
    record = { recordType: 'empty' };
  } else if (type === 'url') {
    record = { recordType: 'url', data };
  } else if (type === 'json') {
    record = { recordType: 'mime', mediaType: 'application/json', data: new TextEncoder().encode(data) };
  } else {
    record = { recordType: 'text', data };
  }

  await ndef.write({ records: [record] });
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
