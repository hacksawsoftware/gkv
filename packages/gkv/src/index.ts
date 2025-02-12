import type { Logging } from "@google-cloud/logging";
import type { LogSeverity } from "@google-cloud/logging/build/src/entry";
import type { Storage } from "@google-cloud/storage";
import type {StandardSchemaV1} from '@standard-schema/spec';
import { deepmerge } from "deepmerge-ts";

type GKVOptions<S extends StandardSchemaV1 | undefined> = {
  bucket: string;
  getBlobPath?: (namespace: string, key: string) => string;
  log?: ReturnType<Logging['log']>;
  namespace?: string;
  storage: Storage;
  valueSchema?: S;
};

export class GKV<
  S extends StandardSchemaV1 | undefined = undefined,
  V = S extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<S> : any 
> {
	/**
	 * The bucket name where data will be stored
	 */
	bucket: string;
	/**
	 * A function for constructing paths to the stored data.
	 */
	getBlobPath: (namespace: string, key: string) => string = (
		namespace: string,
		key: string,
	) => `${namespace}/${key}.json`;
	/**
	 * A log to write to in Google Cloud Logging.
	 * See docs [here](https://github.com/googleapis/nodejs-logging?tab=readme-ov-file#using-the-client-library)
	 */
	log?: ReturnType<Logging["log"]>;
	/**
	 * A namespace ensures the data from your service is isolated in a direct child directory of the bucket
	 */
	namespace = "default";
	/**
	 * A Storage instance.
	 * See docs [here](https://github.com/googleapis/nodejs-logging?tab=readme-ov-file#using-the-client-library)
	 */
	storage: Storage;
  /**
   * 
   */
  valueSchema: S | undefined;

	constructor({
		bucket,
		log,
		getBlobPath,
		namespace,
		storage,
    valueSchema,
	}: GKVOptions<S>) {
		this.bucket = bucket;
		if (log) this.log = log;
		if (getBlobPath) this.getBlobPath = getBlobPath;
		if (namespace) this.namespace = namespace;
		this.storage = storage;
    if (valueSchema) this.valueSchema = valueSchema;
	}

	/**
	 * Get a value via its key
	 */
	public async get(key: string): Promise<{ key: string; value: V | undefined }> {
		try {
			const [content] = await this.storage
				.bucket(this.bucket)
				.file(this.getBlobPath(this.namespace, key))
				.download();

			return {
				key,
				value: JSON.parse(content.toString()),
			};
		} catch (error) {
			this.handleError(error);
			return { key, value: undefined };
		}
	}

	/**
	 * Set a new value, or overwrite an existing value
	 */
	public async set(
		key: string,
		value: V,
	): Promise<{ key: string; value: V | undefined }> {
    await this.validateInput(value)
		const serializedValue = JSON.stringify(value);

		try {
			await this.storage
				.bucket(this.bucket)
				.file(this.getBlobPath(this.namespace, key))
				.save(serializedValue);

			return { key, value };
		} catch (error) {
			this.handleError(error);
			return { key, value: undefined };
		}
	}

	/**
	 * Update an existing value. Supports partial updates of deep objects
	 */
	public async update(
		key: string,
		value: V,
	): Promise<{ key: string; value: V | undefined }> {
    await this.validateInput(value)
		const { value: currentValue } = await this.get(key);

		if (currentValue === undefined)
			throw Error(`GKV: Value does not exist for key ${key}`);

		const mergedValue = currentValue
			? (deepmerge(currentValue, value) as V)
			: value;

		const serializedValue = JSON.stringify(mergedValue);
		try {
			await this.storage
				.bucket(this.bucket)
				.file(this.getBlobPath(this.namespace, key))
				.save(serializedValue);

			return { key, value: mergedValue };
		} catch (error) {
			this.handleError(error);
			return { key, value: undefined };
		}
	}

	/**
	 * Delete a key value pair
	 */
	public async delete(
		key: string,
	): Promise<{ key: string; status: "deleted" | "error" }> {
		try {
			await this.storage
				.bucket(this.bucket)
				.file(this.getBlobPath(this.namespace, key))
				.delete();

			return { status: "deleted", key };
		} catch (error) {
			this.handleError(error);
			return { key, status: "error" };
		}
	}

  private async validateInput(value: V): Promise<void> {
    if (this.valueSchema) {
      let result = this.valueSchema['~standard'].validate(value);

      if (result instanceof Promise) result = await result;

      if (result.issues) {
        throw new Error(JSON.stringify(result.issues, null, 2));
      }
    }
  }

	private async writeLog(message: string, severity: LogSeverity) {
		if (!this.log) return;
		const entry = this.log.entry({ severity }, message);
		await this.log.write(entry);
	}

	private async handleError(error: unknown) {
		const message =
			error instanceof Error ? error.message : "GKV: unknown error";
		if (this.log) await this.writeLog(message, "ERROR");
		console.error(message);
	}
}
