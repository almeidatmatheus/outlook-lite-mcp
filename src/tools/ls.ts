import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'ls',
  description: 'Lista emails de uma pasta, mais recentes primeiro, uma linha por conversa. Use para ver a caixa, não lidos, emails de hoje etc.',
  inputSchema: obj({
    pasta: str('pasta padrão ou nome de pasta do usuário', { default: 'inbox' }),
    periodo: str('janela de tempo', { enum: PER, default: 'tudo' }),
    filtro: str('filtro', { enum: FIL, default: 'todos' }),
    qtd: { type: 'integer', minimum: 1, maximum: 50, default: 20, description: 'máx de linhas' },
    pg: { type: 'integer', minimum: 0, default: 0, description: 'página (0 = primeira)' },
    conversa: { type: 'boolean', default: true, description: 'agrupar por conversa' },
  }),
  annotations: RO,
  async run(a) {
    const f = await fid(a.pasta), q = Math.min(a.qtd ?? 20, 50), thr = a.conversa !== false;
    const [ge, lt] = per(a.periodo);
    const fl = [`receivedDateTime ge ${ge ?? '1900-01-01T00:00:00Z'}`];
    if (lt) fl.push(`receivedDateTime lt ${lt}`);
    fl.push(({ nao_lidos: 'isRead eq false', sinalizados: "flag/flagStatus eq 'flagged'", com_anexo: 'hasAttachments eq true', prioritarios: "inferenceClassification eq 'focused'" } as Record<string, string>)[a.filtro] ?? '');
    const top = thr ? Math.min(q * 3, 100) : q;
    const r = await g('GET', `/me/mailFolders/${f}/messages?$select=${SEL}&$top=${top}&$skip=${(a.pg ?? 0) * top}&$orderby=${encodeURIComponent('receivedDateTime desc')}&$filter=${encodeURIComponent(fl.filter(Boolean).join(' and '))}`);
    const ms = r?.value ?? [];
    if (!ms.length) return `#${a.pasta ?? 'inbox'} 0 emails`;
    return `#${a.pasta ?? 'inbox'}${r['@odata.nextLink'] ? ' +mais (pg)' : ''}\n` + table(ms, q, thr, f === 'sentitems');
  },
};

export default t;
