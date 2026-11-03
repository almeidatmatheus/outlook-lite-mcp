// sobe o Graph simulado, roda o servidor MCP real via stdio e exercita todas as tools
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { start, calls } from './mock.ts';

const port = await start();
const home = mkdtempSync(join(tmpdir(), 'mm-')), dl = join(home, 'dl');
let fails = 0;
const ok = (c: boolean, msg: string, extra = '') => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) { fails++; if (extra) console.log(extra); } };

function client(elicit?: (p: any) => any, env: Record<string, string> = {}) {
  const p = spawn(process.execPath, ['src/main.ts'], {
    env: { ...process.env, OUTLOOK_MCP_CLIENT_ID: 'cid', OUTLOOK_MCP_AUTH: `http://127.0.0.1:${port}`, OUTLOOK_MCP_GRAPH: `http://127.0.0.1:${port}/v1.0`, OUTLOOK_MCP_HOME: home, OUTLOOK_MCP_DL: dl, OUTLOOK_MCP_OPEN: 'test', ...env },
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const W = new Map<number, (r: any) => void>(); let id = 0;
  createInterface({ input: p.stdout! }).on('line', l => {
    const m = JSON.parse(l);
    if (m.method === 'elicitation/create') return p.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: m.id, result: elicit!(m.params) }) + '\n');
    W.get(m.id)?.(m);
  });
  const rq = (method: string, params: any = {}) => new Promise<any>(r => { const i = ++id; W.set(i, r); p.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: i, method, params }) + '\n'); });
  const call = async (name: string, args: any = {}) => { const r = await rq('tools/call', { name, arguments: args }); return { t: r.result?.content?.[0]?.text ?? JSON.stringify(r.error), e: !!r.result?.isError }; };
  return { p, rq, call };
}

