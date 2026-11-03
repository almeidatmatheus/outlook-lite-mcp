import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'snd',
  description: 'Envia um email novo (para, assunto, corpo) ou envia um rascunho existente (alvo). Envia de verdade; pede confirmação.',
  inputSchema: obj({ alvo: str('id curto de um rascunho a enviar (no lugar de para/assunto/corpo)'), para: { type: 'array', items: { type: 'string' } }, cc: { type: 'array', items: { type: 'string' } }, assunto: str('assunto'), corpo: str('texto') }),
  annotations: { destructiveHint: true, openWorldHint: true },
  async cf(a) {
    if (a.alvo) { const m = await hd(res(a.alvo)); return `ENVIAR RASCUNHO "${m.subject ?? ''}"\npara: ${(m.toRecipients ?? []).map(addr).join(', ')}`; }
    if (!a.para?.length || !a.assunto || !a.corpo) throw new Error('informe para, assunto e corpo (ou alvo de um rascunho)');
    rcp(a.para); rcp(a.cc);
    return `ENVIAR para: ${a.para.join(', ')}${a.cc?.length ? `\ncc: ${a.cc.join(', ')}` : ''}\nass: ${a.assunto}\n---\n${a.corpo}`;
  },
  async run(a) {
    if (a.alvo) { await g('POST', `/me/messages/${res(a.alvo)}/send`); return 'enviado'; }
    await g('POST', '/me/sendMail', { message: { subject: a.assunto, body: { contentType: 'Text', content: a.corpo }, toRecipients: rcp(a.para), ccRecipients: rcp(a.cc) }, saveToSentItems: true });
    return 'enviado';
  },
};

export default t;
