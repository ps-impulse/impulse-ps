import { memberCommands, rankCommands, clanInfoCommands, adminCommands } from './commands';
import { playerWarCommands, infoWarCommands, adminWarCommands } from './war';
import { renderClanPage, refreshClanPage } from './render';
import { setUIState, type ClanView } from './utils';
import { Utils } from '../../../lib';

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
		html += `<center><strong>${section.title}</strong></center><hr>`;
		html += `<ul style="list-style-type:none;padding-left:0;">`;
		html += section.items.map(({ cmd, desc }, i) =>
			`<li><b>${cmd}</b> - ${desc}</li>${i < section.items.length - 1 ? '<hr>' : ''}`
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
				return this.errorReply(`Unknown view: ${view}`);
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


const PLAYER_WAR_HELP = [
	{ cmd: "/clan war status [clanid]", desc: "View your clan's active/pending war status. Defaults to your clan." },
	{ cmd: "/clan war challenge [clanid], [bestof]", desc: "Challenge another clan to a War." },
	{ cmd: "/clan war accept [clanid]", desc: "Accept a pending war challenge." },
	{ cmd: "/clan war deny [clanid]", desc: "Deny a pending war challenge." },
	{ cmd: "/clan war cancel [clanid]", desc: "Cancel a pending war challenge you have sent." },
	{ cmd: "/clan war forfeit [clanid]", desc: "Forfeit your active war against an opponent." },
	{ cmd: "/clan war tie [clanid]", desc: "Propose or confirm ending an active war as a tie." },
	{ cmd: "/clan war extend [clanid], [newbestof]", desc: "Propose or confirm extending an active war to more battles." },
	{ cmd: "/clan war pause [clanid]", desc: "Propose or confirm pausing an active war." },
	{ cmd: "/clan war resume [clanid]", desc: "Propose or confirm resuming a paused war." },
	{ cmd: "/clan war rematch [clanid], [bestof]", desc: "Challenge a clan to a rematch, bypassing the 24h cooldown." },
];

const INFO_WAR_HELP = [
	{ cmd: "/clan war ladder [page], [sortby]", desc: "View the War ladder. Sort by elo, wins, losses, winrate." },
	{ cmd: "/clan war stats [clanid]", desc: "View a clan's detailed war statistics." },
	{ cmd: "/clan war history [clanid]", desc: "View a clan's completed war history." },
	{ cmd: "/clan war record [clan1], [clan2]", desc: "View the head-to-head rivalry between two clans." },
	{ cmd: "/clan war mvp [clanid]", desc: "View the top trainers (MVPs) for a clan." },
];

const ADMIN_WAR_HELP = [
	{ cmd: "/clan war forceend [clanid]", desc: "Forcefully end an active war. Requires: &." },
	{ cmd: "/clan war forcetie [clanid]", desc: "Forcefully end an active war as a tie. Requires: &." },
	{ cmd: "/clan war forfeitadmin [loserclanid], [winnerclanid]", desc: "Force a clan to forfeit to another. Requires: &." },
	{ cmd: "/clan war resetcooldown [clanid]", desc: "Reset a clan's war challenge cooldown. Requires: &." },
	{ cmd: "/clan war setscore [clan1id], [score1], [clan2id], [score2]", desc: "Manually adjust battle score. Requires: &." },
	{ cmd: "/clan war setbestof [clan1id], [clan2id], [newbestof]", desc: "Change the 'Best of' format. Requires: &." },
	{ cmd: "/clan war forcepause [clanid]", desc: "Forcibly pause an active war. Requires: &." },
	{ cmd: "/clan war forceresume [clanid]", desc: "Forcibly resume a paused war. Requires: &." },
	{ cmd: "/clan war clearpending [clan1id], [clan2id]", desc: "Delete a pending war challenge. Requires: &." },
	{ cmd: "/clan war forcecreate [clan1id], [clan2id], [bestof]", desc: "Instantly create an active war. Requires: &." },
];

function buildWarHelpHtmlUnique(
	sections: { title: string; items: { cmd: string; desc: string }[] }[]
): string {
	let html = `<div style="max-height: 380px; overflow-y: auto;">`;

	for (const section of sections) {
		html += `<center><strong>${section.title}</strong></center><hr>`;
		html += `<ul style="list-style-type:none;padding-left:0;">`;
		html += section.items.map(({ cmd, desc }, i) =>
			`<li><b>${cmd}</b> - ${desc}</li>${i < section.items.length - 1 ? '<hr>' : ''}`
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
		const html = buildWarHelpHtmlUnique([
			{ title: 'Player War Commands', items: PLAYER_WAR_HELP },
			{ title: 'Info & Stats Commands', items: INFO_WAR_HELP },
			{ title: 'Admin War Commands', items: ADMIN_WAR_HELP },
		]);
		this.sendReplyBox(html);
	},
};
