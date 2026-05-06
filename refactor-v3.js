const fs = require('fs');

const base = 'impulse/chat-plugins/clans/';

function getBody(filePath) {
    const content = fs.readFileSync(base + filePath, 'utf8');
    let out = [];
    let inImport = false;
    for (let line of content.split('\n')) {
        if (line.startsWith('import ') && !line.includes('from')) {
            inImport = true;
            continue;
        }
        if (inImport) {
            if (line.includes('from')) {
                inImport = false;
            }
            continue;
        }
        if (line.startsWith('import ')) {
            continue;
        }
        out.push(line);
    }
    return out.join('\n');
}

function processBody(body) {
    body = body.replace(/const esc = \(v: string \| number \| undefined \| null\) => Utils\.escapeHTML\(String\(v \?\? ''\)\);/g, '');
    body = body.replace(/function esc\(value: string \| number \| undefined \| null\): string \{\n\treturn Utils\.escapeHTML\(String\(value \?\? ''\)\);\n\}/g, '');
    // Also catch `const esc = Utils.escapeHTML;` just in case
    body = body.replace(/const esc = Utils\.escapeHTML;/g, '');
    return body;
}

// 1. commands.ts
let cmdAdmin = getBody('commands/admin.ts');
let cmdInfo = getBody('commands/clan-info.ts');
let cmdMember = getBody('commands/member.ts');
let cmdRank = getBody('commands/rank.ts');

const commandsImports = `import { Clans, UserClans, ClanLogs, ClanPointsLogs, ClanBattleLogs, ClanWars, ClanBans } from './database';
import { log, hasMinRole, to, toDurationString, getClanContext, getClanById, assertClanMember, assertNotOwner, generateClanProfile, generateInvitePopup, generateAnnouncementPopup, displayElo } from './utils';
import { refreshClanPage } from './render';
import { MAX_CLAN_DESC_LENGTH, MAX_CLAN_TAG_LENGTH, MAX_CLAN_ICON_URL_LENGTH, MAX_LOG_LIMIT, MIN_LOG_LIMIT, DEFAULT_LOG_LIMIT, DEFAULT_PAGE_SIZE, CLAN_TAG_REGEX, ICON_URL_REGEX, ROOM_RANK_OWNER, ROOM_RANK_LEADER, ROOM_RANK_OFFICER, ROOM_RANK_MEMBER, ROOM_RANK_MOTW, CLAN_ROLE_TO_ROOM_RANK, DEFAULT_STATS } from './constants';
import { FS, Utils } from '../../../lib';
import { Table } from '../../impulse-utils';
import type { ClanRole } from './interface';

const esc = (v: string | number | undefined | null) => Utils.escapeHTML(String(v ?? ''));

const ASSIGNABLE_ROLES: ClanRole[] = ['leader', 'officer', 'member'];
const ROLE_LEVELS: Record<ClanRole, number> = { owner: 100, leader: 50, officer: 25, member: 10 };
`;
cmdRank = cmdRank.replace(/const ASSIGNABLE_ROLES: ClanRole\[\] = \['leader', 'officer', 'member'\];/g, '');
cmdRank = cmdRank.replace(/const ROLE_LEVELS: Record<ClanRole, number> = \{[^}]*\};/g, '');
const commandsBody = processBody(cmdAdmin + '\n' + cmdInfo + '\n' + cmdMember + '\n' + cmdRank);
fs.writeFileSync(base + 'commands.ts', commandsImports + commandsBody);

// 2. war.ts
let warAdmin = getBody('war/admin.ts');
let warInfo = getBody('war/info.ts');
let warPlayer = getBody('war/player.ts');
let warContext = getBody('war/war-context.ts');

