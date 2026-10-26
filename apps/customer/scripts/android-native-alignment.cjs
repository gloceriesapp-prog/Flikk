const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const PAGE = 16384n;

// Read ELF program headers directly so CI checks every shipped 64-bit library,
// including vendor prebuilts. Source/toolchain settings alone are insufficient.
function verifyElf16Kb(bytes, name = 'native library') {
  assert.ok(bytes.length >= 64 && bytes.subarray(0, 4).equals(Buffer.from([0x7f, 69, 76, 70])), `${name}: invalid ELF header.`);
  assert.equal(bytes[4], 2, `${name}: expected a 64-bit ELF library.`);
  assert.equal(bytes[5], 1, `${name}: unsupported ELF byte order.`);
  const offset = Number(bytes.readBigUInt64LE(32));
  const size = bytes.readUInt16LE(54), count = bytes.readUInt16LE(56);
  assert.ok(Number.isSafeInteger(offset) && size >= 56 && count > 0 && offset + size * count <= bytes.length,
    `${name}: invalid ELF program-header table.`);
  const headers = Array.from({ length: count }, (_, i) => {
    const at = offset + i * size;
    return { type: bytes.readUInt32LE(at), flags: bytes.readUInt32LE(at + 4),
      address: bytes.readBigUInt64LE(at + 16), memory: bytes.readBigUInt64LE(at + 40),
      alignment: bytes.readBigUInt64LE(at + 48) };
  });
  const loads = headers.filter(h => h.type === 1);
  assert.ok(loads.length > 0, `${name}: missing ELF load segments.`);
  for (const h of loads) assert.ok(h.alignment >= PAGE, `${name}: load segment is not 16 KB aligned.`);
  for (const relro of headers.filter(h => h.type === 0x6474e552)) {
    const end = relro.address + relro.memory;
    const protectedEnd = (end + PAGE - 1n) / PAGE * PAGE;
    // An unaligned RELRO end is safe when its LOAD contains only RELRO and
    // subsequent writable LOADs start on another 16 KB page (Android guidance).
    const overlapsWritableTail = loads.some(h => (h.flags & 2) !== 0 &&
      h.address < protectedEnd && h.address + h.memory > end);
    assert.ok(end === protectedEnd || !overlapsWritableTail, `${name}: RELRO overlaps writable data on a 16 KB page.`);
  }
  return true;
}
module.exports = { verifyElf16Kb };
