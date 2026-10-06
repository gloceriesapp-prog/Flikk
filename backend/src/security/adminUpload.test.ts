import { expect, it } from 'vitest';
import { boundedForm, UploadBodyTooLarge } from '../../../apps/admin/src/features/uploads/boundedForm';
it('rejects declared and chunked multipart bodies above the bound',async()=>{
 await expect(boundedForm(new Request('https://test.invalid',{method:'POST',headers:{'Content-Length':'100'},body:'small'}),10)).rejects.toBeInstanceOf(UploadBodyTooLarge);
 const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(20));controller.close();}});
 const request=new Request('https://test.invalid',{method:'POST',body:stream,duplex:'half'} as RequestInit);
 await expect(boundedForm(request,10)).rejects.toBeInstanceOf(UploadBodyTooLarge);
});
it('parses a bounded multipart upload without trusting MIME metadata',async()=>{
 const form=new FormData();form.append('file',new Blob(['photo'],{type:'image/jpeg'}),'photo.jpg');
 const result=await boundedForm(new Request('https://test.invalid',{method:'POST',body:form}),1000);
 expect(result.get('file')).toBeTruthy();
});
