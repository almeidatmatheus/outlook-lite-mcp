// Graph + login Microsoft simulados, para testes sem conta real
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

type M = Record<string, any>;
export const calls: { m: string; p: string; b?: any }[] = [];
let n = 100, tokTries = 0, throttle = 1;
const nid = () => 'AAMkAGI2' + 'x'.repeat(140) + ++n;
const now = Date.now();
const ago = (h: number) => new Date(now - h * 36e5).toISOString().replace(/\.\d{3}Z$/, 'Z');
const fr = (name: string, address: string) => ({ emailAddress: { name, address } });

const F: Record<string, string> = { inbox: 'inbox', sentitems: 'sentitems', drafts: 'drafts', archive: 'archive', deleteditems: 'deleteditems', junkemail: 'junkemail', projetos: 'fld-proj' };
const msgs: M[] = [
  { id: nid(), f: 'inbox', subject: 'Fatura outubro', from: fr('Ana Lima', 'ana@acme.com'), toRecipients: [fr('Eu', 'eu@minha.com')], receivedDateTime: ago(1), isRead: false, flag: { flagStatus: 'notFlagged' }, hasAttachments: true, importance: 'high', inferenceClassification: 'focused', bodyPreview: 'Segue a fatura | ref outubro', conversationId: 'c1', categories: [],
    body: 'Oi,\n\nSegue a fatura de outubro: https://track.acme.com/abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnop\n\nAbs\n--\nAna Lima\nFinanceiro\n\n> texto antigo', headers: [{ name: 'X-Mailer', value: 'x' }] },
  { id: nid(), f: 'inbox', subject: 'Re: Fatura outubro', from: fr('Ana Lima', 'ana@acme.com'), toRecipients: [fr('Eu', 'eu@minha.com')], receivedDateTime: ago(2), isRead: true, flag: { flagStatus: 'flagged' }, hasAttachments: false, importance: 'normal', inferenceClassification: 'focused', bodyPreview: 'anterior', conversationId: 'c1', categories: [],
    body: 'Mensagem anterior.\n\nEm seg., 1 de nov. de 2026, Eu escreveu:\n> oi', headers: [] },
  { id: nid(), f: 'inbox', subject: 'Ofertas da semana', from: fr('Loja', 'news@loja.com'), toRecipients: [fr('Eu', 'eu@minha.com')], receivedDateTime: ago(30), isRead: true, flag: { flagStatus: 'notFlagged' }, hasAttachments: false, importance: 'normal', inferenceClassification: 'other', bodyPreview: 'Até 50% off', conversationId: 'c2', categories: [],
    body: 'Até 50% off.\n\nEsta mensagem é confidencial e destinada apenas ao destinatário autorizado.', headers: [{ name: 'List-Unsubscribe', value: '<mailto:x>' }] },
];
const atts: Record<string, M[]> = { [msgs[0].id]: [{ id: 'att1', name: 'fatura.pdf', contentType: 'application/pdf', size: 2048, isInline: false, raw: 'PDFDATA' }] };

const pub = (m: M) => { const { f, body, headers, ...r } = m; return { ...r, uniqueBody: { content: body }, body: { content: body }, internetMessageHeaders: headers }; };
const find = (id: string) => msgs.find(m => m.id === id);

