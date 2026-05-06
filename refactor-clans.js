const fs = require('fs');
const path = require('path');

const CLANS_DIR = '/data/data/com.termux/files/home/impulse-ps/impulse/chat-plugins/clans';

// Helper to read file
function read(relPath) {
    return fs.readFileSync(path.join(CLANS_DIR, relPath), 'utf8');
}

// Helper to write file
function write(relPath, content) {
    fs.writeFileSync(path.join(CLANS_DIR, relPath), content, 'utf8');
}

function stripImports(content) {
    // strip single line imports
    content = content.replace(/^import\s+[^;]+;\s*$/gm, '');
    // strip multi-line imports
    content = content.replace(/^import\s+{[\s\S]*?}\s*from\s*['"][^'"]+['"];?\s*$/gm, '');
    // just to be safe
    content = content.replace(/^import\s+type\s+{[\s\S]*?}\s*from\s*['"][^'"]+['"];?\s*$/gm, '');
    return content;
}

function stripEsc(content) {
    content = content.replace(/const esc = Utils\.escapeHTML;\n?/g, '');
    content = content.replace(/const esc = \(v: string \| number \| undefined \| null\) => Utils\.escapeHTML\(String\(v \?\? ''\)\);\n?/g, '');
    // function esc
    content = content.replace(/function esc\(value: string \| number \| undefined \| null\): string {[\s\S]*?return Utils\.escapeHTML\(String\(value \?\? ''\)\);\n}\n?/g, '');
    return content;
}

