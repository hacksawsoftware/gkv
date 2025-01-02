import { Storage } from '@google-cloud/storage';
import { HttpFunction } from '@google-cloud/functions-framework';
import { object, parse, unknown, string } from 'valibot';
import { deepmerge } from 'deepmerge-ts';

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME ?? "gkv-test";

const RequestSchema = object({
  key: string(),
  value: unknown()
});

const DEFAULT_NAMESPACE = 'default';

const getBlobName = (namespace: string, key: string) => `${namespace}/${key}.json`;

const parseNamespace = (path: string): string => {
  const namespace = path.split('/').filter(Boolean)[0];
  return namespace || DEFAULT_NAMESPACE;
};

const getHandler = async (namespace: string, key: string) => {
  const [content] = await storage
    .bucket(bucketName)
    .file(getBlobName(namespace, key))
    .download();
  return { namespace, key, value: JSON.parse(content.toString()) };
};

const setHandler = async (namespace: string, key: string, value: unknown) => {
  await storage
    .bucket(bucketName)
    .file(getBlobName(namespace, key))
    .save(JSON.stringify(value));
  return { namespace, key, value };
};

const patchHandler = async (namespace: string, key: string, value: unknown) => {
  let currentValue = {};
  
  try {
    const current = await getHandler(namespace, key);
    currentValue = current.value;
  } catch (error) {
    if ((error as any)?.code !== 404) throw error;
  }

  const mergedValue = deepmerge(currentValue, value);
  await storage
    .bucket(bucketName)
    .file(getBlobName(namespace, key))
    .save(JSON.stringify(mergedValue));
  
  return { namespace, key, value: mergedValue };
};

const deleteHandler = async (namespace: string, body: unknown) => {
  const { key } = parse(object({ key: string() }), body);
  await storage
    .bucket(bucketName)
    .file(getBlobName(namespace, key))
    .delete();
  return { status: 'deleted', namespace, key };
};

export const gkv: HttpFunction = async (req, res) => {
  try {
    const namespace = parseNamespace(req.path);

    switch (req.method) {
      case 'GET': {
        const { key } = parse(object({ key: string() }), req.body);
        res.json(await getHandler(namespace, key));
        break;
      }
      case 'PUT': {
        const { key, value } = parse(RequestSchema, req.body);
        res.json(await setHandler(namespace, key, value));
        break;
      }
      case 'PATCH': {
        const { key, value } = parse(RequestSchema, req.body);
        res.json(await patchHandler(namespace, key, value));
        break;
      }
      case 'DELETE': {
        res.json(await deleteHandler(namespace, req.body));
        break;
      }
      default:
        res.status(405).send({ error: 'Method not allowed' });
    }
  } catch (error) {
    if (error instanceof Error) {
      if ('issues' in error) {
        res.status(400).send({ error: 'Invalid request body' });
      } else if ((error as any)?.code === 404) {
        res.status(404).send({ error: 'Key not found' });
      } else {
        console.error('Error:', error);
        res.status(500).send({ error: 'Internal server error' });
      }
    }
  }
};
