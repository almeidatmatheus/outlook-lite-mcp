import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'find',
  description: 'Busca emails por texto, remetente ou assunto (busca do Outlook). Use quando o usuário menciona alguém ou um assunto específico.',
  inputSchema: obj({
    termo: str('o que buscar (nome, email, palavra)'),
    campo: str('onde buscar', { enum: ['tudo', 'de', 'assunto', 'corpo'], default: 'tudo' }),
    pasta: str('restringe a uma pasta (vazio = todas)'),
    periodo: str('janela de tempo', { enum: PER, default: 'tudo' }),
    qtd: { type: 'integer', minimum: 1, maximum: 50, default: 15 },
  }, ['termo']),
  annotations: RO,
  async run(a) {
    const t = String(a.termo).replace(/"/g, '');
    const pre = ({ de: 'from:', assunto: 'subject:', corpo: 'body:' } as Record<string, string>)[a.campo] ?? '';
    let k = pre ? `${pre}${t.includes(' ') ? `'${t}'` : t}` : t;
    const [ge] = per(a.periodo);
    if (ge) k += ` received>=${ge.slice(0, 10)}`;
    const base = a.pasta ? `/me/mailFolders/${await fid(a.pasta)}/messages` : '/me/messages';
    const r = await g('GET', `${base}?$search=${encodeURIComponent(`"${k}"`)}&$select=${SEL}&$top=${a.qtd ?? 15}`);
    const ms = (r?.value ?? []).sort((x: any, y: any) => String(y.receivedDateTime).localeCompare(String(x.receivedDateTime)));
    return ms.length ? table(ms, a.qtd ?? 15, false, false) : '0 resultados';
  },
};

export default t;
