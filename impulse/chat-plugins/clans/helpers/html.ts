/*
 * Pokemon Showdown - Impulse Server
 * Clans HTML Builder Helper
 * @author PrinceSky-Git
 */

import { Utils } from '../../../../lib';
import { displayElo } from './elo';
import { toDurationString, to } from '../utils';
import type { ClanWar } from '../interface';
import type { ClanDoc } from '../database';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WarCardPerspective = 'challenger' | 'target' | 'public' | 'ended';

export interface WarCardOptions {
	endMessage?: string;
	lastBattle?: {
		winnerName: string;
		loserName: string;
		winningClanName: string;
	};
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Escapes a value for safe HTML output.
 * Falls back to an empty string for null/undefined.
 */
function esc(value: string | number | undefined | null): string {
	if (value === null || value === undefined) return '';
	return Utils.escapeHTML(String(value));
}

// ─── War Card Sections ───────────────────────────────────────────────────────

/**
 * Builds the war card header showing both clan names and ELO ratings.
 */
function buildWarCardHeader(
	clan1: ClanDoc,
	clan2: ClanDoc,
	war: ClanWar
): string {
	const clan1Elo = displayElo(clan1.stats.elo);
	const clan2Elo = displayElo(clan2.stats.elo);
	const winsNeeded = Math.ceil(war.bestOf / 2);

	let html = `<center><strong style="font-size: 1.3em;">POKÉMON CLAN WAR</strong>`;
	html += `<hr style="margin: 5px 0;">`;
	html += `<div style="margin: 10px 0; font-size: 1.1em;">`;
	html += `<strong>${esc(clan1.name)}</strong> `;
	html += `<span style="color: #555;">( ${clan1Elo} ELO )</span>`;
	html += ` <strong style="color: #AAA; margin: 0 10px;">VS</strong> `;
	html += `<strong>${esc(clan2.name)}</strong> `;
	html += `<span style="color: #555;">( ${clan2Elo} ELO )</span>`;
	html += `</div>`;
	html += `<div style="margin-top: 10px;">`;
	html += `<strong>Format:</strong> Best of ${war.bestOf} (First to ${winsNeeded} wins)`;
	html += `</div>`;
	return html;
}

/**
 * Builds the score display for an active war.
 */
function buildScoreDisplay(
	war: ClanWar,
	clan1: ClanDoc,
	clan2: ClanDoc,
	options: WarCardOptions
): string {
	let html = `<strong style="font-size: 1.0em;">Score:</strong> `;
	html += `<span style="font-size: 1.2em; font-weight: bold;">`;
	html += `${war.scores[clan1._id] || 0} - ${war.scores[clan2._id] || 0}`;
	html += `</span>`;

	if (options.lastBattle) {
		const { winnerName, loserName, winningClanName } = options.lastBattle;
		html += `<div style="font-size: 0.9em; color: #555; margin-top: 5px; border-top: 1px solid #EEE; padding-top: 5px;">`;
		html += `Last Battle: <strong>${esc(winnerName)}</strong> defeated `;
		html += `<strong>${esc(loserName)}</strong> `;
		html += `(<strong>${esc(winningClanName)}</strong> +1)`;
		html += `</div>`;
	}

	return html;
}

/**
 * Builds the status badge for a war card (PENDING, ACTIVE, PAUSED, COMPLETED).
 */
function buildStatusBadge(war: ClanWar): string {
	if (war.status === 'pending') {
		return `<strong>Status:</strong> <span style="color: #E8A337; font-weight: bold;">PENDING</span>`;
	}
	if (war.status === 'completed') {
		return `<strong>Status:</strong> <span style="color: #999; font-weight: bold;">COMPLETED</span><br />`;
	}
	if (war.status === 'active') {
		if (war.paused) {
			return `<strong>Status:</strong> <span style="color: #E8A337; font-weight: bold;">PAUSED</span><br />`;
		}
		return `<strong>Status:</strong> <span style="color: #4CAF50; font-weight: bold;">ACTIVE</span><br />`;
	}
	return '';
}

/**
 * Builds the action buttons for the challenger's perspective.
 */
function buildChallengerActions(
	war: ClanWar,
	clan1: ClanDoc,
	clan2: ClanDoc
): string {
	let html = '';

	if (war.status === 'pending') {
		html += `<em>Waiting for ${esc(clan2.name)} to respond...</em><br />`;
		html += `<button class="button" name="send" value="/clan war cancel ${clan2._id}">`;
		html += `Withdraw Challenge</button>`;
		return html;
	}

	if (war.status === 'active') {
		const myId = clan1._id;
		const opponentId = clan2._id;
		const opponentName = esc(clan2.name);
		return buildActiveActions(war, myId, opponentId, opponentName);
	}

	if (war.status === 'completed') {
		html += `<strong style="font-size: 1.0em;">${esc(war.scores[clan1._id] || 0)} - ${esc(war.scores[clan2._id] || 0)}</strong>`;
	}

	return html;
}

/**
 * Builds the action buttons for the target clan's perspective.
 */
function buildTargetActions(
	war: ClanWar,
	clan1: ClanDoc,
	clan2: ClanDoc
): string {
	let html = '';

	if (war.status === 'pending') {
		html += `<strong>${esc(clan1.name)} has challenged you!</strong><br />`;
		html += `<button class="button" name="send" value="/clan war accept ${clan1._id}" `;
		html += `style="background-color: #4CAF50; color: white;">Accept</button> `;
		html += `<button class="button" name="send" value="/clan war deny ${clan1._id}" `;
		html += `style="background-color: #f44336; color: white;">Deny</button>`;
		return html;
	}

	if (war.status === 'active') {
		const myId = clan2._id;
		const opponentId = clan1._id;
		const opponentName = esc(clan1.name);
		return buildActiveActions(war, myId, opponentId, opponentName);
	}

	return html;
}

/**
 * Builds the action buttons for the public lobby perspective.
 */
function buildPublicActions(war: ClanWar, clan2: ClanDoc, options: WarCardOptions): string {
	if (war.status === 'pending') {
		return `<em>Waiting for ${esc(clan2.name)} to respond...</em>`;
	}
	if (war.status === 'active') {
		if (war.paused) return `<strong>The war is currently paused.</strong>`;
		return `<strong>The war is on!</strong>`;
	}
	if (war.status === 'completed') {
		return `<strong style="font-size: 1.0em;">${esc(options.endMessage || 'This war has concluded.')}</strong>`;
	}
	return '';
}

/**
 * Builds the interactive action buttons for an active (non-paused or paused) war
 * from the perspective of one of the two participants.
 */
function buildActiveActions(
	war: ClanWar,
	myId: ID,
	opponentId: ID,
	opponentName: string
): string {
	let html = '';

	const iProposedPause = war.pauseConfirmations?.includes(myId);
	const theyProposedPause = war.pauseConfirmations?.includes(opponentId);
	const iProposedResume = war.resumeConfirmations?.includes(myId);
	const theyProposedResume = war.resumeConfirmations?.includes(opponentId);
	const iProposedTie = war.tieConfirmations?.includes(myId);
	const theyProposedTie = war.tieConfirmations?.includes(opponentId);

	if (war.paused) {
		if (theyProposedResume && !iProposedResume) {
			html += `<strong>${opponentName} has proposed to resume!</strong><br />`;
			html += `<button class="button" name="send" value="/clan war resume ${opponentId}" `;
			html += `style="background-color: #4CAF50; color: white;">Accept Resume</button>`;
		} else if (iProposedResume && !theyProposedResume) {
			html += `<em>Resume proposed. Waiting for ${opponentName} to accept...</em><br />`;
		} else {
			html += `<strong>The war is paused.</strong><br />`;
			html += `<button class="button" name="send" value="/clan war resume ${opponentId}" `;
			html += `style="background-color: #4CAF50; color: white;">Resume War</button>`;
		}
		return html;
	}

	if (theyProposedPause && !iProposedPause) {
		html += `<strong>${opponentName} has proposed a pause!</strong><br />`;
		html += `<button class="button" name="send" value="/clan war pause ${opponentId}">Accept Pause</button>`;
	} else if (iProposedPause && !theyProposedPause) {
		html += `<em>Pause proposed. Waiting for ${opponentName} to accept...</em><br />`;
	} else if (theyProposedTie && !iProposedTie) {
		html += `<strong>${opponentName} has proposed a tie!</strong><br />`;
		html += `<button class="button" name="send" value="/clan war tie ${opponentId}" `;
		html += `style="background-color: #E8A337; color: white;">Accept Tie</button>`;
	} else if (iProposedTie && !theyProposedTie) {
		html += `<em>Tie proposed. Waiting for ${opponentName} to accept...</em><br />`;
	} else {
		html += `<strong>The war is on!</strong><br />`;
		html += `<button class="button" name="send" value="/clan war pause ${opponentId}">Pause War</button> `;
		html += `<button class="button" name="send" value="/clan war tie ${opponentId}">Propose Tie</button>`;
	}

	return html;
}

// ─── Main War Card Builder ────────────────────────────────────────────────────

/**
 * Generates a full war card HTML string for the given perspective.
 *
 * @param war         - The war document
 * @param clan1       - The challenger clan (clans[0])
 * @param clan2       - The target clan (clans[1])
 * @param perspective - Which clan's perspective to render for
 * @param options     - Optional endMessage or lastBattle data
 * @returns A complete HTML string for use in uhtml/uhtmlchange
 */
export function generateWarCard(
	war: ClanWar,
	clan1: ClanDoc,
	clan2: ClanDoc,
	perspective: WarCardPerspective,
	options: WarCardOptions = {}
): string {
	let html = `<div class="infobox" style="border: 2px solid #6688AA; box-shadow: 2px 2px 5px rgba(0,0,0,0.1); padding: 10px;">`;
	html += buildWarCardHeader(clan1, clan2, war);

	if (perspective === 'ended') {
		html += `<strong>Status:</strong> <span style="color: #999; font-weight: bold;">ENDED</span>`;
		html += `<div style="margin-top: 15px; border-top: 1px dashed #CCC; padding-top: 10px;">`;
		html += `<strong style="font-size: 1.0em;">${esc(options.endMessage || 'This challenge is no longer valid.')}</strong>`;
		html += `</div>`;
		html += `</center></div>`;
		return html;
	}

	html += buildStatusBadge(war);

	if (war.status === 'active') {
		html += buildScoreDisplay(war, clan1, clan2, options);
	}

	if (war.status === 'completed') {
		const score1 = war.scores[clan1._id] || 0;
		const score2 = war.scores[clan2._id] || 0;
		html += `<strong style="font-size: 1.0em;">Final Score:</strong> `;
		html += `<span style="font-size: 1.0em; font-weight: bold;">${score1} - ${score2}</span>`;
	}

	html += `<div style="margin-top: 15px; border-top: 1px dashed #CCC; padding-top: 10px;">`;

	switch (perspective) {
	case 'challenger':
		html += buildChallengerActions(war, clan1, clan2);
		break;
	case 'target':
		html += buildTargetActions(war, clan1, clan2);
		break;
	case 'public':
		html += buildPublicActions(war, clan2, options);
		break;
	}

	html += `</div></center></div>`;
	return html;
}

// ─── Clan Profile Card ───────────────────────────────────────────────────────

/**
 * Builds the full HTML for a clan's profile card.
 *
 * @param clan - The clan document to render
 * @returns A complete HTML string for the profile infobox
 */
export function generateClanProfile(clan: ClanDoc): string {
	const totalMembers = Object.keys(clan.members).length;
	const clanAge = toDurationString(Date.now() - clan.created);
	const ownerUser = Users.getExact(clan.owner);
	const ownerName = ownerUser?.name || clan.owner;
	const motwUser = clan.memberOfTheWeek ? Users.getExact(clan.memberOfTheWeek) : null;
	const motwName = motwUser?.name || clan.memberOfTheWeek || 'None';

	const w = 160;
	const h = 222;

	let html = `<div class="infobox" style="display: flex; align-items: stretch; padding: 15px; min-height: ${h + 30}px;">`;

	// Icon column
	html += `<div style="flex: 0 0 ${w + 20}px; padding-right: 20px; border-right: 1px solid #ccc; overflow-y: hidden; text-align: center;">`;
	if (clan.icon) {
		html += `<img src="${esc(clan.icon)}" width="${w}" alt="${esc(clan.name)} Icon" style="border-radius: 8px; display: block; margin: 0 auto;" />`;
	} else {
		html += `<div style="color: #888; text-align: center; padding-top: 50px; font-size: 0.9em; white-space: pre-wrap; width: ${w}px;">`;
		html += `No clan icon set.`;
		html += `</div>`;
	}
	html += `</div>`;

	// Info column
	html += `<div style="flex: 1; line-height: 1.7; margin-left: 20px; max-height: ${h + 30}px; overflow-y: auto;">`;
	html += `<strong style="font-size: 22px;">${esc(clan.name)}</strong><br />`;
	html += `<div style="margin-top: 12px; font-size: 0.95em;">`;
	html += `<strong>Owner:</strong> ${esc(ownerName)}<br />`;
	html += `<strong>Members:</strong> ${totalMembers}<br />`;
	html += `<strong>Points:</strong> ${clan.points}<br />`;
	html += `<strong>Clan ELO:</strong> ${displayElo(clan.stats.elo)}<br />`;
	html += `<strong>War Battles:</strong> ${clan.stats.clanBattleWins || 0} W / ${clan.stats.clanBattleLosses || 0} L<br />`;
	html += `<strong>Tour Wins:</strong> ${clan.stats.tourWins}<br />`;
	html += `<strong>Member of the Week:</strong> ${esc(motwName)}<br />`;
	html += `<strong>Created:</strong> ${clanAge} ago<br />`;
	html += `</div></div></div>`;

	return html;
}

// ─── Clan Announcement Popup ─────────────────────────────────────────────────

/**
 * Builds a popup HTML string for a clan announcement.
 *
 * @param message   - The announcement message
 * @param senderName - The name of the sender
 * @param clanName  - The name of the clan
 * @returns A complete HTML string for the popup
 */
export function generateAnnouncementPopup(
	message: string,
	senderName: string,
	clanName: string
): string {
	return (
		`<div class="infobox">` +
		`<b>Clan Announcement</b><br /><hr />` +
		`${esc(message)}<br /><hr />` +
		`<small>Sent by ${esc(senderName)} (${esc(clanName)})</small>` +
		`</div>`
	);
}

// ─── Invite Popup ────────────────────────────────────────────────────────────

/**
 * Builds a popup HTML string for a clan invite notification.
 *
 * @param clanName    - The name of the inviting clan
 * @param clanId      - The ID of the inviting clan
 * @param inviterName - The name of the user who sent the invite
 * @returns A complete HTML string for the popup
 */
export function generateInvitePopup(
	clanName: string,
	clanId: ID,
	inviterName: string
): string {
	const button = `<button class="button" name="send" value="/clan join ${clanId}">Join ${esc(clanName)}</button>`;
	return (
		`<div class="infobox">` +
		`<div class="infobox-message">` +
		`You have been invited to join the clan <b>${esc(clanName)}</b> by ${esc(inviterName)}.` +
		`</div><br /><center>${button}</center>` +
		`</div>`
	);
}

// ─── War Stats Block ─────────────────────────────────────────────────────────

/**
 * Builds the full HTML for a clan's war statistics display.
 *
 * @param clan              - The clan document
 * @param completedWars     - All completed wars for this clan
 * @param activePendingWars - All active or pending wars for this clan
 * @param battleLogs        - All battle log entries for this clan
 * @returns A complete HTML string for the stats infobox
 */
export function generateWarStats(
	clan: ClanDoc,
	completedWars: ClanWar[],
	activePendingWars: ClanWar[],
	battleLogs: { winningClan: ID; timestamp: number }[]
): string {
	const clanId = clan._id;
	const wins = clan.stats.clanBattleWins || 0;
	const losses = clan.stats.clanBattleLosses || 0;
	const totalBattles = wins + losses;
	const winrate = totalBattles > 0 ? ((wins / totalBattles) * 100).toFixed(1) : '0.0';
	const elo = displayElo(clan.stats.elo);

	let warsWon = 0;
	let warsLost = 0;
	let warsTied = 0;
	let totalWarBattles = 0;

	for (const war of completedWars) {
		const myScore = war.scores[clanId] || 0;
		const opponentId = war.clans[0] === clanId ? war.clans[1] : war.clans[0];
		const opponentScore = war.scores[opponentId] || 0;
		totalWarBattles += myScore + opponentScore;

		if (myScore > opponentScore) warsWon++;
		else if (myScore < opponentScore) warsLost++;
		else warsTied++;
	}

	const totalWars = warsWon + warsLost + warsTied;
	const warWinrate = totalWars > 0 ? ((warsWon / totalWars) * 100).toFixed(1) : '0.0';

	let longestWinStreak = 0;
	let currentStreak = 0;
	const sortedLogs = [...battleLogs].sort((a, b) => b.timestamp - a.timestamp);

	for (const log of sortedLogs) {
		if (log.winningClan === clanId) {
			currentStreak++;
			if (currentStreak > longestWinStreak) longestWinStreak = currentStreak;
		} else {
			currentStreak = 0;
		}
	}

	let html = `<div class="infobox" style="max-width:650px;">`;
	html += `<center><strong style="font-size: 1.3em;">Clan War Statistics</strong></center><hr>`;
	html += `<strong>Individual Battle Performance:</strong><br>`;
	html += `Clan ELO Rating: <strong style="font-size: 1.15em; color: gold;">${elo}</strong><br>`;
	html += `Total 1v1 Battles Fought: <strong>${totalBattles}</strong> (${wins}W - ${losses}L)<br>`;
	html += `Battle Win Rate: <strong style="color: green;">${winrate}%</strong><br>`;
	html += `Best Win Streak: <strong>${longestWinStreak}</strong> consecutive victories<br><hr>`;
	html += `<strong>War Record:</strong><br>`;
	html += `Total Wars: <strong>${totalWars}</strong> (${warsWon}W - ${warsLost}L - ${warsTied}D)<br>`;
	html += `War Win Rate: <strong style="color: green;">${warWinrate}%</strong><br>`;
	html += `Active/Pending Wars: <strong>${activePendingWars.length}</strong><br>`;
	html += `Total Battles Across All Wars: <strong>${totalWarBattles}</strong><br>`;
	html += `</div>`;

	return html;
}

// ─── Head-to-Head Record Block ───────────────────────────────────────────────

/**
 * Builds the full HTML for a head-to-head rivalry record between two clans.
 *
 * @param clan1  - First clan document
 * @param clan2  - Second clan document
 * @param wars   - All completed wars between the two clans
 * @returns A complete HTML string for the record infobox
 */
export function generateHeadToHeadRecord(
	clan1: ClanDoc,
	clan2: ClanDoc,
	wars: ClanWar[]
): string {
	const clan1Id = clan1._id;
	const clan2Id = clan2._id;

	let clan1Wins = 0;
	let clan2Wins = 0;
	let ties = 0;
	let clan1BattleWins = 0;
	let clan2BattleWins = 0;

	for (const war of wars) {
		const score1 = war.scores[clan1Id] || 0;
		const score2 = war.scores[clan2Id] || 0;
		clan1BattleWins += score1;
		clan2BattleWins += score2;

		if (score1 > score2) clan1Wins++;
		else if (score2 > score1) clan2Wins++;
		else ties++;
	}

	let html = `<div class="infobox" style="max-width:550px;">`;
	html += `<center><strong style="font-size: 1.2em;">Head-to-Head Rivalry</strong></center><hr>`;
	html += `<center><strong style="font-size: 1.15em;">${esc(clan1.name)} vs ${esc(clan2.name)}</strong></center><br>`;
	html += `<strong>Wars Won:</strong> ${esc(clan1.name)} ${clan1Wins}W - ${clan2Wins}W ${esc(clan2.name)}<br>`;
	html += `<strong>Battles Won:</strong> ${esc(clan1.name)} ${clan1BattleWins} - ${clan2BattleWins} ${esc(clan2.name)}<br>`;
	html += `<strong>Tied Wars:</strong> ${ties}<br>`;
	html += `<strong>Total Wars Played:</strong> ${wars.length}<br>`;
	html += `</div>`;

	return html;
}