function graph(m: string, url: URL, b: any): [number, any] {
  const p = url.pathname.replace(/^\/v1\.0/, ''), q = url.searchParams;
  let x: RegExpMatchArray | null;
  if (m === 'GET' && p === '/me') return [200, { displayName: 'Eu', mail: 'eu@minha.com' }];
  if (m === 'GET' && p === '/me/outlook/masterCategories') return [200, { value: [{ displayName: 'Financeiro' }] }];
  if (m === 'GET' && p === '/me/mailFolders') return [200, { value: [{ id: 'inbox', displayName: 'Caixa de Entrada', totalItemCount: 3, unreadItemCount: 1, childFolders: [] }, { id: 'fld-proj', displayName: 'Projetos', totalItemCount: 0, unreadItemCount: 0, childFolders: [] }] }];
  if (m === 'GET' && (x = p.match(/^\/me\/mailFolders\/([^/]+)\/messages$/))) {
    if (q.has('$search')) return [200, { value: msgs.filter(y => y.f === x![1]).map(pub) }];
    const fl = q.get('$filter') ?? '';
    if (!fl.startsWith('receivedDateTime ge')) return [400, { error: { code: 'InefficientFilter', message: 'orderby prop must be first in filter' } }];
    if (throttle-- > 0) return [429, { error: { code: 'TooManyRequests', message: 'slow' } }];
    let v = msgs.filter(y => y.f === x![1]);
    if (fl.includes('isRead eq false')) v = v.filter(y => !y.isRead);
    return [200, { value: v.sort((a, c) => c.receivedDateTime.localeCompare(a.receivedDateTime)).slice(0, +(q.get('$top') ?? 10)).map(pub) }];
  }
  if (m === 'GET' && p === '/me/messages') {
    const fl = q.get('$filter') ?? '';
    if ((x = fl.match(/conversationId eq '(.+)'/))) return [200, { value: msgs.filter(y => y.conversationId === x![1]).map(pub) }];
    const s = (q.get('$search') ?? '').toLowerCase();
    return [200, { value: msgs.filter(y => s.includes('ana') ? y.from.emailAddress.name.includes('Ana') : true).map(pub) }];
  }
  if ((x = p.match(/^\/me\/messages\/([^/]+)\/attachments\/([^/]+)\/\$value$/))) return [200, Buffer.from(atts[x[1]]?.find(a => a.id === x![2])?.raw ?? '')];
  if ((x = p.match(/^\/me\/messages\/([^/]+)\/attachments$/))) return [200, { value: atts[x[1]] ?? [] }];
  if ((x = p.match(/^\/me\/messages\/([^/]+)$/))) {
    const it = find(x[1]);
    if (!it) return [404, { error: { code: 'ErrorItemNotFound', message: 'not found' } }];
    if (m === 'GET') return [200, pub(it)];
    if (m === 'PATCH') { Object.assign(it, b, b.body ? { body: b.body.content } : {}); return [200, pub(it)]; }
  }
  if (m === 'POST' && (x = p.match(/^\/me\/messages\/([^/]+)\/(move|reply|replyAll|forward|send|createReply|createReplyAll|createForward)$/))) {
    const it = find(x[1]);
    if (!it) return [404, { error: { code: 'ErrorItemNotFound', message: 'not found' } }];
    if (x[2] === 'move') { it.id = nid(); it.f = b.destinationId; return [201, pub(it)]; }
    if (x[2].startsWith('create')) { const d = { ...it, id: nid(), f: 'drafts', subject: 'RE: ' + it.subject, body: b.comment ?? '' }; msgs.push(d); return [201, pub(d)]; }
    if (x[2] === 'send') { it.f = 'sentitems'; return [202, null]; }
    return [202, null];
  }
  if (m === 'POST' && p === '/me/messages') { const d = { id: nid(), f: 'drafts', subject: b.subject, body: b.body?.content, toRecipients: b.toRecipients, from: fr('Eu', 'eu@minha.com'), headers: [], categories: [] }; msgs.push(d); return [201, pub(d)]; }
  if (m === 'POST' && p === '/me/sendMail') return [202, null];
  if (m === 'POST' && p === '/$batch') {
    return [200, { responses: b.requests.map((r: any) => { const [s, body] = graph(r.method, new URL('http://h/v1.0' + r.url), r.body); return { id: r.id, status: s, body }; }) }];
  }
  return [404, { error: { code: 'NoRoute', message: `${m} ${p}` } }];
}

const read = (r: IncomingMessage) => new Promise<string>(ok => { let s = ''; r.on('data', c => (s += c)); r.on('end', () => ok(s)); });
const send = (w: ServerResponse, s: number, b: any) => {
  if (Buffer.isBuffer(b)) { w.writeHead(s, { 'content-type': 'application/octet-stream' }); return w.end(b); }
  if (b === null) { w.writeHead(s, { 'content-length': '0' }); return w.end(); }
  w.writeHead(s, { 'content-type': 'application/json', ...(s === 429 ? { 'retry-after': '0' } : {}) }); w.end(JSON.stringify(b));
};

export function start(): Promise<number> {
  const srv = createServer(async (r, w) => {
    const url = new URL(r.url!, 'http://h'), raw = await read(r);
    if (url.pathname.endsWith('/authorize')) { // usuário "escolhe a conta" e volta com código
      calls.push({ m: 'GET', p: url.pathname + url.search });
      const back = new URL(url.searchParams.get('redirect_uri')!);
      back.searchParams.set('code', 'MSCODE'); back.searchParams.set('state', url.searchParams.get('state')!);
      w.writeHead(302, { location: back.toString() }); return w.end();
    }
    if (url.pathname.endsWith('/devicecode')) return send(w, 200, { device_code: 'dc', user_code: 'ABC123', verification_uri: 'https://microsoft.com/devicelogin', interval: 0.02, expires_in: 60, message: 'abra e digite ABC123' });
    if (url.pathname.endsWith('/token')) {
      const f = new URLSearchParams(raw);
      if (f.get('grant_type')!.includes('device_code') && tokTries++ < 1) return send(w, 400, { error: 'authorization_pending' });
      if (f.get('grant_type') === 'authorization_code' && (f.get('code') !== 'MSCODE' || !f.get('code_verifier') || !f.get('redirect_uri'))) return send(w, 400, { error: 'invalid_grant' });
      return send(w, 200, { access_token: 'AT', refresh_token: 'RT', expires_in: 3600 });
    }
    if (r.headers.authorization !== 'Bearer AT') return send(w, 401, { error: { code: 'InvalidAuth', message: 'no' } });
    const b = raw ? JSON.parse(raw) : undefined;
    calls.push({ m: r.method!, p: url.pathname + url.search, b });
    const [s, body] = graph(r.method!, url, b);
    send(w, s, body);
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok((srv.address() as any).port)));
}
