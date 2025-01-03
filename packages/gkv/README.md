KV for Google Cloud, backed by Cloud Storage

## Installation
```shell
npm install @hacksaw-software/gkv
pnpm add @hacksaw-software/gkv
yarn add @hacksaw-software/gkv
```

## Usage
```typescript
import { Storage } from '@google-cloud/storage';
import { GKV } from '@hacksaw-software/gkv';

const bucket = "my-bucket"
const storage = new Storage();

const kv = new GKV<string, string>({ bucket, storage })

await kv.set('my-key', 'some value')

const value = await kv.get("my-key")

console.log(value) // 'some value'
```
