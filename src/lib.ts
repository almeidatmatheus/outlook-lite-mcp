import { homedir } from 'node:os';
import { join } from 'node:path';
import type { S } from './mcp.ts';
import { g, graw, batch, TXT } from './g.ts';
import { put, res, resN, remap, st } from './ids.ts';
import { cx } from './ctx.ts';
import { cell, tsv, dt, nm, dom, who, addr, clean, cap } from './fmt.ts';

// helpers compartilhados pelas ferramentas
export const PASTA = ['inbox', 'enviados', 'rascunhos', 'arquivo', 'excluidos', 'spam'];
export const PER = ['hoje', 'ontem', '7d', '30d', 'tudo'];
export const FIL = ['todos', 'nao_lidos', 'sinalizados', 'com_anexo', 'prioritarios'];
export const MARCA = ['lido', 'nao_lido', 'sinalizado', 'desinalizado', 'concluido', 'importante', 'normal'];
export const WK: Record<string, string> = { inbox: 'inbox', entrada: 'inbox', caixa_de_entrada: 'inbox', enviados: 'sentitems', itens_enviados: 'sentitems', rascunhos: 'drafts', arquivo: 'archive', excluidos: 'deleteditems', lixeira: 'deleteditems', itens_excluidos: 'deleteditems', spam: 'junkemail', lixo_eletronico: 'junkemail' };

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, '_');
export async function fid(p = 'inbox') {
  const k = norm(p);
  if (WK[k]) return WK[k];
  const C = cx().c;
  let FL: Map<string, string> = C.fl;
  if (!FL) {
    FL = C.fl = new Map();
    const r = await g('GET', '/me/mailFolders?$top=250&$select=id,displayName&$expand=childFolders($select=id,displayName)');
    for (const f of r?.value ?? []) { FL.set(norm(f.displayName), f.id); for (const c of f.childFolders ?? []) FL.set(norm(c.displayName), c.id); }
  }
  const id = FL.get(k);
  if (!id) throw new Error(`pasta desconhecida: ${p} (use cx para ver as pastas)`);
  return id;
}

export const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
export function per(p = 'tudo'): [string?, string?] {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  if (p === 'hoje') return [iso(d0)];
  if (p === 'ontem') { const y = new Date(d0); y.setDate(y.getDate() - 1); return [iso(y), iso(d0)]; }
  if (p === '7d' || p === '30d') return [iso(new Date(Date.now() - parseInt(p) * 864e5))];
  return [];
}

export async function me(): Promise<{ dom: string; mail: string }> {
  const C = cx().c;
  if (!C.me) { const r = await g('GET', '/me?$select=mail,userPrincipalName,displayName'); const m = r?.mail || r?.userPrincipalName || ''; C.me = { mail: m, dom: m.split('@')[1]?.toLowerCase() ?? '' }; }
  return C.me;
}

export const SEL = 'id,subject,from,toRecipients,receivedDateTime,isRead,flag,hasAttachments,importance,inferenceClassification,bodyPreview,conversationId';
export const H = ['id', 'de', 'dom', 'ass', 'data', 'anx', 'lido', 'flg', 'foc', 'imp', 'n', 'prev'];
export const flg = (m: any) => (m.flag?.flagStatus === 'flagged' ? 1 : m.flag?.flagStatus === 'complete' ? 'c' : 0);

export function table(ms: any[], q: number, thr: boolean, sent: boolean) {
  const o: { m: any; n: number }[] = [], seen = new Map<string, number>();
  for (const m of ms) {
    const c = m.conversationId;
    if (thr && c) { const i = seen.get(c); if (i !== undefined) { o[i].n++; continue; } seen.set(c, o.length); }
    o.push({ m, n: 1 });
  }
  const v = o.slice(0, q);
  st().last = v.map(x => x.m.id);
  const M: Map<string, { de: string; ass: string }> = (cx().c.meta ??= new Map());
  for (const { m } of v) M.set(m.id, { de: nm(sent ? m.toRecipients?.[0] : m.from), ass: m.subject ?? '' });
  return tsv(H, v.map(({ m, n }) => {
    const p = sent ? m.toRecipients?.[0] : m.from;
    return [put(m.id), cell(nm(p), 24), dom(p), cell(m.subject, 70), dt(m.receivedDateTime), m.hasAttachments ? 1 : 0, m.isRead ? 1 : 0, flg(m), m.inferenceClassification === 'focused' ? 1 : 0, m.importance === 'high' ? 1 : 0, n, cell(m.bodyPreview, 90)];
  }));
}

export const rcp = (xs: unknown) => {
  const v = (Array.isArray(xs) ? xs : xs ? [xs] : []).map(String);
  for (const a of v) if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) throw new Error(`email inválido: ${a}`);
  return v.map(address => ({ emailAddress: { address } }));
};
export const hd = (id: string) => g('GET', `/me/messages/${id}?$select=subject,from,toRecipients,ccRecipients`);
export const sumr = (rs: { status: number; body: any }[], ids: string[]) => {
  const bad = rs.map((r, i) => (r.status >= 300 ? `${put(ids[i])}:${r.status} ${r.body?.error?.code ?? ''}` : '')).filter(Boolean);
  return `ok ${rs.length - bad.length}/${rs.length}${bad.length ? `\nfalhas: ${bad.join(', ')}` : ''}`;
};

// ---- schemas
export const str = (description: string, x: Partial<S> = {}): S => ({ type: 'string', description, ...x });
export const ALVO = str("email: id curto ('3'), 'atual' (último lido/afetado) ou 'ultimo' (1º da última listagem)");
export const ALVOS: S = { oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string', enum: ['lista'] }], description: "lista de alvos (ids curtos, 'atual', 'ultimo') ou 'lista' = todos da última listagem" };
export const obj = (properties: Record<string, S>, required: string[] = []): S => ({ type: 'object', properties, required });
export const RO = { readOnlyHint: true, openWorldHint: false };
export const atts = (): Map<string, { id: string; name: string }[]> => (cx().c.atts ??= new Map());
export const DL = process.env.OUTLOOK_MCP_DL ?? join(homedir(), 'Downloads', 'outlook-lite-mcp');
