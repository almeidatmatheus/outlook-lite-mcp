import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'mv',
  description: 'Move emails para outra pasta (arquivar = destino arquivo). Não exclui.',
  inputSchema: obj({ alvos: ALVOS, destino: str('pasta de destino: inbox, arquivo, spam ou nome de pasta do usuário') }, ['alvos', 'destino']),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  async run(a) {
    const ids = resN(a.alvos), d = await fid(a.destino);
    const rs = await batch(ids.map(id => ({ method: 'POST', url: `/me/messages/${id}/move`, body: { destinationId: d } })));
    rs.forEach((r, i) => r.status < 300 && remap(ids[i], r.body?.id));
    return sumr(rs, ids.map((x, i) => (rs[i].status < 300 ? rs[i].body?.id ?? x : x)));
  },
};

export default t;
