/*
 * Pokemon Showdown - Impulse Server
 * Clans War Commands Index
 * @author PrinceSky-Git
 */

import { playerWarCommands } from './player';
import { infoWarCommands } from './info';
import { adminWarCommands } from './admin';

// ─── Help Lists ───────────────────────────────────────────────────────────────

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

// ─── Help Builder ─────────────────────────────────────────────────────────────

function buildWarHelpHtml(
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

// ─── Final War Commands Export ────────────────────────────────────────────────

export const warCommands: Chat.ChatCommands = {
	// ── Player Commands ──────────────────────────────────────────────────────
	...playerWarCommands,

	// ── Info Commands ────────────────────────────────────────────────────────
	...infoWarCommands,

	// ── Admin Commands ───────────────────────────────────────────────────────
	...adminWarCommands,

	// ── Help ─────────────────────────────────────────────────────────────────
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
