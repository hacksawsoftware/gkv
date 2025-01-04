# @hacksaw/gkv

KV for Google Cloud, backed by Cloud Storage

Full generated docs are available at [https://gkv.hacksaw.software]

## Installation
```shell
npm install @hacksaw/gkv
pnpm add @hacksaw/gkv
yarn add @hacksaw/gkv
```

## Usage

```typescript
import { Storage } from '@google-cloud/storage';
import { GKV } from '@hacksaw/gkv';

const bucket = "my-bucket"
const storage = new Storage();

const kv = new GKV<string, string>({ bucket, storage })

await kv.set('my-key', 'some value')

const value = await kv.get("my-key")

console.log(value) // 'some value'
```

