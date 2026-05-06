import { Utils } from '../../../lib';
import { Clans, UserClans } from './database';
import { getClanById } from './utils';
import { displayElo } from './utils';
import { toDurationString } from './utils';
import { getUIState, type ClanUIState } from './utils';

// ─── Primitive UI Helpers (Using PokeRogue CSS) ──────────────────────────────

export function renderBtn(cmd: string | null, label: string, className = 'pr-btn', style = '', disabled = false): string {
	let buf = `<button`;
	if (cmd) buf += ` name="send" value="${cmd}"`;
	if (className) buf += ` class="${className}"`;
	if (style) buf += ` style="${style}"`;
	if (disabled) buf += ` disabled`;
	buf += `>${label}</button>`;
	return buf;
}

export function renderHeader(title: string, showBack = true): string {
	let buf = `<div class="pr-header"><h2>${title}</h2>`;
	if (showBack) {
		buf += renderBtn('/clan view main', '← Back', 'pr-btn', 'font-size:11px;padding:5px 10px');
	}
	return buf + `</div>`;
}

export function refreshClanPage(user: User): void {
	for (const conn of user.connections) {
		if (conn.openPages?.has('clans')) {
			Chat.parse(`/join view-clans`, null, user, conn);
		}
	}
}

// ─── Main Dispatcher ─────────────────────────────────────────────────────────

export async function renderClanPage(user: User, room: Room): Promise<string> {
	const state = getUIState(user.id);
	
	switch (state.view) {
	case 'main':
		return await renderMainView(user);
	case 'profile':
		return await renderClanProfile(state.targetId || '', user, room);
	case 'list':
		return await renderClanList(state.page || 1);
	case 'members':
		return await renderMembers(state.targetId || '', user, room);
	default:
		return await renderMainView(user);
	}
}

// ─── Page Views ─────────────────────────────────────────────────────────────

export async function renderMainView(user: User): Promise<string> {
	const userClanInfo = await UserClans.findOne({ _id: user.id });
	
	let buf = `<div class="pr">`;
	buf += renderHeader('Clans Dashboard', false);
	buf += `<div style="padding: 14px">`;

	buf += `<div class="pr-actions">`;
	buf += renderBtn('/clan view list 1', 'Ladder', 'pr-btn primary');
	if (userClanInfo?.memberOf) {
		buf += renderBtn(`/clan view profile ${userClanInfo.memberOf}`, 'My Clan');
	}
	buf += `</div>`;
	
	buf += `<div class="pr-section-title">Welcome to Clans</div>`;
	buf += `<div style="background:rgba(0,0,0,0.15);padding:11px 13px;border-radius:8px;margin-bottom:8px;font-size:12px;line-height:1.55">`;
	if (!userClanInfo?.memberOf) {
		buf += `You are not currently in a clan. Check the Ladder to find one to join!`;
	} else {
		buf += `You are a member of Clan ID: <strong>${Utils.escapeHTML(userClanInfo.memberOf)}</strong>.`;
	}
	buf += `</div></div></div>`;
	return buf;
}

export async function renderClanProfile(clanId: string, user: User, room: Room): Promise<string> {
	if (!clanId) return `<div class="pr"><div style="padding: 14px">No clan specified.</div></div>`;

	const clan = await Clans.findOne({ _id: clanId as ID });
	if (!clan) return `<div class="pr"><div style="padding: 14px">This clan no longer exists.</div></div>`;

	const totalMembers = Object.keys(clan.members).length;
	const clanAge = toDurationString(Date.now() - clan.created);
	const ownerName = Users.getExact(clan.owner)?.name || clan.owner;

	let buf = `<div class="pr">`;
	buf += renderHeader(Utils.escapeHTML(clan.name), true);
	buf += `<div style="padding: 14px">`;

	buf += `<div style="display: flex; gap: 14px; margin-bottom: 14px;">`;
	if (clan.icon) {
		buf += `<div style="flex-shrink: 0"><img src="${Utils.escapeHTML(clan.icon)}" style="max-width: 150px; border-radius: 8px;" /></div>`;
	}
	buf += `<div style="flex: 1; font-size: 13px; line-height: 1.6;">`;
	buf += `<div><strong>Owner:</strong> ${Utils.escapeHTML(ownerName)}</div>`;
	buf += `<div><strong>Members:</strong> ${totalMembers}</div>`;
	buf += `<div><strong>Points:</strong> ${clan.points}</div>`;
	buf += `<div><strong>Tournament Wins:</strong> ${clan.stats.tourWins || 0}</div>`;
	buf += `<div><strong>Event Wins:</strong> ${clan.stats.eventWins || 0}</div>`;
	buf += `<div><strong>Clan Battle Wins:</strong> ${clan.stats.clanBattleWins || 0}</div>`;
	buf += `<div><strong>Clan Battle Losses:</strong> ${clan.stats.clanBattleLosses || 0}</div>`;
	buf += `<div><strong>ELO:</strong> ${displayElo(clan.stats.elo)}</div>`;
	buf += `<div><strong>Created:</strong> ${clanAge} ago</div>`;
	buf += `</div></div>`;

	if (clan.desc) {
		buf += `<div style="background:rgba(0,0,0,0.15);padding:11px 13px;border-radius:8px;margin-bottom:8px;font-size:12px;line-height:1.55">${Utils.escapeHTML(clan.desc)}</div>`;
	}

	buf += `<div class="pr-actions">`;
	buf += renderBtn(`/clan view members ${clan._id}`, 'Members', 'pr-btn primary');
	buf += `</div></div></div>`;
	return buf;
}

