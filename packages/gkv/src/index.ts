import { type Storage } from '@google-cloud/storage';
import { deepmerge } from 'deepmerge-ts';

export class GKV<K = string, V = unknown> {
  bucket: string;
  namespace: string;
  storage: Storage;
  getBlobName: (namespace: string, key: string) => string

  constructor({ 
    bucket, 
    getBlobName = (namespace: string, key: string) => `${namespace}/${key}.json`,
    namespace, 
    storage 
  }:{
    bucket: string;
    getBlobName?: (namespace: string, key: string) => string;
    namespace?: string;
    storage: Storage;
  }) {
    this.bucket = bucket;
    this.getBlobName = getBlobName;
    this.namespace = namespace ?? "default";
    this.storage = storage;
  }

  public async get(key: K): Promise<{ key: K; value: V }> {
    const [content] = await this.storage
      .bucket(this.bucket)
      .file(this.getBlobName(this.namespace, String(key)))
      .download();

    return { 
      key, 
      value: JSON.parse(content.toString()) 
    }
  }

  public async set(key: K, value: V): Promise<{ key: K; value: V }> {
    await this.storage
      .bucket(this.bucket)
      .file(this.getBlobName(this.namespace, String(key)))
      .save(JSON.stringify(value));

    return { key, value };
  }

  public async update(key: K, value: V): Promise<{ key: K; value: V }> {
    let currentValue: V;
  
    try {
      const current = await this.get(key);
      currentValue = current.value;
    } catch (error) {
      if ((error as any)?.code !== 404) throw error;
    }

    const mergedValue = deepmerge(currentValue!, value) as V;
    await this.storage
      .bucket(this.bucket)
      .file(this.getBlobName(this.namespace, String(key)))
      .save(JSON.stringify(mergedValue));
  
    return { key, value: mergedValue };
  }

  public async delete(key: K): Promise<{ key: K, status: "deleted" | "error" }> {
    await this.storage
      .bucket(this.bucket)
      .file(this.getBlobName(this.namespace, String(key)))
      .delete();

    return { status: 'deleted', key };
  }
}