// 1. merge commands/index.ts and war/index.ts into index.ts
// I will keep the index.ts write mostly as-is, but ensuring it's completely overwritten
const indexTsContent = `import { memberCommands, rankCommands, clanInfoCommands, adminCommands } from './commands';
import { warCommands } from './war';
import { renderClanPage, refreshClanPage } from './render';
import { setUIState, type ClanView } from './utils';

const MEMBER_HELP = [
	{ cmd: "/clan join [Clan ID]", desc: "Join a clan." },
	{ cmd: "/clan leave", desc: "Leave your current clan." },
	{ cmd: "/clan kick [user]", desc: "Remove a member from the clan. Requires: Officer+." },
	{ cmd: "/clan invite [user]", desc: "Invite a user to your clan. Requires: Officer+." },
	{ cmd: "/clan deinvite [user]", desc: "Revoke a user's invite. Requires: Officer+." },
	{ cmd: "/clan invites", desc: "View clan invites." },
	{ cmd: "/clan inviteonly [on/off/toggle]", desc: "Toggle invite-only mode. Requires: Leader+." },
	{ cmd: "/clan announce [message]", desc: "Send announcement to all members. Requires: Leader+." },
];

const ROLE_HELP = [
	{ cmd: "/clan promote [user], [role]", desc: "Promote a member to a higher role. Requires: Leader+." },
	{ cmd: "/clan demote [user], [role]", desc: "Demote a member to a lower role. Requires: Leader+." },
	{ cmd: "/clan transfer [user]", desc: "Transfer clan ownership. Requires: Owner." },
];

const INFO_HELP = [
	{ cmd: "/clan profile [Clan ID]", desc: "View clan profile." },
	{ cmd: "/clan members [Clan ID]", desc: "View member list." },
	{ cmd: "/clan list [page], [sortby]", desc: "View all clans. Sort by elo or points." },
	{ cmd: "/clan logs [Clan ID], [limit]", desc: "View activity logs." },
	{ cmd: "/clan pointslog [limit]", desc: "View points logs." },
	{ cmd: "/clan battlelogs [clanid]", desc: "View a clan's recent war battle logs." },
	{ cmd: "/clan setdesc [description]", desc: "Set clan description. Requires: Leader+." },
	{ cmd: "/clan settag [tag]", desc: "Set clan tag (max 4 uppercase letters). Requires: Leader+." },
	{ cmd: "/clan setmotw [user]", desc: "Set member of the week. Requires: Leader+." },
	{ cmd: "/clan seticon [URL]", desc: "Set clan icon. Requires: Leader+." },
];

const WAR_HELP = [
	{ cmd: "/clan war help", desc: "View all clan war commands." },
];

const ADMIN_HELP = [
	{ cmd: "/clan create [Clan Name], [Owner ID]", desc: "Create a new clan. Requires: &." },
	{ cmd: "/clan delete [Clan ID]", desc: "Delete a clan. Requires: &." },
	{ cmd: "/clan addpoints [clan id], [amount], [reason]", desc: "Add points to a clan. Requires: &." },
	{ cmd: "/clan removepoints [clan id], [amount], [reason]", desc: "Remove points from a clan. Requires: &." },
	{ cmd: "/clan addtourwins [clan id], [amount]", desc: "Add tour wins. Requires: &." },
	{ cmd: "/clan removetourwins [clan id], [amount]", desc: "Remove tour wins. Requires: &." },
	{ cmd: "/clan resetstats [clan id]", desc: "Reset clan stats. Requires: &." },
	{ cmd: "/clan setdescadmin [clan id], [desc]", desc: "Set description for any clan. Requires: &." },
	{ cmd: "/clan settagadmin [clan id], [tag]", desc: "Set tag for any clan. Requires: &." },
	{ cmd: "/clan seticonadmin [clan id], [icon url]", desc: "Set icon for any clan. Requires: &." },
	{ cmd: "/clan kickall [clan id]", desc: "Kick all members except owner. Requires: &." },
	{ cmd: "/clan clearinvites [clan id]", desc: "Clear all clan invites. Requires: &." },
	{ cmd: "/clan export [clan id]", desc: "Export clan data. Requires: &." },
	{ cmd: "/clan transferadmin [clan id], [new owner]", desc: "Transfer ownership. Requires: &." },
	{ cmd: "/clan banuser [username]", desc: "Ban user from joining clans. Requires: &." },
	{ cmd: "/clan unbanuser [username]", desc: "Unban user. Requires: &." },
	{ cmd: "/clan clearlogs [clan id]", desc: "Clear all logs for clan. Requires: &." },
	{ cmd: "/clan clearmembers [clan id]", desc: "Remove all members except owner. Requires: &." },
];

function buildHelpHtml(
	sections: { title: string; items: { cmd: string; desc: string }[] }[]
): string {
	let html = `<div style="max-height: 380px; overflow-y: auto;">`;

	for (const section of sections) {
		html += `<center><strong>\${section.title}</strong></center><hr>`;
		html += `<ul style="list-style-type:none;padding-left:0;">`;
		html += section.items.map(({ cmd, desc }, i) =>
			`<li><b>\${cmd}</b> - \${desc}</li>\${i < section.items.length - 1 ? '<hr>' : ''}`
		).join('');
		html += `</ul>`;
	}

	html += `</div>`;
	return html;
}

export const commands: Chat.ChatCommands = {
	clan: {
		...memberCommands,
		...rankCommands,
		...clanInfoCommands,
		...adminCommands,
		war: {
			...warCommands,
		},
		help() {
			if (!this.runBroadcast()) return;
			const html = buildHelpHtml([
				{ title: 'Member Commands', items: MEMBER_HELP },
				{ title: 'Role Commands', items: ROLE_HELP },
				{ title: 'Info & Settings', items: INFO_HELP },
				{ title: 'War Commands', items: WAR_HELP },
				{ title: 'Admin Commands', items: ADMIN_HELP },
			]);
			this.sendReplyBox(html);
		},

		view(target, room, user) {
			this.checkChat();
			const [view, ...args] = target.split(' ');
			const clanView = view as ClanView;

			switch (clanView) {
			case 'main':
				setUIState(user.id, { view: 'main' });
				break;
			case 'profile':
				setUIState(user.id, { view: 'profile', targetId: args[0] });
				break;
			case 'list':
				setUIState(user.id, { view: 'list', page: parseInt(args[0]) || 1 });
				break;
			case 'members':
				setUIState(user.id, { view: 'members', targetId: args[0] });
				break;
			default:
				return this.errorReply(`Unknown view: \${view}`);
			}

			refreshClanPage(user);
		},

		'': function () {
			return this.parse('/join view-clans');
		},
	},
};

export const pages: Chat.PageTable = {
	async clans(args, user) {
		if (!user.named) return this.errorReply('Login required to view clans.');
		this.title = `Clans`;
		return await renderClanPage(user, this.room!);
	},
};
`;
write('index.ts', indexTsContent);

