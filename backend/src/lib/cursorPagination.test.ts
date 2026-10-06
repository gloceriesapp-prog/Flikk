import { expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { cursorFilter, encodeCursor, readPage, sendPage } from './cursorPagination.js';
const id = '73000000-0000-0000-0000-000000000001';
const req = (query: Record<string,string> = {}) => ({ query }) as unknown as Request;
it('rejects invalid limits, malformed cursors, injected timestamps and cross-account cursors', () => {
  for (const limit of ['0','101','5oops','-1']) expect(() => readPage(req({limit}),'one')).toThrow();
  for (const cursor of ['not-json','%invalid']) expect(() => readPage(req({cursor}),'one')).toThrow();
  const page = readPage(req(),'one');
  const token = encodeCursor(page,{at:'2026-10-01T12:00:00Z',id,kind:true});
  expect(readPage(req({cursor:token}),'one').cursor).toMatchObject({id,kind:true});
  expect(() => readPage(req({cursor:token}),'two')).toThrow();
  const bad = encodeCursor(page,{at:'2026-10-01T12:00:00Z),id.gt.0',id});
  expect(() => readPage(req({cursor:bad}),'one')).toThrow();
});
it('uses an ID tie-breaker and produces continuation only when an extra row exists', () => {
  const page = readPage(req({page:'1',limit:'1'}),'one');
  const res = {set:vi.fn(),json:vi.fn()} as unknown as Response;
  const row = {id,placed_at:'2026-10-01T12:00:00Z'};
  sendPage(res,[row,{...row,id:'73000000-0000-0000-0000-000000000002'}],page,'placed_at');
  const response = vi.mocked(res.json).mock.calls[0]![0];
  expect(response.items).toEqual([row]);
  expect(readPage(req({cursor:response.nextCursor}),'one').cursor?.id).toBe(id);
  expect(cursorFilter('placed_at',{at:row.placed_at,id})).toContain(`and(placed_at.eq.${row.placed_at},id.lt.${id})`);
});
it('retains bounded legacy arrays and accepts date cursors for payouts', () => {
  const page = readPage(req(),'payout','date'); const res = {set:vi.fn(),json:vi.fn()} as unknown as Response;
  sendPage(res,[{id,week:'2026-10-01'}],page,'week'); expect(res.json).toHaveBeenCalledWith([{id,week:'2026-10-01'}]);
  expect(readPage(req({cursor:encodeCursor(page,{at:'2026-10-01',id})}),'payout','date').cursor?.at).toBe('2026-10-01');
});
