import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'rm',
  description: 'Exclui emails (vão para Itens Excluídos, recuperáveis). Pede confirmação.',
  inputSchema: obj({ alvos: ALVOS }, ['alvos']),
  annotations: { destructiveHint: true, openWorldHint: false },
  async cf(a) {
    const ids = resN(a.alvos);
    const rs = await batch(ids.slice(0, 20).map(id => ({ method: 'GET', url: `/me/messages/${id}?$select=subject,from` })));
    return `EXCLUIR ${ids.length} email(s):\n` + rs.map((r, i) => `${put(ids[i])}: ${cell(nm(r.body?.from), 24)} | ${cell(r.body?.subject, 60)}`).join('\n') + (ids.length > 20 ? `\n… +${ids.length - 20}` : '');
  },
  async run(a) {
    const ids = resN(a.alvos);
    const rs = await batch(ids.map(id => ({ method: 'POST', url: `/me/messages/${id}/move`, body: { destinationId: 'deleteditems' } })));
    rs.forEach((r, i) => r.status < 300 && remap(ids[i], r.body?.id));
    return sumr(rs, ids.map((x, i) => (rs[i].status < 300 ? rs[i].body?.id ?? x : x)));
  },
};

export default t;
