import { expect, it } from 'vitest';
import { validateStoreCoordinates, validateStoreFields } from './validation.js';
it('uses the same document, category, hour and coordinate constraints for all writes', () => {
  expect(() => validateStoreFields({ pan_number:'abcde1234f',fssai_number:'12345678901234',category:'Supermarket',open_time:'06:00:00' })).not.toThrow();
  for (const patch of [{name:''},{pan_number:'record'},{fssai_number:'123'},{category:'unlisted'},{is_active:'true'},{lat:91},{open_time:'25:00'},{photo_url:'javascript:alert(1)'}]) expect(() => validateStoreFields(patch)).toThrow();
  expect(() => validateStoreCoordinates({lat:13,lng:null})).toThrow();
});
