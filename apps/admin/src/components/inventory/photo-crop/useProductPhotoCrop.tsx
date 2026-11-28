'use client';

import { useEffect, useRef, useState } from 'react';
import { ProductPhotoCropDialog } from './ProductPhotoCropDialog';

/** One review per upload batch. Nothing uploads until the batch is confirmed. */
export function useProductPhotoCrop() {
  const [files, setFiles] = useState<File[] | null>(null);
  const pending = useRef<((files: File[] | null) => void) | null>(null);
  useEffect(() => () => { pending.current?.(null); pending.current = null; }, []);

  function preparePhotos(selected: File[]) {
    if (pending.current) return Promise.reject(new Error('Finish the current photo preview first.'));
    return new Promise<File[] | null>(resolve => { pending.current = resolve; setFiles(selected); });
  }

  function finish(result: File[] | null) {
    pending.current?.(result);
    pending.current = null;
    setFiles(null);
  }

  return {
    preparePhotos,
    cropDialog: files && <ProductPhotoCropDialog files={files} onComplete={finish} />,
  };
}
