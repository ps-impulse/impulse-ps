import { Clans, UserClans, ClanLogs, ClanPointsLogs, ClanBattleLogs } from '../database';
import { hasMinRole, log, to, toDurationString } from '../utils';
import { getClanContext, getClanById } from '../helpers/context';
import { generateClanProfile } from '../helpers/html';
import { refreshClanPage } from '../render';
import { displayElo } from '../helpers/elo';
import { Table } from '../../../impulse-utils';
import {
	MAX_CLAN_DESC_LENGTH,
	MAX_CLAN_TAG_LENGTH,
	MAX_CLAN_ICON_URL_LENGTH,
	MAX_LOG_LIMIT,
	MIN_LOG_LIMIT,
	DEFAULT_LOG_LIMIT,
	DEFAULT_PAGE_SIZE,
	CLAN_TAG_REGEX,
	ICON_URL_REGEX,
	ROOM_RANK_OWNER,
	ROOM_RANK_LEADER,
	ROOM_RANK_OFFICER,
	ROOM_RANK_MEMBER,
	ROOM_RANK_MOTW,
} from '../constants';
import { Utils } from '../../../../lib';

const esc = (v: string | number | undefined | null) => Utils.escapeHTML(String(v ?? ''));

export const clanInfoCommands: Chat.ChatCommands = {

	async profile(target, room, user) {
		this.runBroadcast();
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to view clan profiles.");

		let clanId: ID;
		if (target) {
			clanId = toID(target);
		} else {
			const userClanInfo = await UserClans.findOne({ _id: user.id });
			if (!userClanInfo?.memberOf) {
				return this.errorReply("You are not currently a member of any clan. Specify a clan ID to view its profile.");
			}
			clanId = userClanInfo.memberOf;
		}

		return this.parse(`/join view-clans-profile-${clanId}`);
	},

	async members(target, room, user) {
		this.runBroadcast();
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to view clan members.");

		let clanId: ID;
		if (target) {
			clanId = toID(target);
		} else {
			const userClanInfo = await UserClans.findOne({ _id: user.id });
			if (!userClanInfo?.memberOf) {
				return this.errorReply("You are not currently a member of any clan. Specify a clan ID to view its members.");
			}
			clanId = userClanInfo.memberOf;
		}

		return this.parse(`/join view-clans-members-${clanId}`);
	},

	async list(target, room, user) {
		this.runBroadcast();
		this.checkChat();

		return this.parse('/join view-clans-list-1');
	},

	async logs(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to view clan logs.");

		const parts = target.split(',').map(s => s.trim());
		let clanId: ID | undefined;
		let limit = DEFAULT_LOG_LIMIT;

		if (parts.length === 2) {
			clanId = toID(parts[0]);
			limit = parseInt(parts[1]) || DEFAULT_LOG_LIMIT;
		} else if (parts.length === 1 && parts[0]) {
			const parsed = parseInt(parts[0]);
			if (!isNaN(parsed)) {
				limit = parsed;
			} else {
				clanId = toID(parts[0]);
			}
		}

		if (limit < MIN_LOG_LIMIT || limit > MAX_LOG_LIMIT) {
			return this.errorReply(`Limit must be between ${MIN_LOG_LIMIT} and ${MAX_LOG_LIMIT}.`);
		}

		if (clanId) {
			this.checkCan('roomowner');
		} else {
			const actorClanInfo = await UserClans.findOne({ _id: user.id });
			clanId = actorClanInfo?.memberOf;
			if (!clanId) {
				return this.errorReply("You are not currently a member of any clan. Usage: /clan logs [clan id], [limit] (admin only)");
			}
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		const logs = await ClanLogs.find(
			{ clanId },
			{ limit, sort: { timestamp: -1 } }
		);

		if (logs.length === 0) {
			return user.popup(`|html|<div class="infobox"><center>No activity logs found for ${esc(clan.name)}.</center></div>`);
		}

		let html = `<div class="infobox" style="max-width:550px; max-height:400px; overflow-y:auto; font-size:0.9em;">`;
		html += `<center><strong>${esc(clan.name)} Activity Log</strong></center><hr>`;
		html += `<table style="width:100%; border-collapse:collapse;">`;
		html += `<tr style="font-weight:bold; border-bottom:1px solid #ccc;">`;
		html += `<td style="padding:2px 6px; white-space:nowrap; color:#888;">Time</td>`;
		html += `<td style="padding:2px 6px;">Event</td>`;
		html += `</tr>`;

		for (const entry of logs) {
			const date = to(new Date(entry.timestamp), { date: true, time: true });
			html += `<tr style="border-bottom:1px solid #eee;">`;
			html += `<td style="padding:2px 6px; white-space:nowrap; color:#888; font-size:0.85em;">${esc(date)}</td>`;
			html += `<td style="padding:2px 6px;">${esc(entry.message)}</td>`;
			html += `</tr>`;
		}

		html += `</table></div>`;
		user.popup(`|html|${html}`);
	},

	async pointslog(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to view clan points logs.");

		const limit = parseInt(target.trim()) || DEFAULT_LOG_LIMIT;
		if (limit < MIN_LOG_LIMIT || limit > MAX_LOG_LIMIT) {
			return this.errorReply(`Limit must be between ${MIN_LOG_LIMIT} and ${MAX_LOG_LIMIT}.`);
		}

		const ctx = await getClanContext(user.id, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		const logs = await ClanPointsLogs.find(
			{ clanId },
			{ limit, sort: { timestamp: -1 } }
		);

		if (!logs.length) {
			return user.popup(`|html|<div class="infobox"><center>No points log entries found for ${esc(clan.name)}.</center></div>`);
		}

		let html = `<div class="infobox" style="max-width:550px; max-height:400px; overflow-y:auto; font-size:0.9em;">`;
		html += `<center><strong>${esc(clan.name)} Points Log</strong></center><hr>`;
		html += `<table style="width:100%; border-collapse:collapse;">`;
		html += `<tr style="font-weight:bold; border-bottom:1px solid #ccc;">`;
		html += `<td style="padding:2px 6px; white-space:nowrap; color:#888;">Time</td>`;
		html += `<td style="padding:2px 6px;">User</td>`;
		html += `<td style="padding:2px 6px;">Amount</td>`;
		html += `<td style="padding:2px 6px;">Reason</td>`;
		html += `</tr>`;

		for (const entry of logs) {
			const date = to(new Date(entry.timestamp), { date: true, time: true });
			const amountColor = entry.amount > 0 ? 'green' : 'red';
			const amountStr = `${entry.amount > 0 ? '+' : ''}${entry.amount}`;
			html += `<tr style="border-bottom:1px solid #eee;">`;
			html += `<td style="padding:2px 6px; white-space:nowrap; color:#888; font-size:0.85em;">${esc(date)}</td>`;
			html += `<td style="padding:2px 6px;">${esc(entry.userid)}</td>`;
			html += `<td style="padding:2px 6px; color:${amountColor}; font-weight:bold;">${esc(amountStr)}</td>`;
			html += `<td style="padding:2px 6px;">${esc(entry.reason || '-')}</td>`;
			html += `</tr>`;
		}

		html += `</table></div>`;
		user.popup(`|html|${html}`);
	},

	async battlelogs(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in.");
		this.runBroadcast();

		let clanId: ID;
		if (target) {
			clanId = toID(target);
		} else {
			const userClanInfo = await UserClans.findOne({ _id: user.id });
			if (!userClanInfo?.memberOf) {
				return this.errorReply("You are not in a clan. Specify a clan ID to view its logs (e.g., /clan battlelogs [clanid]).");
			}
			clanId = userClanInfo.memberOf;
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		const entries = await ClanBattleLogs.find(
			{ $or: [{ winningClan: clanId }, { losingClan: clanId }] },
			{ limit: DEFAULT_LOG_LIMIT, sort: { timestamp: -1 } }
		);

		if (!entries.length) {
			return this.sendReplyBox(`No clan battle logs found for ${esc(clan.name)}.`);
		}

		const headerRow = ['Date', 'Outcome', 'ELO Change', 'Winner', 'Loser', 'Format'];
		const dataRows: string[][] = [];
		const title = `${esc(clan.name)} Battle Logs (Last ${entries.length})`;

		for (const entry of entries) {
			const isWin = entry.winningClan === clanId;
			const eloChange = entry.eloChangeWinner || 0;

			let eloChangeStr: string;
			if (entry.isWarWinningBattle) {
				eloChangeStr = isWin
					? `<strong style="color:green;">+${eloChange}</strong>`
					: `<strong style="color:red;">${entry.eloChangeLoser || -eloChange}</strong>`;
			} else {
				eloChangeStr = `<em>-</em>`;
			}

			dataRows.push([
				to(new Date(entry.timestamp), { date: true, time: true }),
				isWin
					? `<strong style="color:green;">Win</strong>`
					: `<strong style="color:red;">Loss</strong>`,
				eloChangeStr,
				`${esc(entry.winner)} (${esc(entry.winningClan)})`,
				`${esc(entry.loser)} (${esc(entry.losingClan)})`,
				esc(entry.format),
			]);
		}

		const output = Table(title, headerRow, dataRows);
		this.sendReply(`|html|${output}`);
	},

	async setdesc(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to set clan description.");

		const description = target.trim();
		const actorId = user.id;

		if (!description) return this.errorReply("You must specify a description.");
		if (description.length > MAX_CLAN_DESC_LENGTH) {
			return this.errorReply(`Clan description must be ${MAX_CLAN_DESC_LENGTH} characters or less.`);
		}

		const ctx = await getClanContext(actorId, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		if (!hasMinRole(clan, actorId, 'leader')) {
			return this.errorReply("You must be at least a Leader to edit the clan description.");
		}

		try {
			await Clans.updateOne({ _id: clanId }, { $set: { desc: description } });

			const clanRoom = Rooms.get(clan.chatRoom);
			if (clanRoom) {
				clanRoom.settings.desc = description;
				clanRoom.saveSettings();
				clanRoom.add(`|html|<div class="infobox"><center>${esc(user.name)} updated the clan description.</center></div>`).update();
			}

			await log(clanId, 'SET_DESC', `${actorId} updated the description`);

			this.sendReply(`You updated the clan description to: "${esc(description)}"`);
			refreshClanPage(user);
		} catch (e) {
			this.errorReply("An error occurred while updating the description. Please try again.");
			Monitor.crashlog(e as Error, "Clan setdesc command", { clanId, actorId });
		}
	},

	async settag(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to set clan tag.");

		const tag = target.trim().toUpperCase();
		const actorId = user.id;

		if (!tag) return this.errorReply("You must specify a tag.");
		if (tag.length > MAX_CLAN_TAG_LENGTH) {
			return this.errorReply(`Clan tag must be ${MAX_CLAN_TAG_LENGTH} characters or less.`);
		}
		if (!CLAN_TAG_REGEX.test(tag)) {
			return this.errorReply("Clan tag must contain only uppercase letters.");
		}

		const ctx = await getClanContext(actorId, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		if (!hasMinRole(clan, actorId, 'leader')) {
			return this.errorReply("You must be at least a Leader to edit the clan tag.");
		}

		const oldTag = clan.tag;

		try {
			await Clans.updateOne({ _id: clanId }, { $set: { tag } });

			const clanRoom = Rooms.get(clan.chatRoom);
			if (clanRoom) {
				clanRoom.add(`|html|<div class="infobox"><center>${esc(user.name)} updated the clan tag from "${esc(oldTag)}" to "${esc(tag)}".</center></div>`).update();
			}

			await log(clanId, 'SET_TAG', `${actorId} changed the tag from ${oldTag} to ${tag}`);

			this.sendReply(`You updated the clan tag from "${esc(oldTag)}" to "${esc(tag)}".`);
		} catch (e) {
			this.errorReply("An error occurred while updating the tag. Please try again.");
			Monitor.crashlog(e as Error, "Clan settag command", { clanId, actorId });
		}
	},

	async setmotw(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to set member of the week.");

		const targetId = toID(target);
		const actorId = user.id;

		if (!targetId) return this.errorReply("You must specify a user.");

		const ctx = await getClanContext(actorId, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		if (!hasMinRole(clan, actorId, 'leader')) {
			return this.errorReply("You must be at least a Leader to set member of the week.");
		}
		if (!clan.members[targetId]) {
			return this.errorReply(`'${esc(targetId)}' is not a member of ${esc(clan.name)}.`);
		}
		if (clan.memberOfTheWeek === targetId) {
			return this.errorReply(`'${esc(targetId)}' is already the Member of the Week for ${esc(clan.name)}.`);
		}

		const oldMotw = clan.memberOfTheWeek;

		try {
			await Clans.updateOne({ _id: clanId }, { $set: { memberOfTheWeek: targetId } });

			const clanRoom = Rooms.get(clan.chatRoom);
			if (clanRoom) {
				if (oldMotw && oldMotw !== targetId && clan.members[oldMotw]) {
					const oldMotwRole = clan.members[oldMotw].role;
					const restoredRank =
						oldMotw === clan.owner ? ROOM_RANK_OWNER :
						oldMotwRole === 'leader' ? ROOM_RANK_LEADER :
						oldMotwRole === 'officer' ? ROOM_RANK_OFFICER :
						ROOM_RANK_MEMBER;
					clanRoom.auth.set(oldMotw, restoredRank);
				}

				clanRoom.auth.set(targetId, ROOM_RANK_MOTW);
				clanRoom.saveSettings();
				clanRoom.add(`|html|<div class="infobox"><center>${esc(user.name)} set <b>${esc(targetId)}</b> as the Member of the Week!</center></div>`).update();
			}

			const targetUser = Users.getExact(targetId);
			if (targetUser?.connected) {
				targetUser.popup(`|html|<div class="infobox">Congratulations! You have been named <b>Member of the Week</b> in ${esc(clan.name)} by ${esc(user.name)}!</div>`);
			}

			await log(clanId, 'SET_MOTW', `${actorId} set ${targetId} as Member of the Week`);

			this.sendReply(`You set '${esc(targetId)}' as the Member of the Week for ${esc(clan.name)}.`);
		} catch (e) {
			this.errorReply("An error occurred while setting member of the week. Please try again.");
			Monitor.crashlog(e as Error, "Clan setmotw command", { clanId, actorId, targetId });
		}
	},

	async seticon(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to set clan icon.");

		const iconUrl = target.trim();
		const actorId = user.id;

		if (!iconUrl) return this.errorReply("You must specify an icon URL.");
		if (iconUrl.length > MAX_CLAN_ICON_URL_LENGTH) {
			return this.errorReply(`Icon URL must be ${MAX_CLAN_ICON_URL_LENGTH} characters or less.`);
		}
		if (!ICON_URL_REGEX.test(iconUrl)) {
			return this.errorReply("Invalid image URL. Must be a valid HTTP(S) URL ending in .png, .jpg, .jpeg, .gif, or .webp");
		}

		const ctx = await getClanContext(actorId, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		if (!hasMinRole(clan, actorId, 'leader')) {
			return this.errorReply("You must be at least a Leader to edit the clan icon.");
		}

		try {
			await Clans.updateOne({ _id: clanId }, { $set: { icon: iconUrl } });

			const clanRoom = Rooms.get(clan.chatRoom);
			if (clanRoom) {
				clanRoom.add(`|html|<div class="infobox"><center>${esc(user.name)} updated the clan icon.</center></div>`).update();
			}

			await log(clanId, 'SET_ICON', `${actorId} updated the icon`);

			this.sendReply(`You updated the clan icon.`);
		} catch (e) {
			this.errorReply("An error occurred while updating the icon. Please try again.");
			Monitor.crashlog(e as Error, "Clan seticon command", { clanId, actorId });
		}
	},
};
