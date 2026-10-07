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
    const env={...process.env,NODE_ENV:'production',EAS_BUILD_PROFILE:'production',EXPO_PUBLIC_API_URL:'',EAS_PROJECT_ID:'00000000-0000-0000-0000-000000000000',GOOGLE_SERVICES_JSON:'./google-services.json'};
    const run=(url:string)=>spawnSync(process.execPath,['-e','require(process.argv[1])',path],{env:{...env,EXPO_PUBLIC_API_URL:url},encoding:'utf8'});
    expect(run('').status).not.toBe(0);
    expect(run('http://localhost:4000').status).not.toBe(0);
    expect(run('https://api.example.com').status).toBe(0);
  }
});

// Partner and rider push tokens need the EAS project id; a store build
// without it would silently never receive order or pickup pushes.
it('blocks partner and rider release builds without an EAS project id', async () => {
  const {spawnSync}=await import('node:child_process');
  const {fileURLToPath}=await import('node:url');
  for(const app of ['partner','rider']){
    const path=fileURLToPath(new URL(`../../../apps/${app}/app.config.js`,import.meta.url));
    const env={...process.env,NODE_ENV:'production',EAS_BUILD_PROFILE:'production',EXPO_PUBLIC_API_URL:'https://api.example.com',GOOGLE_SERVICES_JSON:'./google-services.json',EAS_PROJECT_ID:''};
    expect(spawnSync(process.execPath,['-e','require(process.argv[1])',path],{env,encoding:'utf8'}).status).not.toBe(0);
  }
});

it('resolves the shared google-services.json only for registered Android apps', async () => {
  const {googleServicesFile}=await import('../../../packages/shared/config/google-services.cjs');
  const {fileURLToPath}=await import('node:url');
  for(const app of ['customer','partner','rider']){
    const dir=fileURLToPath(new URL(`../../../apps/${app}`,import.meta.url));
    expect(googleServicesFile(dir,`com.gloceries.${app}`)).toBe('../../config/firebase/google-services.json');
  }
  expect(()=>googleServicesFile('/tmp','com.gloceries.unknown')).toThrow(/not registered/);
});
