import { expect, it } from 'vitest';
import { validateApiUrl } from '../../../packages/shared/config/api-url.cjs';
it('fails closed for unsafe or missing release configuration', () => {
  for (const url of [undefined,'','http://api.example.com','https://localhost','https://127.0.0.1','https://10.0.0.1','https://api.local','https://user:password@api.example.com','https://api.example.com?token=secret','https://[::1]'])
    expect(() => validateApiUrl(url,false)).toThrow();
  expect(validateApiUrl('https://api.example.com/api/',false)).toBe('https://api.example.com/api');
  expect(validateApiUrl(undefined,true)).toBe('http://localhost:4000');
});

it('blocks release app configs without a valid HTTPS endpoint', async () => {
  const {spawnSync}=await import('node:child_process');
  const {fileURLToPath}=await import('node:url');
  for(const app of ['customer','partner','rider']){
    const path=fileURLToPath(new URL(`../../../apps/${app}/app.config.js`,import.meta.url));
    const env={...process.env,NODE_ENV:'production',EAS_BUILD_PROFILE:'production',EXPO_PUBLIC_API_URL:''};
    const run=(url:string)=>spawnSync(process.execPath,['-e','require(process.argv[1])',path],{env:{...env,EXPO_PUBLIC_API_URL:url},encoding:'utf8'});
    expect(run('').status).not.toBe(0);
    expect(run('http://localhost:4000').status).not.toBe(0);
    expect(run('https://api.example.com').status).toBe(0);
  }
});
