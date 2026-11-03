import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'att',
  description: 'Anexos de um email: acao ls lista; acao get baixa o anexo n para a pasta de downloads e devolve o caminho.',
  inputSchema: obj({ alvo: ALVO, acao: str('ls ou get', { enum: ['ls', 'get'], default: 'ls' }), n: { type: 'integer', minimum: 1, description: 'número do anexo (de att ls), para get' } }, ['alvo']),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  async run(a) {
    const id = res(a.alvo);
    st().cur = id;
    if (a.acao !== 'get') {
      const r = await g('GET', `/me/messages/${id}/attachments?$select=id,name,contentType,size,isInline`);
      const v = (r?.value ?? []).filter((x: any) => !x.isInline);
      atts().set(id, v.map((x: any) => ({ id: x.id, name: x.name })));
      return v.length ? tsv(['n', 'nome', 'tipo', 'kb'], v.map((x: any, i: number) => [i + 1, cell(x.name, 80), x.contentType, Math.ceil((x.size ?? 0) / 1024)])) : '0 anexos';
    }
    if (!atts().has(id)) await this.run({ alvo: a.alvo, acao: 'ls' });
    const L = atts().get(id) ?? [];
    if (!a.n && L.length !== 1) throw new Error(`informe n: o email tem ${L.length} anexos (use acao ls)`);
    const x = L[(a.n ?? 1) - 1];
    if (!x) throw new Error(`anexo ${a.n} não existe`);
    const buf = await graw(`/me/messages/${id}/attachments/${x.id}/$value`);
    mkdirSync(DL, { recursive: true });
    const p = join(DL, x.name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_'));
    writeFileSync(p, buf);
    return `salvo:${p}|kb:${Math.ceil(buf.length / 1024)}`;
  },
};

export default t;
