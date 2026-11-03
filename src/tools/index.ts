import type { Tool } from '../mcp.ts';
import ls from './ls.ts';
import find from './find.ts';
import rd from './rd.ts';
import att from './att.ts';
import rp from './rp.ts';
import fw from './fw.ts';
import snd from './snd.ts';
import drf from './drf.ts';
import mv from './mv.ts';
import rm from './rm.ts';
import mk from './mk.ts';
import tag from './tag.ts';
import cx from './cx.ts';

// ordem = ordem em tools/list
export const tools: Tool[] = [ls, find, rd, att, rp, fw, snd, drf, mv, rm, mk, tag, cx];

export const INSTR = "Email Microsoft. Saída tabular separada por '|'. Emails têm id curto ('3'); 'atual' = último email lido ou afetado; 'ultimo' = 1º da última listagem; alvos aceita 'lista' = todos da última listagem. rp/fw/snd/rm pedem confirmação do usuário.";
