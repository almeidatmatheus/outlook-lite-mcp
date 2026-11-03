import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'mk',
  description: 'Marca emails como lido, não lido, sinalizado, desinalizado, concluído, importante ou normal.',
  inputSchema: obj({ alvos: ALVOS, marca: str('marca', { enum: MARCA }) }, ['alvos', 'marca']),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async run(a) {
    const ids = resN(a.alvos);
    const b = ({ lido: { isRead: true }, nao_lido: { isRead: false }, sinalizado: { flag: { flagStatus: 'flagged' } }, desinalizado: { flag: { flagStatus: 'notFlagged' } }, concluido: { flag: { flagStatus: 'complete' } }, importante: { importance: 'high' }, normal: { importance: 'normal' } } as Record<string, unknown>)[a.marca];
    return sumr(await batch(ids.map(id => ({ method: 'PATCH', url: `/me/messages/${id}`, body: b }))), ids);
  },
};

export default t;
