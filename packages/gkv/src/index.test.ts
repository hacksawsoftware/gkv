import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GKV } from '.';
import { z } from 'zod';
import * as v from 'valibot';
import { type } from 'arktype';
import type { Storage } from '@google-cloud/storage';
import type { Log } from '@google-cloud/logging';

// Mock implementations
const mockSave = vi.fn();
const mockDownload = vi.fn();
const mockDelete = vi.fn();
const mockWrite = vi.fn();

const mockStorage = {
  bucket: vi.fn().mockReturnValue({
    file: vi.fn().mockReturnValue({
      save: mockSave,
      download: mockDownload,
      delete: mockDelete,
    }),
  }),
} as unknown as Storage;

const mockLog = {
  entry: vi.fn().mockReturnValue('mockEntry'),
  write: mockWrite,
} as unknown as Log;

describe('GKV', () => {
  let gkv: GKV<any, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    gkv = new GKV({
      bucket: 'test-bucket',
      storage: mockStorage,
      log: mockLog,
    });
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(gkv.bucket).toBe('test-bucket');
      expect(gkv.namespace).toBe('default');
      expect(gkv.storage).toBe(mockStorage);
    });

    it('should accept custom namespace and getBlobPath', () => {
      const customGetBlobPath = (namespace: string, key: string) => `custom/${namespace}/${key}`;
      const customGkv = new GKV({
        bucket: 'test-bucket',
        storage: mockStorage,
        namespace: 'custom',
        getBlobPath: customGetBlobPath,
      });

      expect(customGkv.namespace).toBe('custom');
      expect(customGkv.getBlobPath('test', 'key')).toBe('custom/test/key');
    });
  });

  describe('get', () => {
    it('should retrieve a value successfully', async () => {
      const mockValue = { name: 'test' };
      mockDownload.mockResolvedValueOnce([Buffer.from(JSON.stringify(mockValue))]);

      const result = await gkv.get('test-key');
      expect(result).toEqual({ key: 'test-key', value: mockValue });
    });

    it('should handle errors and return undefined value', async () => {
      mockDownload.mockRejectedValueOnce(new Error('Download failed'));

      const result = await gkv.get('test-key');
      expect(result).toEqual({ key: 'test-key', value: undefined });
      expect(mockWrite).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set a value successfully', async () => {
      mockSave.mockResolvedValueOnce(undefined);

      const value = { name: 'test' };
      const result = await gkv.set('test-key', value);
      expect(result).toEqual({ key: 'test-key', value });
      expect(mockSave).toHaveBeenCalledWith(JSON.stringify(value));
    });

    it('should handle errors during set', async () => {
      mockSave.mockRejectedValueOnce(new Error('Save failed'));

      const result = await gkv.set('test-key', { name: 'test' });
      expect(result).toEqual({ key: 'test-key', value: undefined });
      expect(mockWrite).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing value', async () => {
      const existingValue = { name: 'test', age: 25 };
      const updateValue = { age: 26 };
      mockDownload.mockResolvedValueOnce([Buffer.from(JSON.stringify(existingValue))]);
      mockSave.mockResolvedValueOnce(undefined);

      const result = await gkv.update('test-key', updateValue);
      expect(result).toEqual({
        key: 'test-key',
        value: { name: 'test', age: 26 },
      });
    });

    it('should throw error if value does not exist', async () => {
      mockDownload.mockResolvedValueOnce([Buffer.from('')]);

      await expect(gkv.update('test-key', { name: 'test' }))
        .rejects
        .toThrowError('GKV: Value does not exist for key test-key');
    });
  });

  describe('delete', () => {
    it('should delete a value successfully', async () => {
      mockDelete.mockResolvedValueOnce(undefined);

      const result = await gkv.delete('test-key');
      expect(result).toEqual({ key: 'test-key', status: 'deleted' });
    });

    it('should handle errors during delete', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await gkv.delete('test-key');
      expect(result).toEqual({ key: 'test-key', status: 'error' });
    });
  });

  describe('schema validation', () => {
    const validData = { name: 'test', age: 25 };
    const invalidData = { name: 'test', age: '25' };

    describe('Zod validation', () => {
      beforeEach(() => {
        gkv = new GKV({
          bucket: 'test-bucket',
          storage: mockStorage,
          valueSchema: z.object({
            name: z.string(),
            age: z.number(),
          }),
        });
      });

      it('should pass validation with valid data', async () => {
        mockSave.mockResolvedValueOnce(undefined);
        const result = await gkv.set('test-key', validData);
        expect(result.value).toEqual(validData);
      });

      it('should fail validation with invalid data', async () => {
        await expect(gkv.set('test-key', invalidData))
          .rejects
          .toThrow();
      });
    });

    describe('Valibot validation', () => {
      beforeEach(() => {
        gkv = new GKV({
          bucket: 'test-bucket',
          storage: mockStorage,
          valueSchema: v.object({
            name: v.string(),
            age: v.number(),
          }),
        });
      });

      it('should pass validation with valid data', async () => {
        mockSave.mockResolvedValueOnce(undefined);
        const result = await gkv.set('test-key', validData);
        expect(result.value).toEqual(validData);
      });

      it('should fail validation with invalid data', async () => {
        await expect(gkv.set('test-key', invalidData))
          .rejects
          .toThrow();
      });
    });

    describe('Arktype validation', () => {
      beforeEach(() => {
        gkv = new GKV({
          bucket: 'test-bucket',
          storage: mockStorage,
          valueSchema: type({
            name: 'string',
            age: 'number',
          }),
        });
      });

      it('should pass validation with valid data', async () => {
        mockSave.mockResolvedValueOnce(undefined);
        const result = await gkv.set('test-key', validData);
        expect(result.value).toEqual(validData);
      });

      it('should fail validation with invalid data', async () => {
        await expect(gkv.set('test-key', invalidData))
          .rejects
          .toThrow();
      });
    });
  });
});

