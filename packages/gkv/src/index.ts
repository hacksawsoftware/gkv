import type { Storage } from "@google-cloud/storage";
import { deepmerge } from "deepmerge-ts";

export class GKV<K = string, V = unknown> {
	/**
	 * The bucket name where data will be stored
	 */
	bucket: string;
	/**
	 * A namespace ensures the data from your service is isolated in a direct child directory of the bucket
	 */
	namespace = "default";
	/**
	 * A [Storage](https://www.npmjs.com/package/@google-cloud/storage) instance.
	 */
	storage: Storage;
	/**
	 * A function for constructing paths to the stored data.
	 */
	getBlobPath: (namespace: string, key: K) => string;

	constructor({
		bucket,
		getBlobPath = (namespace: string, key: K) => `${namespace}/${key}.json`,
		namespace,
		storage,
	}: {
		bucket: string;
		getBlobPath?: (namespace: string, key: K) => string;
		namespace?: string;
		storage: Storage;
	}) {
		this.bucket = bucket;
		this.getBlobPath = getBlobPath;
		if (namespace) this.namespace = namespace;
		this.storage = storage;
	}

	/**
	 * Get a value via its key
	 */
	public async get(key: K): Promise<{ key: K; value: V }> {
		const [content] = await this.storage
			.bucket(this.bucket)
			.file(this.getBlobPath(this.namespace, key))
			.download();

		return {
			key,
			value: JSON.parse(content.toString()),
		};
	}

	/**
	 * Set a new value, or overwrite an existing value
	 */
	public async set(key: K, value: V): Promise<{ key: K; value: V }> {
		const serializedValue = JSON.stringify(value);
		await this.storage
			.bucket(this.bucket)
			.file(this.getBlobPath(this.namespace, key))
			.save(serializedValue);

		return { key, value };
	}

	/**
	 * Update an existing value. Supports partial updates of deep objects
	 */
	public async update(key: K, value: V): Promise<{ key: K; value: V }> {
		const currentValue = (await this.get(key)).value;

		const mergedValue = currentValue
			? (deepmerge(currentValue, value) as V)
			: value;

		const serializedValue = JSON.stringify(mergedValue);
		await this.storage
			.bucket(this.bucket)
			.file(this.getBlobPath(this.namespace, key))
			.save(serializedValue);

		return { key, value: mergedValue };
	}

	/**
	 * Delete a key value pair
	 */
	public async delete(
		key: K,
	): Promise<{ key: K; status: "deleted" | "error" }> {
		await this.storage
			.bucket(this.bucket)
			.file(this.getBlobPath(this.namespace, key))
			.delete();

		return { status: "deleted", key };
	}
}
