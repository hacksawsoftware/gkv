import { Storage } from '@google-cloud/storage';
import { HttpFunction, Response } from '@google-cloud/functions-framework';
import * as v from 'valibot';
import { GKV } from '@hacksaw-software/gkv';

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME ?? "gkv-test";

const RequestSchema = v.object({
  key: v.string(),
  value: v.unknown()
});

type Key = v.InferInput<typeof RequestSchema>["key"];
type Value = v.InferInput<typeof RequestSchema>["value"];

export const kvService: HttpFunction = async (req, res) => {
  try {
    const kv = new GKV<Key, Value>({
      bucket: bucketName,
      storage,
    });

    switch (req.method) {
      case 'GET': {
        const { key } = v.parse(v.object({ key: v.string() }), req.body);
        res.json(await kv.get(key));
        break;
      }
      case 'PUT': {
        const { key, value } = v.parse(RequestSchema, req.body);
        res.json(await kv.set(key, value));
        break;
      }
      case 'PATCH': {
        const { key, value } = v.parse(RequestSchema, req.body);
        res.json(await kv.update(key, value));
        break;
      }
      case 'DELETE': {
        const { key } = v.parse(v.object({ key: v.string() }), req.body);
        res.json(await kv.delete(key));
        break;
      }
      default:
        res.status(405).send({ error: 'Method not allowed' });
    }
  } catch (error) {
    return handleError(error, res)
  }
};

const handleError = (error: unknown, res: Response) => {
  if (error instanceof Error) {
    if ('issues' in error) {
      return res.status(400).send({ error: 'Invalid request body' });
    } else if ((error as any)?.code === 404) {
      res.status(404).send({ error: 'Key not found' });
    } else {
      console.error('Error:', error);
      res.status(500).send({ error: 'Internal server error' });
    }
  }
}

