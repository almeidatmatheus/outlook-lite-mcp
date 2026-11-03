import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'fw',
  description: 'Encaminha um email para outros destinatários, com nota opcional. Envia de verdade; pede confirmação.',
  inputSchema: obj({ alvo: ALVO, para: { type: 'array', items: { type: 'string' }, description: 'emails dos destinatários' }, nota: str('texto acima do email encaminhado') }, ['alvo', 'para']),
  annotations: { destructiveHint: true, openWorldHint: true },
  async cf(a) { rcp(a.para); const m = await hd(res(a.alvo)); return `ENCAMINHAR "${m.subject ?? ''}" (de ${who(m.from)})\npara: ${a.para.join(', ')}\n---\n${a.nota ?? ''}`; },
  async run(a) { const id = res(a.alvo); await g('POST', `/me/messages/${id}/forward`, { comment: a.nota ?? '', toRecipients: rcp(a.para) }); st().cur = id; return 'encaminhado'; },
};

export default t;