// 2. commands.ts
const commandFiles = ['commands/admin.ts', 'commands/clan-info.ts', 'commands/member.ts', 'commands/rank.ts'];
let commandsTsBody = '';
for (const file of commandFiles) {
    let content = read(file);
    content = stripImports(content);
    content = stripEsc(content);
    // remove redundant variables if any (e.g., MAX_CLAN_DESC_LENGTH from some places if imported)
    // actually, let's keep all variables but if they conflict I will fix it
    commandsTsBody += content + '\n';
}

const commandsTsHeader = `import type { ClanRole } from './interface';
import { CLAN_ROLE_TO_ROOM_RANK } from './constants';
import { Clans, UserClans, ClanLogs, ClanPointsLogs, ClanBattleLogs, ClanBans } from './database';
import { Utils, FS } from '../../../lib';
import { Table } from '../../impulse-utils';
import {
    getClanContext, getClanById, assertClanMember, assertNotOwner,
    hasMinRole, log, to, toDurationString, displayElo,
    generateClanProfile, generateInvitePopup, generateAnnouncementPopup
} from './utils';
import { refreshClanPage } from './render';

const esc = (v: string | number | undefined | null) => Utils.escapeHTML(String(v ?? ''));

`;
// we should also remove any remaining MAX_CLAN_DESC_LENGTH from commands if they duplicate constants.ts
// they are defined in constants.ts so we should import them!
const constantsToImport = ['MAX_CLAN_DESC_LENGTH', 'MAX_CLAN_TAG_LENGTH', 'MAX_CLAN_ICON_URL_LENGTH', 'CLAN_TAG_REGEX', 'ICON_URL_REGEX'];
// we will just regex out their declarations from commandsTsBody
for (const c of constantsToImport) {
    commandsTsBody = commandsTsBody.replace(new RegExp('const ' + c + '.*?;\\\\n', 'g'), '');
}
// update imports in header
const newConstantsImport = `import { CLAN_ROLE_TO_ROOM_RANK, \${constantsToImport.join(', ')} } from './constants';`;
write('commands.ts', commandsTsHeader.replace(`import { CLAN_ROLE_TO_ROOM_RANK } from './constants';`, newConstantsImport) + commandsTsBody);

// 3. war.ts
const warFiles = ['war/admin.ts', 'war/info.ts', 'war/player.ts', 'war/war-context.ts'];
let warTsBody = '';
for (const file of warFiles) {
    let content = read(file);
    content = stripImports(content);
    warTsBody += content + '\n';
}

const warIndexContent = read('war/index.ts');
const warHelpBlocks = warIndexContent.match(/const [A-Z_]+_WAR_HELP = \[[^\]]+\];/g) || [];
let warHelpContent = warHelpBlocks.join('\n\n') + '\n\n';
warHelpContent += `
function buildWarHelpHtml(
	sections: { title: string; items: { cmd: string; desc: string }[] }[]
): string {
	let html = `<div style="max-height: 380px; overflow-y: auto;">`;

	for (const section of sections) {
		html += `<center><strong>\${section.title}</strong></center><hr>`;
		html += `<ul style="list-style-type:none;padding-left:0;">`;
		html += section.items.map(({ cmd, desc }, i) =>
			`<li><b>\${cmd}</b> - \${desc}</li>\${i < section.items.length - 1 ? '<hr>' : ''}`
		).join('');
		html += `</ul>`;
	}

	html += `</div>`;
	return html;
}

export const warCommands: Chat.ChatCommands = {
	...playerWarCommands,
	...infoWarCommands,
	...adminWarCommands,

	help() {
		if (!this.runBroadcast()) return;
		const html = buildWarHelpHtml([
			{ title: 'Player War Commands', items: PLAYER_WAR_HELP },
			{ title: 'Info & Stats Commands', items: INFO_WAR_HELP },
			{ title: 'Admin War Commands', items: ADMIN_WAR_HELP },
		]);
		this.sendReplyBox(html);
	},
};
`;

