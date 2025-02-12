import { Storage } from '@google-cloud/storage';
import { HttpFunction, Response } from '@google-cloud/functions-framework';
import * as v from 'valibot';
import { GKV } from '@hacksaw/gkv';

const storage = new Storage();
const bucket = process.env.GCS_BUCKET_NAME ?? "gkv-test";

const valueSchema = v.object({
  name: v.string(),
  age: v.number(),
});

export const kvService: HttpFunction = async (req, res) => {
  try {
    const kv = new GKV({ bucket, storage, valueSchema });

    switch (req.method) {
      case 'GET': {
        const { key } = req.body;
        res.json(await kv.get(key));
        break;
      }
      case 'PUT': {
        const { key, value } = req.body;
        res.json(await kv.set(key, value));
        break;
      }
      case 'PATCH': {
        const { key, value } = req.body;
        res.json(await kv.update(key, value));
        break;
      }
      case 'DELETE': {
        const { key } = req.body;
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