const A = client();
const init = await A.rq('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } });
ok(init.result?.protocolVersion === '2025-06-18' && !!init.result?.instructions, 'initialize');
const tl = (await A.rq('tools/list')).result.tools;
ok(tl.length === 13, `tools/list: ${tl.map((t: any) => t.name).join(',')}`);
ok(!!tl.find((t: any) => t.name === 'rm').inputSchema.properties.cf && tl.find((t: any) => t.name === 'rm').annotations.destructiveHint, 'rm tem cf + destructiveHint');

// ao conectar sem conta, o servidor abre o navegador (aqui: segue os redirects sozinho)
await new Promise(s => setTimeout(s, 400));
const az = calls.find(c => c.p.includes('/authorize'))?.p ?? '';
ok(az.includes('prompt=select_account') && az.includes('code_challenge_method=S256') && az.includes('redirect_uri=http%3A%2F%2Flocalhost'), 'initialize abre login Microsoft (escolha de conta, PKCE, localhost)', az);
ok(JSON.parse(readFileSync(join(home, 'default.json'), 'utf8')).rt === 'RT', 'conta conectada: token salvo');
let r: { t: string; e: boolean };

r = await A.call('ls');
const lines = r.t.split('\n');
ok(!r.e && lines[1]?.startsWith('id|de|dom|ass') && lines.length === 4, 'ls: tabela, 2 conversas (thread agrupada) + retry 429', r.t);
ok(/\|1\|\|?/.test(lines[2]) || lines[2].split('|')[10] === '2', 'ls: conversa c1 com n=2', lines[2]);
ok(!lines[2].includes('AAMk'), 'ls: sem IDs longos do Graph');
console.log(r.t);

r = await A.call('ls', { filtro: 'nao_lidos', periodo: 'hoje' });
ok(!r.e && r.t.split('\n').length === 3, 'ls filtro nao_lidos', r.t);

r = await A.call('rd', { alvo: 'ultimo' });
ok(!r.e && r.t.includes('ass:Fatura outubro') && r.t.includes('<track.acme.com>') && !r.t.includes('Financeiro') && !r.t.includes('texto antigo'), 'rd: corpo limpo (link curto, sem assinatura/citação)', r.t);
console.log(r.t);

r = await A.call('rd', { alvo: 'atual', modo: 'thread' });
ok(!r.e && (r.t.match(/^\[\d+\]/gm) ?? []).length === 2 && !r.t.includes('escreveu'), 'rd thread: 2 mensagens, citação cortada', r.t);

r = await A.call('find', { termo: 'ana', campo: 'de' });
ok(!r.e && r.t.includes('Ana Lima') && calls.some(c => c.p.includes('%22from%3Aana%22')), 'find por remetente (KQL from:)', r.t);

r = await A.call('att', { alvo: 'atual' });
ok(!r.e && r.t.includes('fatura.pdf'), 'att ls', r.t);
r = await A.call('att', { alvo: 'atual', acao: 'get', n: 1 });
ok(!r.e && readFileSync(join(dl, 'fatura.pdf'), 'utf8') === 'PDFDATA', 'att get salva arquivo', r.t);

r = await A.call('rp', { alvo: 'atual', corpo: 'Recebido, obrigado!' });
const cf = r.t.match(/cf="(\w+)"/)?.[1];
ok(!r.e && !!cf && r.t.includes('RESPONDER a Ana Lima') && !calls.some(c => c.p.endsWith('/reply')), 'rp sem cf: preview + código, nada enviado', r.t);
r = await A.call('rp', { alvo: 'atual', corpo: 'outro texto', cf });
ok(r.t.includes('CONFIRMAÇÃO') && !calls.some(c => c.p.endsWith('/reply')), 'rp: cf não vale se args mudam');
r = await A.call('rp', { alvo: 'atual', corpo: 'Recebido, obrigado!', cf });
ok(r.t === 'enviado' && calls.some(c => c.p.endsWith('/reply') && c.b.comment === 'Recebido, obrigado!'), 'rp com cf: enviado');

r = await A.call('mk', { alvos: 'lista', marca: 'lido' });
ok(r.t === 'ok 2/2', 'mk lista via $batch', r.t);
r = await A.call('tag', { alvos: ['1'], cat: 'Financeiro' });
ok(r.t === 'ok 1/1' && calls.some(c => c.p === '/v1.0/$batch' && c.b.requests[0].body?.categories?.[0] === 'Financeiro'), 'tag', r.t);

r = await A.call('mv', { alvos: ['1'], destino: 'Projetos' });
ok(r.t === 'ok 1/1', 'mv para pasta do usuário', r.t);
r = await A.call('rd', { alvo: '1' });
ok(!r.e && r.t.includes('id:1'), 'id curto continua válido após mover (id Graph muda)', r.t);

r = await A.call('rm', { alvos: ['2'] });
const cf2 = r.t.match(/cf="(\w+)"/)?.[1];
ok(r.t.includes('EXCLUIR 1') && r.t.includes('Ofertas'), 'rm preview', r.t);
r = await A.call('rm', { alvos: ['2'], cf: cf2 });
ok(r.t === 'ok 1/1', 'rm confirmado', r.t);

r = await A.call('drf', { tipo: 'novo', para: ['bob@x.com'], assunto: 'Oi', corpo: 'rascunho' });
const did = r.t.match(/rascunho:(\d+)/)?.[1];
ok(!!did, 'drf novo', r.t);
r = await A.call('drf', { tipo: 'editar', alvo: did, corpo: 'editado' });
ok(!r.e, 'drf editar', r.t);
r = await A.call('snd', { alvo: did });
const cf3 = r.t.match(/cf="(\w+)"/)?.[1];
r = await A.call('snd', { alvo: did, cf: cf3 });
ok(r.t === 'enviado' && calls.some(c => c.p.endsWith('/send')), 'snd rascunho', r.t);
r = await A.call('snd', { para: ['nao-email'], assunto: 'x', corpo: 'y' });
ok(r.e && r.t.includes('email inválido'), 'snd valida email', r.t);
r = await A.call('fw', { alvo: '1', para: ['bob@x.com'], nota: 'fyi' });
ok(r.t.includes('ENCAMINHAR'), 'fw pede confirmação');

r = await A.call('ls', { filtro: 'xyz' });
ok(r.e && r.t.includes('nao_lidos'), 'enum inválido rejeitado', r.t);
r = await A.call('rd', {});
ok(r.e && r.t.includes('alvo: obrigatório'), 'required', r.t);
r = await A.call('rd', { alvo: '999' });
ok(r.e && r.t.includes('desconhecido'), 'id curto desconhecido', r.t);
r = await A.call('cx');
ok(!r.e && r.t.includes('conta:eu@minha.com') && r.t.includes('categorias:Financeiro'), 'cx', r.t);
const un = await A.rq('foo/bar');
ok(un.error?.code === -32601, 'método desconhecido -32601');
const nAuth = calls.filter(c => c.p.includes('/authorize')).length;
r = await A.call('cx', { acao: 'trocar' });
ok(r.t.includes('abri o navegador') && r.t.includes('select_account'), 'cx trocar: abre escolha de conta de novo', r.t);
await new Promise(s => setTimeout(s, 400));
ok(calls.filter(c => c.p.includes('/authorize')).length === nAuth + 1, 'cx trocar: novo login feito');
r = await A.call('rd', { alvo: '1' });
ok(r.e && r.t.includes('desconhecido'), 'cx trocar: ids da conta anterior zerados', r.t);
A.p.kill();

// fallback device code (ex.: servidor sem navegador)
const home2 = mkdtempSync(join(tmpdir(), 'mm-'));
const C = client(undefined, { OUTLOOK_MCP_LOGIN: 'device', OUTLOOK_MCP_HOME: home2 });
await C.rq('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } });
r = await C.call('ls');
ok(r.e && r.t.includes('ABC123'), 'device code: devolve link + código', r.t);
await new Promise(s => setTimeout(s, 300));
r = await C.call('ls');
ok(!r.e && r.t.includes('id|de'), 'device code: funciona após login', r.t);
C.p.kill();

// cliente com elicitation: confirmação vai direto ao usuário
let asked = 0;
const B = client(() => (++asked === 1 ? { action: 'accept', content: { confirmar: true } } : { action: 'decline' }));
await B.rq('initialize', { protocolVersion: '2025-06-18', capabilities: { elicitation: {} }, clientInfo: { name: 't', version: '0' } });
await B.call('ls');
r = await B.call('rp', { alvo: 'ultimo', corpo: 'via elicitation' });
ok(r.t === 'enviado' && asked === 1, 'elicitation aceita -> envia', r.t);
r = await B.call('rp', { alvo: 'ultimo', corpo: 'recusado' });
ok(r.t.includes('cancelado') && !calls.some(c => c.b?.comment === 'recusado'), 'elicitation recusada -> nada enviado', r.t);
B.p.kill();

// ---- modo remoto: simula o claude.ai conectando o conector
const HP = 18787, BASE = `http://127.0.0.1:${HP}`;
const home3 = mkdtempSync(join(tmpdir(), 'mm-'));
const hs = spawn(process.execPath, ['src/main.ts', 'http'], {
  env: { ...process.env, OUTLOOK_MCP_CLIENT_ID: 'cid', OUTLOOK_MCP_AUTH: `http://127.0.0.1:${port}`, OUTLOOK_MCP_GRAPH: `http://127.0.0.1:${port}/v1.0`, OUTLOOK_MCP_HOME: home3, PORT: String(HP), OUTLOOK_MCP_URL: BASE, OUTLOOK_MCP_ALLOW: 'minha.com' },
  stdio: ['ignore', 'ignore', 'pipe'],
});
await new Promise<void>(ok => hs.stderr!.on('data', d => String(d).includes('http em') && ok()));
const F = (p: string, o: RequestInit = {}) => fetch(p.startsWith('http') ? p : BASE + p, { redirect: 'manual', ...o });
let x = await F('/mcp', { method: 'POST', body: '{}' });
ok(x.status === 401 && (x.headers.get('www-authenticate') ?? '').includes('resource_metadata="http://127.0.0.1:18787/.well-known/oauth-protected-resource"'), 'http: 401 com resource_metadata');
const prm = await (await F('/.well-known/oauth-protected-resource')).json() as any;
const asm = await (await F('/.well-known/oauth-authorization-server')).json() as any;
ok(prm.authorization_servers[0] === BASE && asm.code_challenge_methods_supported[0] === 'S256' && !!asm.registration_endpoint, 'http: metadata OAuth');
const RU = 'https://claude.ai/api/mcp/auth_callback';
const reg = await (await F('/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ redirect_uris: [RU], client_name: 'Claude' }) })).json() as any;
ok(!!reg.client_id, 'http: registro dinâmico (DCR)');
const { createHash } = await import('node:crypto');
const ver = 'v'.repeat(50), chal = createHash('sha256').update(ver).digest('base64url');
x = await F(`/authorize?${new URLSearchParams({ response_type: 'code', client_id: reg.client_id, redirect_uri: RU, code_challenge: chal, code_challenge_method: 'S256', state: 'st1', resource: BASE + '/mcp' })}`);
const toMs = x.headers.get('location') ?? '';
ok(x.status === 302 && toMs.includes('/oauth2/v2.0/authorize') && toMs.includes('prompt=select_account'), 'http: authorize leva à escolha de conta Microsoft', toMs);
x = await F(toMs); x = await F(x.headers.get('location')!);
const back = new URL(x.headers.get('location') ?? 'http://x');
ok(back.origin + back.pathname === RU && back.searchParams.get('state') === 'st1' && !!back.searchParams.get('code'), 'http: volta ao claude.ai com code + state', back.toString());
const tokf = (b: Record<string, string>) => F('/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(b) });
const tb = { grant_type: 'authorization_code', code: back.searchParams.get('code')!, redirect_uri: RU, client_id: reg.client_id };
let tr = await (await tokf({ ...tb, code_verifier: 'errado' })).json() as any;
ok(tr.error === 'invalid_grant', 'http: PKCE errado rejeitado');
x = await F(`/authorize?${new URLSearchParams({ response_type: 'code', client_id: reg.client_id, redirect_uri: RU, code_challenge: chal, code_challenge_method: 'S256', state: 'st2' })}`);
x = await F(x.headers.get('location')!); x = await F(x.headers.get('location')!);
tr = await (await tokf({ ...tb, code: new URL(x.headers.get('location')!).searchParams.get('code')!, code_verifier: ver })).json() as any;
ok(!!tr.access_token && !!tr.refresh_token && tr.token_type === 'Bearer', 'http: token emitido');
const mcp = async (body: any, at = tr.access_token) => F('/mcp', { method: 'POST', headers: { authorization: `Bearer ${at}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify(body) });
x = await mcp({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'claude-ai', version: '0' } } });
ok(x.status === 200 && !!x.headers.get('mcp-session-id') && (await x.json() as any).result.serverInfo.name === 'outlook-lite-mcp', 'http: initialize');
x = await mcp({ jsonrpc: '2.0', method: 'notifications/initialized' });
ok(x.status === 202, 'http: notificação -> 202');
const tl2 = await (await mcp({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).json() as any;
ok(tl2.result.tools.length === 13, 'http: tools/list');
const lsr = await (await mcp({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'ls', arguments: {} } })).json() as any;
ok(lsr.result.content[0].text.includes('id|de|dom'), 'http: ls com a conta conectada', JSON.stringify(lsr));
const rmr = await (await mcp({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'rm', arguments: { alvos: ['1'] } } })).json() as any;
ok(rmr.result.content[0].text.includes('CONFIRMAÇÃO'), 'http: rm pede confirmação');
const rf = await (await tokf({ grant_type: 'refresh_token', refresh_token: tr.refresh_token, client_id: reg.client_id })).json() as any;
ok(!!rf.access_token && (await mcp({ jsonrpc: '2.0', id: 5, method: 'ping' }, rf.access_token)).status === 200, 'http: refresh token');
ok((await (await tokf({ grant_type: 'refresh_token', refresh_token: tr.refresh_token })).json() as any).error === 'invalid_grant', 'http: refresh antigo invalidado (rotação)');
hs.kill();

console.log(fails ? `\n${fails} falha(s)` : '\ntudo ok');
process.exit(fails ? 1 : 0);