const warTsHeader = `import { Clans, ClanWars, UserClans, ClanBattleLogs } from './database';
import { Utils } from '../../../lib';
import { Table } from '../../impulse-utils';
import {
    getClanContext, getClanById, assertClanMember, hasMinRole,
    log, to, toDurationString, displayElo,
    calculateElo, safeElo
} from './utils';
import {
    getExistingWar,
    getWarUhtmlId,
    broadcastWarEnded,
    broadcastWarUpdate,
    generateWarStats,
    generateHeadToHeadRecord
} from './utils'; // we will merge war-context into utils.ts instead? 
// WAIT! I merged war-context into war.ts! 
// If war-context is inside war.ts, we don't need to import its functions!

// Oh, I see war-context functions are used inside war.ts. 
`;
// Let's not import those if they are in war.ts. They are in warTsBody!
const warConstantsToImport = ['WAR_CHALLENGE_COOLDOWN_MS', 'DEFAULT_LOG_LIMIT', 'DEFAULT_PAGE_SIZE', 'MIN_BEST_OF', 'MAX_BEST_OF'];
for (const c of warConstantsToImport) {
    warTsBody = warTsBody.replace(new RegExp(`const \${c}.*?;\\n`, 'g'), '');
}

const warTsHeaderFixed = `import type { Clan, ClanWar, ClanDoc, ClanWarDoc } from './interface';
import { Clans, ClanWars, UserClans, ClanBattleLogs } from './database';
import { Utils } from '../../../lib';
import { Table } from '../../impulse-utils';
import {
    getClanContext, getClanById, assertClanMember, hasMinRole,
    log, to, toDurationString, displayElo, calculateElo, safeElo
} from './utils';
import {
    WAR_CHALLENGE_COOLDOWN_MS, DEFAULT_LOG_LIMIT, DEFAULT_PAGE_SIZE, MIN_BEST_OF, MAX_BEST_OF
} from './constants';

`;

write('war.ts', warTsHeaderFixed + warTsBody + warHelpContent);


// 4. utils.ts
const utilsFiles = [
    'utils.ts',
    'state.ts',
    'helpers/broadcast.ts',
    'helpers/context.ts',
    'helpers/elo.ts',
    'helpers/html.ts'
];

let utilsTsBody = '';
for (const file of utilsFiles) {
    let content = read(file);
    content = stripImports(content);
    content = stripEsc(content);
    utilsTsBody += content + '\n';
}

const utilsConstantsToImport = ['ROLE_HIERARCHY', 'CLAN_ROLE_TO_ROOM_RANK', 'DEFAULT_ELO', 'MIN_ELO_CHANGE', 'ELO_K_FACTOR'];
for (const c of utilsConstantsToImport) {
    utilsTsBody = utilsTsBody.replace(new RegExp(`const \${c}.*?;\\n`, 'g'), '');
}

const utilsTsHeader = `import type { ClanRole, Clan, ClanLog, ClanDoc, ClanWar } from './interface';
import { Clans, UserClans, ClanWars } from './database';
import { Utils } from '../../../lib';
import {
    ROLE_HIERARCHY, CLAN_ROLE_TO_ROOM_RANK, DEFAULT_ELO, MIN_ELO_CHANGE, ELO_K_FACTOR
} from './constants';

const esc = (v: string | number | undefined | null) => Utils.escapeHTML(String(v ?? ''));

`;
write('utils.ts', utilsTsHeader + utilsTsBody);

// 5. Replace imports in existing files
function updateImports(filePath, replacements) {
    let content = read(filePath);
    for (const [oldImport, newImport] of replacements) {
        content = content.replace(oldImport, newImport);
    }
    write(filePath, content);
}

const genericReplacements = [
    [/'\.\/helpers\/html'/g, "'./utils'"],
    [/'\.\/helpers\/elo'/g, "'./utils'"],
    [/'\.\/state'/g, "'./utils'"],
    [/'\.\/helpers\/context'/g, "'./utils'"],
    [/'\.\/helpers\/broadcast'/g, "'./utils'"],
    [/'\.\/commands'/g, "'./commands'"],
    [/'\.\/war'/g, "'./war'"],
];
updateImports('interface.ts', genericReplacements);
updateImports('constants.ts', genericReplacements);
updateImports('database.ts', genericReplacements);
updateImports('render.ts', genericReplacements);
updateImports('clan-battle.ts', genericReplacements);

// ensure displayElo is properly imported in clan-battle.ts
updateImports('clan-battle.ts', [
    [/import\s*{\s*displayElo\s*}\s*from\s*'\.\/helpers\/elo';/g, "import { displayElo } from './utils';"]
]);
