import { verifyElf16Kb } from '../scripts/android-native-alignment.cjs';

type Header = { type: number; flags?: number; address?: bigint; memory?: bigint; alignment?: bigint };
function elf(headers: Header[]) {
  const bytes = Buffer.alloc(64 + headers.length * 56);
  Buffer.from([0x7f, 69, 76, 70, 2, 1]).copy(bytes);
  bytes.writeBigUInt64LE(64n, 32); bytes.writeUInt16LE(56, 54); bytes.writeUInt16LE(headers.length, 56);
  headers.forEach((h, i) => {
    const at = 64 + i * 56;
    bytes.writeUInt32LE(h.type, at); bytes.writeUInt32LE(h.flags ?? 4, at + 4);
    bytes.writeBigUInt64LE(h.address ?? 0n, at + 16); bytes.writeBigUInt64LE(h.memory ?? 0x4000n, at + 40);
    bytes.writeBigUInt64LE(h.alignment ?? 0x4000n, at + 48);
  });
  return bytes;
}

it('accepts 16 KB and larger load-segment alignment', () => {
  expect(verifyElf16Kb(elf([{ type: 1 }, { type: 1, alignment: 0x10000n }]))).toBe(true);
});
it('rejects a vendor library with 4 KB load alignment', () => {
  expect(() => verifyElf16Kb(elf([{ type: 1, alignment: 0x1000n }]), 'vendor.so')).toThrow('vendor.so: load segment');
});
it('rejects malformed or truncated native binaries', () => {
  expect(() => verifyElf16Kb(Buffer.alloc(64))).toThrow('invalid ELF');
  const truncated = elf([{ type: 1 }]).subarray(0, 80);
  expect(() => verifyElf16Kb(truncated)).toThrow('program-header table');
});
it('rejects RELRO that would protect subsequent writable data', () => {
  expect(() => verifyElf16Kb(elf([
    { type: 1, flags: 6, address: 0x4000n, memory: 0x2000n },
    { type: 0x6474e552, address: 0x4000n, memory: 0x1000n, alignment: 1n },
  ]))).toThrow('RELRO overlaps writable data');
});
it('accepts a dedicated RELRO load followed by a separately aligned writable load', () => {
  expect(verifyElf16Kb(elf([
    { type: 1, flags: 6, address: 0x4000n, memory: 0x1000n },
    { type: 0x6474e552, address: 0x4000n, memory: 0x1000n, alignment: 1n },
    { type: 1, flags: 6, address: 0x8000n, memory: 0x4000n },
  ]))).toBe(true);
});
