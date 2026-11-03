import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'drf',
  description: 'Cria ou edita rascunho sem enviar: novo, resposta, resposta_todos, encaminhar ou editar um rascunho existente. Envie depois com snd alvo.',
  inputSchema: obj({
    tipo: str('tipo', { enum: ['novo', 'resposta', 'resposta_todos', 'encaminhar', 'editar'], default: 'novo' }),
    alvo: str('email base (resposta/encaminhar) ou rascunho (editar)'),
    para: { type: 'array', items: { type: 'string' } }, assunto: str('assunto'), corpo: str('texto'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  async run(a) {
    const t = a.tipo ?? 'novo';
    let r: any;
    if (t === 'novo') r = await g('POST', '/me/messages', { subject: a.assunto ?? '', body: { contentType: 'Text', content: a.corpo ?? '' }, toRecipients: rcp(a.para) });
    else {
      if (!a.alvo) throw new Error('alvo obrigatório para ' + t);
      const id = res(a.alvo);
      if (t === 'editar') r = await g('PATCH', `/me/messages/${id}`, { ...(a.assunto !== undefined ? { subject: a.assunto } : {}), ...(a.corpo !== undefined ? { body: { contentType: 'Text', content: a.corpo } } : {}), ...(a.para ? { toRecipients: rcp(a.para) } : {}) });
      else r = await g('POST', `/me/messages/${id}/${({ resposta: 'createReply', resposta_todos: 'createReplyAll', encaminhar: 'createForward' } as Record<string, string>)[t]}`, { comment: a.corpo ?? '', ...(t === 'encaminhar' && a.para ? { toRecipients: rcp(a.para) } : {}) });
    }
    st().cur = r?.id ?? st().cur;
    return `rascunho:${r?.id ? put(r.id) : '?'}`;
  },
};

export default t;
