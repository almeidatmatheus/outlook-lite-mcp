import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'rp',
  description: 'Responde um email (ao remetente ou a todos). Envia de verdade; pede confirmação.',
  inputSchema: obj({ alvo: ALVO, corpo: str('texto da resposta'), todos: { type: 'boolean', default: false, description: 'responder a todos' } }, ['alvo', 'corpo']),
  annotations: { destructiveHint: true, openWorldHint: true },
  async cf(a) { const m = await hd(res(a.alvo)); return `RESPONDER${a.todos ? ' A TODOS' : ''} a ${who(m.from)}\nass: Re: ${m.subject ?? ''}\n---\n${a.corpo}`; },
  async run(a) { const id = res(a.alvo); await g('POST', `/me/messages/${id}/${a.todos ? 'replyAll' : 'reply'}`, { comment: a.corpo }); st().cur = id; return 'enviado'; },
};

export default t;
