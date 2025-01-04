KV for Google Cloud, backed by Cloud Storage

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

> [!NOTE]
> Visit [Github](https://github.com/hacksawsoftware/gkv/tree/main/examples) to see more examples

