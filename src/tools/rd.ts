import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tool } from '../mcp.ts';
import { g, graw, batch, TXT } from '../g.ts';
import { put, res, resN, remap, st } from '../ids.ts';
import { cx } from '../ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from '../fmt.ts';
import { PER, FIL, MARCA, fid, per, me, SEL, flg, table, rcp, hd, sumr, str, ALVO, ALVOS, obj, RO, atts, DL } from '../lib.ts';

const t: Tool = {
  name: 'rd',
  description: 'Lê um email: cabeçalho e corpo limpo (sem citações, assinatura e aviso legal). modo thread mostra a conversa toda.',
  inputSchema: obj({ alvo: ALVO, modo: str('resumo = corpo novo truncado; completo = corpo inteiro; thread = conversa', { enum: ['resumo', 'completo', 'thread'], default: 'resumo' }) }, ['alvo']),
  annotations: RO,
  async run(a) {
    const id = res(a.alvo), md = a.modo ?? 'resumo';
    const m = await g('GET', `/me/messages/${id}?$select=subject,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,categories,flag,isRead,importance,conversationId,uniqueBody,body,internetMessageHeaders`, undefined, TXT);
    st().cur = id;
    (cx().c.meta ??= new Map()).set(id, { de: nm(m.from), ass: m.subject ?? '' });
    const hs = new Map<string, string>((m.internetMessageHeaders ?? []).map((h: any) => [String(h.name).toLowerCase(), String(h.value)]));
    const auto = (hs.get('auto-submitted') ?? 'no') !== 'no' || hs.has('x-autoreply') || /auto_reply|bulk/i.test(hs.get('precedence') ?? '');
    const { dom: md0 } = await me().catch(() => ({ dom: '' }));
    const L = [
      `id:${put(id)}`, `de:${who(m.from)}`, `para:${(m.toRecipients ?? []).map(who).join(', ')}`,
      m.ccRecipients?.length ? `cc:${m.ccRecipients.map(who).join(', ')}` : '',
      `data:${dt(m.receivedDateTime)}`, `ass:${m.subject ?? ''}`,
      `anx:${m.hasAttachments ? 1 : 0}|lido:${m.isRead ? 1 : 0}|flg:${flg(m)}|imp:${m.importance === 'high' ? 1 : 0}|nl:${hs.has('list-unsubscribe') ? 1 : 0}|auto:${auto ? 1 : 0}|ext:${md0 && dom(m.from) !== md0 ? 1 : 0}${m.categories?.length ? `|cat:${m.categories.join(',')}` : ''}`,
    ].filter(Boolean);
    if (md !== 'thread') return cap(L.join('\n') + '\n---\n' + clean(md === 'completo' ? m.body?.content : m.uniqueBody?.content ?? m.body?.content, md === 'completo' ? 20000 : 2000));
    const r = await g('GET', `/me/messages?$filter=${encodeURIComponent(`conversationId eq '${m.conversationId}'`)}&$select=id,from,receivedDateTime,uniqueBody&$top=50`, undefined, TXT);
    const th = (r?.value ?? []).sort((x: any, y: any) => String(x.receivedDateTime).localeCompare(String(y.receivedDateTime)));
    return cap(L.join('\n') + '\n---\n' + th.map((x: any) => `[${put(x.id)}] ${nm(x.from)} ${dt(x.receivedDateTime)}\n${clean(x.uniqueBody?.content, 800)}`).join('\n\n'));
  },
};

export default t;
