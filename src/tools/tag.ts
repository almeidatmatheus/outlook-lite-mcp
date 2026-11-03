import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'tag',
  description: 'Adiciona ou remove uma categoria do Outlook em vários emails de uma vez.',
  inputSchema: obj({ alvos: ALVOS, cat: str('nome da categoria'), acao: str('add ou rm', { enum: ['add', 'rm'], default: 'add' }) }, ['alvos', 'cat']),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async run(a) {
    const ids = resN(a.alvos);
    const cur = await batch(ids.map(id => ({ method: 'GET', url: `/me/messages/${id}?$select=categories` })));
    const rs = await batch(ids.map((id, i) => {
      const c: string[] = cur[i].body?.categories ?? [];
      return { method: 'PATCH', url: `/me/messages/${id}`, body: { categories: a.acao === 'rm' ? c.filter(x => x !== a.cat) : [...new Set([...c, a.cat])] } };
    }));
    return sumr(rs, ids);
  },
};

export default t;