export async function renderClanList(page: number): Promise<string> {
	const limit = 20;
	const skip = (page - 1) * limit;

	const [clans, total] = await Promise.all([
		Clans.find({}, { skip, limit, sort: { 'stats.elo': -1 } }),
		Clans.countDocuments({}),
	]);
	const totalPages = Math.ceil(total / limit) || 1;

	let buf = `<div class="pr">`;
	buf += renderHeader(`Clan Ladder (Page ${page}/${totalPages})`, true);
	buf += `<div style="padding: 14px">`;

	if (clans.length === 0) return buf + `<div>No clans found.</div></div></div>`;

	buf += `<div class="pr-table-container"><table class="pr-table" style="width:100%; border-collapse:collapse;">`;
	buf += `<thead><tr><th>Rank</th><th>Clan</th><th>Tag</th><th>Members</th><th>ELO</th><th>Actions</th></tr></thead><tbody>`;

	clans.forEach((clan, i) => {
		const memberCount = Object.keys(clan.members).length;
		buf += `<tr style="border-bottom:1px solid rgba(150,150,150,0.1);">`;
		buf += `<td><strong>${skip + i + 1}</strong></td>`;
		buf += `<td class="pr-td-name">${Utils.escapeHTML(clan.name)}</td>`;
		buf += `<td>${Utils.escapeHTML(clan.tag)}</td>`;
		buf += `<td>${memberCount}</td>`;
		buf += `<td><strong>${displayElo(clan.stats.elo)}</strong></td>`;
		buf += `<td>${renderBtn(`/clan view profile ${clan._id}`, 'Profile', 'pr-shop-buy', 'padding: 4px 8px; font-size: 10px;')}</td>`;
		buf += `</tr>`;
	});

	buf += `</tbody></table></div>`;
	
	buf += `<div class="pr-actions" style="margin-top: 14px;">`;
	if (page > 1) buf += renderBtn(`/clan view list ${page - 1}`, 'Previous', 'pr-btn');
	if (page < totalPages) buf += renderBtn(`/clan view list ${page + 1}`, 'Next', 'pr-btn');
	buf += `</div></div></div>`;
	return buf;
}

export async function renderMembers(clanId: string, user: User, room: Room): Promise<string> {
	if (!clanId) return `<div class="pr"><div style="padding: 14px">No clan specified.</div></div>`;

	const clan = await Clans.findOne({ _id: clanId as ID });
	if (!clan) return `<div class="pr"><div style="padding: 14px">This clan no longer exists.</div></div>`;

	const ROLE_LEVELS: Record<string, number> = { owner: 100, leader: 50, officer: 25, member: 10 };
	const memberEntries = Object.entries(clan.members).sort((a, b) => {
		const levelA = ROLE_LEVELS[a[1].role] ?? 0;
		const levelB = ROLE_LEVELS[b[1].role] ?? 0;
		return levelB - levelA;
	});

	let buf = `<div class="pr">`;
	buf += renderHeader(`Members: ${Utils.escapeHTML(clan.name)}`, true);
	buf += `<div style="padding: 14px">`;

	buf += `<div class="pr-table-container"><table class="pr-table" style="width:100%; border-collapse:collapse;">`;
	buf += `<thead><tr><th>Username</th><th>Role</th><th>Join Date</th><th>Points</th></tr></thead><tbody>`;

	memberEntries.forEach(([userId, memberData]) => {
		buf += `<tr style="border-bottom:1px solid rgba(150,150,150,0.1);">`;
		buf += `<td class="pr-td-name">${Utils.escapeHTML(userId)}</td>`;
		buf += `<td>${Utils.escapeHTML(memberData.role)}</td>`;
		buf += `<td>${toDurationString(Date.now() - memberData.joinDate)} ago</td>`;
		buf += `<td>${memberData.totalPointsContributed}</td>`;
		buf += `</tr>`;
	});

	buf += `</tbody></table></div>`;
	buf += `</div></div>`;
	return buf;
}
