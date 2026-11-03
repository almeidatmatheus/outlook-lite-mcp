import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'cx',
  description: 'Conta conectada: email, pastas com totais e não lidos, categorias. acao trocar desconecta e pede login de outra conta.',
  inputSchema: obj({ acao: str('info ou trocar', { enum: ['info', 'trocar'], default: 'info' }) }),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  async run(a) {
    if (a?.acao === 'trocar') {
      const C = cx();
      if (!C.reset) return 'neste modo, troque a conta desconectando e reconectando o conector no app';
      C.c = {}; Object.assign(C.ids, { s2g: new Map(), g2s: new Map(), n: 0, cur: '', last: [] });
      return C.reset();
    }
    const [m, f, c] = await Promise.all([
      me(),
      g('GET', '/me/mailFolders?$top=250&$select=displayName,totalItemCount,unreadItemCount'),
      g('GET', '/me/outlook/masterCategories?$select=displayName').catch(() => null),
    ]);
    cx().c.cats = (c?.value ?? []).map((x: any) => x.displayName);
    return `conta:${m.mail}\n` + tsv(['pasta', 'total', 'nao_lidos'], (f?.value ?? []).map((x: any) => [cell(x.displayName, 40), x.totalItemCount, x.unreadItemCount]))
      + `\ncategorias:${(c?.value ?? []).map((x: any) => x.displayName).join(',') || '-'}`;
  },
};

export default t;
