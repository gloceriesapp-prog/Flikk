// jsbarcode ships types for its top-level DOM/canvas API only — this deep
// import (the pure encoder, no DOM) has none. Minimal shim covering only
// what components/BarcodeSvg.tsx actually calls.
declare module 'jsbarcode/src/barcodes' {
  interface BarcodeEncodeResult {
    text: string;
    data: string;
  }

  interface BarcodeEncoder {
    valid(): boolean;
    encode(): BarcodeEncodeResult;
  }

  interface BarcodeEncoderConstructor {
    new (value: string, options: Record<string, unknown>): BarcodeEncoder;
  }

  const barcodes: Record<string, BarcodeEncoderConstructor>;
  export default barcodes;
}