const warImports = `import { Clans, ClanWars, ClanLogs, ClanBattleLogs, UserClans } from './database';
import { getClanById, assertClanMember, log, toDurationString, displayElo, getExpectedScore, safeElo, calculateElo, generateWarCard, generateWarStats, generateHeadToHeadRecord, broadcastWarUpdate, broadcastWarEnded, getWarUhtmlId, broadcastClanMessage } from './utils';
import { MIN_BEST_OF, MAX_BEST_OF, WAR_CHALLENGE_COOLDOWN_MS, LOBBY_ROOM_ID, ROOM_RANK_LEADER, ROOM_RANK_OFFICER, ROOM_RANK_MEMBER } from './constants';
import { Utils } from '../../../lib';
import { Table } from '../../impulse-utils';
import type { ClanWar, ClanBattleLogEntry, ClanRole } from './interface';
`;
const warBody = processBody(warContext + '\n' + warAdmin + '\n' + warInfo + '\n' + warPlayer);
fs.writeFileSync(base + 'war.ts', warImports + warBody);

// 3. utils.ts
let uUtils = getBody('utils.ts');
let uState = getBody('state.ts');
let uContext = getBody('helpers/context.ts');
let uBroadcast = getBody('helpers/broadcast.ts');
let uElo = getBody('helpers/elo.ts');
let uHtml = getBody('helpers/html.ts');

const utilsImports = `import { Clans, UserClans, ClanWars } from './database';
import { ELO_K_FACTOR, MIN_ELO_CHANGE, ROOM_RANK_OWNER, ROOM_RANK_LEADER, ROOM_RANK_OFFICER, ROOM_RANK_MEMBER } from './constants';
import { Utils, FS } from '../../../lib';
import type { Clan, ClanMember, ClanRole, ClanWar } from './interface';
import type { ClanDoc } from './database';

const esc = (v: string | number | undefined | null) => Utils.escapeHTML(String(v ?? ''));
`;
uContext = uContext.replace(/import type \{ ClanDoc \} from '\.\.\/database';/g, '');
const utilsBody = processBody(uUtils + '\n' + uState + '\n' + uContext + '\n' + uBroadcast + '\n' + uElo + '\n' + uHtml);
fs.writeFileSync(base + 'utils.ts', utilsImports + utilsBody);

// 4. index.ts
let idxCmd = getBody('commands/index.ts');
let idxWar = getBody('war/index.ts');

const indexImports = `import { memberCommands, rankCommands, clanInfoCommands, adminCommands } from './commands';
import { playerWarCommands, infoWarCommands, adminWarCommands } from './war';
import { renderClanPage, refreshClanPage } from './render';
import { setUIState, type ClanView } from './utils';
import { Utils } from '../../../lib';
`;
idxWar = idxWar.replace(/function buildWarHelpHtml/g, 'function buildWarHelpHtmlUnique');
idxWar = idxWar.replace(/buildWarHelpHtml\(/g, 'buildWarHelpHtmlUnique(');
const indexBody = processBody(idxCmd + '\n' + idxWar);
fs.writeFileSync(base + 'index.ts', indexImports + indexBody);

// 5. Update render.ts
let renderContent = fs.readFileSync(base + 'render.ts', 'utf8');
renderContent = renderContent.replace(/from '\.\/helpers\/context'/g, "from './utils'");
renderContent = renderContent.replace(/from '\.\/helpers\/elo'/g, "from './utils'");
renderContent = renderContent.replace(/from '\.\/state'/g, "from './utils'");
fs.writeFileSync(base + 'render.ts', renderContent);

// 6. Update clan-battle.ts
let battleContent = fs.readFileSync(base + 'clan-battle.ts', 'utf8');
battleContent = battleContent.replace(/from '\.\/helpers\/context'/g, "from './utils'");
battleContent = battleContent.replace(/from '\.\/helpers\/elo'/g, "from './utils'");
battleContent = battleContent.replace(/from '\.\/helpers\/broadcast'/g, "from './utils'");
fs.writeFileSync(base + 'clan-battle.ts', battleContent);

console.log("Refactor script done.");