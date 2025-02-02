# @hacksaw/gkv
[![npm version](https://badge.fury.io/js/@hacksaw%2Fgkv.svg?icon=si%3Anpm)](https://badge.fury.io/js/@hacksaw%2Fgkv)

KV for Google Cloud, backed by Cloud Storage

Full generated docs are available at [gkv.hacksaw.software](https://gkv.hacksaw.software)

## Installation
```shell
# via npm
npm install @hacksaw/gkv
pnpm add @hacksaw/gkv
yarn add @hacksaw/gkv

# via jsr
npx jsr add @hacksaw/gkv
pnpm dlx jsr add @hacksaw/gkv
yarn dlx jsr add @hacksaw/gkv
deno add jsr:@hacksaw/gkv
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

## Examples

Checkout examples in the /examples directory
