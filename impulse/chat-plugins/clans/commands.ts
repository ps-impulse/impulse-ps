import { Clans, UserClans, ClanLogs, ClanPointsLogs, ClanBattleLogs, ClanWars, ClanBans } from './database';
import { log, hasMinRole, to, toDurationString, getClanContext, getClanById, assertClanMember, assertNotOwner, generateClanProfile, generateInvitePopup, generateAnnouncementPopup, displayElo } from './utils';
import { refreshClanPage } from './render';
import { MAX_CLAN_DESC_LENGTH, MAX_CLAN_TAG_LENGTH, MAX_CLAN_ICON_URL_LENGTH, MAX_LOG_LIMIT, MIN_LOG_LIMIT, DEFAULT_LOG_LIMIT, DEFAULT_PAGE_SIZE, CLAN_TAG_REGEX, ICON_URL_REGEX, ROOM_RANK_OWNER, ROOM_RANK_LEADER, ROOM_RANK_OFFICER, ROOM_RANK_MEMBER, ROOM_RANK_MOTW, CLAN_ROLE_TO_ROOM_RANK, DEFAULT_STATS } from './constants';
import { FS, Utils } from '../../../lib';
import { Table } from '../../impulse-utils';
import type { ClanRole } from './interface';

const esc = (v: string | number | undefined | null) => Utils.escapeHTML(String(v ?? ''));

const ASSIGNABLE_ROLES: ClanRole[] = ['leader', 'officer', 'member'];
const ROLE_LEVELS: Record<ClanRole, number> = { owner: 100, leader: 50, officer: 25, member: 10 };

export const adminCommands: Chat.ChatCommands = {

	async create(target, room, user) {
		this.checkCan('roomowner');

		const [name, ownerUsername] = target.split(',').map(s => s.trim());
		const clanName = name || '';
		const ownerId = toID(ownerUsername);

		if (!ownerId) {
			return this.errorReply("Usage: /clan create [Clan Name], [Owner ID]");
		}

		const clanId = toID(clanName);

		if (!clanId) return this.errorReply("You must specify a clan name.");
		if (clanId.length < 3 || clanId.length > 20) {
			return this.errorReply("Clan ID must be between 3 and 20 characters long.");
		}
		if (clanName.length > 30) {
			return this.errorReply("Clan name must be 30 characters or less.");
		}

		const ownerUser = Users.getExact(ownerId);
		if (!ownerUser) {
			return this.errorReply(`Owner '${ownerId}' not found. The user must be logged in.`);
		}

		const [existingClan, ownerClanInfo] = await Promise.all([
			Clans.findOne({ _id: clanId }),
			UserClans.findOne({ _id: ownerId }),
		]);

		if (existingClan) {
			return this.errorReply(`A clan with the ID '${clanId}' already exists.`);
		}
		if (ownerClanInfo?.memberOf) {
			return this.errorReply(`User '${ownerId}' is already a member of a clan.`);
		}

		const now = Date.now();
		const chatRoomId = toID(`${clanId}`) as RoomID;

		const newClan = {
			_id: clanId,
			name: clanName,
			tag: clanId.slice(0, 5).toUpperCase(),
			owner: ownerId,
			members: {
				[ownerId]: {
					role: 'owner' as ClanRole,
					joinDate: now,
					totalPointsContributed: 0,
				},
			},
			created: now,
			desc: `Welcome to ${clanName}!`,
			memberOfTheWeek: '' as ID,
			inviteOnly: false,
			invites: [],
			points: 0,
			chatRoom: chatRoomId,
			icon: '',
			lastActive: now,
			stats: DEFAULT_STATS,
		};

		try {
			await Clans.insertOne(newClan);
			await UserClans.upsert({ _id: ownerId }, { $set: { memberOf: clanId } });

			const chatRoomTitle = `${clanName}`;
			let newRoom = Rooms.get(chatRoomId);

			if (!newRoom) {
				const roomSettings: RoomSettings = {
					title: chatRoomTitle,
					auth: {},
					creationTime: Date.now(),
					modjoin: '+',
					desc: newClan.desc,
				};

				newRoom = Rooms.createChatRoom(chatRoomId, chatRoomTitle, roomSettings);
				newRoom.auth.set(ownerId, '#');
				Rooms.global.settingsList.push(roomSettings);
				Rooms.global.chatRooms.push(newRoom);
				Rooms.global.writeChatRoomData();
			} else {
				newRoom.auth.set(ownerId, '#');
				newRoom.saveSettings();
			}

			if (ownerUser.connected) {
				ownerUser.joinRoom(newRoom.roomid);
				ownerUser.popup(
					`|html|<div class="infobox"><div class="infobox-message">` +
					`${user.name} has created the clan <b>${clanName}</b> for you! ` +
					`You are the clan owner (#).</div><br />` +
					`<center><button class="button" name="join" value="${newRoom.roomid}">` +
					`Go to Clan Room: #${newRoom.roomid}</button></center></div>`
				);
			}

			await log(clanId, 'CREATE', `${user.id} created the clan for ${ownerId}`);

			this.sendReply(`Clan "${clanName}" has been successfully created! Owner: ${ownerId}.`);
			this.room.add(`|html|<div class="infobox"><center>Clan "${clanName}" has been successfully created! Owner: ${ownerId}.</center></div>`);
		} catch (e) {
			this.errorReply("An error occurred while creating the clan.");
			await Clans.deleteOne({ _id: clanId });
			await UserClans.updateOne({ _id: ownerId }, { $unset: { memberOf: 1 } });
			Monitor.crashlog(e as Error, "Clan create command", { clanId, ownerId });
		}
	},

	async delete(target, room, user) {
		this.checkCan('roomowner');

		const clanId = toID(target);
		if (!clanId) return this.errorReply("You must specify a clan ID.");

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		const ownerId = clan.owner;
		const ownerUser = Users.getExact(ownerId);
		const chatRoom = Rooms.get(toID(clan.chatRoom) as RoomID);

		try {
			if (chatRoom) {
				chatRoom.add(`|html|<div class="broadcast-red"><b>This clan chatroom is being permanently deleted by ${user.name}.</b></div>`).update();
				await new Promise<void>(resolve => setTimeout(resolve, 1000));

				for (const userid in chatRoom.users) {
					chatRoom.users[userid].leaveRoom(chatRoom);
				}

				Rooms.global.deregisterChatRoom(chatRoom.roomid);
				Rooms.global.delistChatRoom(chatRoom.roomid);
				chatRoom.destroy();
				FS('config/chatrooms.json').writeUpdate(() =>
					JSON.stringify(Rooms.global.settingsList)
						.replace(/\{"title":/g, '\n{"title":')
						.replace(/\]$/, '\n]')
				);
			}

			await Clans.deleteOne({ _id: clanId });
			await UserClans.updateMany({ memberOf: clanId }, { $unset: { memberOf: 1 } });
			await UserClans.updateMany({ invites: clanId }, { $pull: { invites: clanId } });
			await ClanLogs.deleteMany({ clanId });
			await ClanPointsLogs.deleteMany({ clanId });
			await ClanBattleLogs.deleteMany({
				$or: [{ winningClan: clanId }, { losingClan: clanId }],
			});
			await ClanWars.deleteMany({ clans: clanId });

			if (ownerUser?.connected) {
				ownerUser.popup(
					`|html|<div class="broadcast-red">` +
					`<b>Your clan "${clan.name}" has been permanently deleted by ${user.name}.</b><br />` +
					`All clan data, members, logs, and the chatroom ${clan.chatRoom} have been removed.` +
					`</div>`
				);
			}

			const memberIds = Object.keys(clan.members);
			for (const memberId of memberIds) {
				if (memberId === ownerId) continue;
				const member = Users.getExact(memberId);
				if (member?.connected) {
					member.popup(
						`|html|<div class="broadcast-red">` +
						`<b>The clan "${clan.name}" has been permanently deleted by ${user.name}.</b>` +
						`</div>`
					);
				}
			}

			// Log after deleting so the tombstone entry is the only thing in the log file
			await log(clanId, 'DELETE', `${user.id} deleted the clan`);

			this.sendReply(`Clan "${clan.name}" (${clanId}) has been successfully deleted.`);
			refreshClanPage(user);
			Monitor.log(`[Clans] ${user.name} deleted clan: ${clan.name} (${clanId}) with ${memberIds.length} members`);
		} catch (e) {
			this.errorReply("An error occurred while deleting the clan. The deletion may have been partially completed.");
			this.privateModAction(`(CRITICAL: Clan deletion failed for ${clanId}. Manual verification required.)`);
			Monitor.crashlog(e as Error, "Clan delete command", { clanId, clanName: clan.name });
		}
	},

	async addpoints(target, room, user) {
		this.checkCan('roomowner');
		const [clanIdRaw, amountStr, ...reasonArr] = target.split(',').map(s => s.trim());
		const clanId = toID(clanIdRaw);
		const amount = parseInt(amountStr);
		const reason = reasonArr.join(',') || 'Admin adjustment';

		if (!clanId || isNaN(amount) || amount <= 0) {
			return this.errorReply("Usage: /clan addpoints [clan id], [amount], [reason]");
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		try {
			await Clans.updateOne({ _id: clanId }, { $inc: { points: amount } });
			await log(clanId, 'ADMIN_POINTS', `${user.id} added ${amount} points: ${reason}`);
			this.sendReply(`Added ${amount} points to clan '${clan.name}'. Reason: ${reason}`);
		} catch (e) {
			this.errorReply("An error occurred while adding points.");
			Monitor.crashlog(e as Error, "Clan addpoints command", { clanId });
		}
	},

	async removepoints(target, room, user) {
		this.checkCan('roomowner');
		const [clanIdRaw, amountStr, ...reasonArr] = target.split(',').map(s => s.trim());
		const clanId = toID(clanIdRaw);
		const amount = parseInt(amountStr);
		const reason = reasonArr.join(',') || 'Admin adjustment';

		if (!clanId || isNaN(amount) || amount <= 0) {
			return this.errorReply("Usage: /clan removepoints [clan id], [amount], [reason]");
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		try {
			await Clans.updateOne({ _id: clanId }, { $inc: { points: -amount } });
			await log(clanId, 'ADMIN_POINTS', `${user.id} removed ${amount} points: ${reason}`);
			this.sendReply(`Removed ${amount} points from clan '${clan.name}'. Reason: ${reason}`);
			refreshClanPage(user);
		} catch (e) {
			this.errorReply("An error occurred while removing points.");
			Monitor.crashlog(e as Error, "Clan removepoints command", { clanId });
		}
	},

	async addtourwins(target, room, user) {
		this.checkCan('roomowner');
		const [clanIdRaw, amountStr] = target.split(',').map(s => s.trim());
		const clanId = toID(clanIdRaw);
		const amount = parseInt(amountStr) || 1;

		if (!clanId) return this.errorReply("Usage: /clan addtourwins [clan id], [amount]");
		if (amount <= 0) return this.errorReply("Amount must be a positive number.");

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		try {
			await Clans.updateOne({ _id: clanId }, { $inc: { 'stats.tourWins': amount } });
			await log(clanId, 'ADMIN_TOURWIN', `${user.id} added ${amount} tour win(s)`);
			this.sendReply(`Added ${amount} tour win(s) to clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while adding tour wins.");
			Monitor.crashlog(e as Error, "Clan addtourwins command", { clanId });
		}
	},

	async removetourwins(target, room, user) {
		this.checkCan('roomowner');
		const [clanIdRaw, amountStr] = target.split(',').map(s => s.trim());
		const clanId = toID(clanIdRaw);
		const amount = parseInt(amountStr) || 1;

		if (!clanId) return this.errorReply("Usage: /clan removetourwins [clan id], [amount]");
		if (amount <= 0) return this.errorReply("Amount must be a positive number.");

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		try {
			await Clans.updateOne({ _id: clanId }, { $inc: { 'stats.tourWins': -amount } });
			await log(clanId, 'ADMIN_TOURWIN', `${user.id} removed ${amount} tour win(s)`);
			this.sendReply(`Removed ${amount} tour win(s) from clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while removing tour wins.");
			Monitor.crashlog(e as Error, "Clan removetourwins command", { clanId });
		}
	},

	async addeventwins(target, room, user) {
		this.checkCan('roomowner');
		const [clanIdRaw, amountStr] = target.split(',').map(s => s.trim());
		const clanId = toID(clanIdRaw);
		const amount = parseInt(amountStr) || 1;

		if (!clanId) return this.errorReply("Usage: /clan addeventwins [clan id], [amount]");
		if (amount <= 0) return this.errorReply("Amount must be a positive number.");

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		try {
			await Clans.updateOne({ _id: clanId }, { $inc: { 'stats.eventWins': amount } });
			await log(clanId, 'ADMIN_EVENTWIN', `${user.id} added ${amount} event win(s)`);
			this.sendReply(`Added ${amount} event win(s) to clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while adding event wins.");
			Monitor.crashlog(e as Error, "Clan addeventwins command", { clanId });
		}
	},

	async removeeventwins(target, room, user) {
		this.checkCan('roomowner');
		const [clanIdRaw, amountStr] = target.split(',').map(s => s.trim());
		const clanId = toID(clanIdRaw);
		const amount = parseInt(amountStr) || 1;

		if (!clanId) return this.errorReply("Usage: /clan removeeventwins [clan id], [amount]");
		if (amount <= 0) return this.errorReply("Amount must be a positive number.");

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		try {
			await Clans.updateOne({ _id: clanId }, { $inc: { 'stats.eventWins': -amount } });
			await log(clanId, 'ADMIN_EVENTWIN', `${user.id} removed ${amount} event win(s)`);
			this.sendReply(`Removed ${amount} event win(s) from clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while removing event wins.");
			Monitor.crashlog(e as Error, "Clan removeeventwins command", { clanId });
		}
	},

	async resetstats(target, room, user) {
		this.checkCan('roomowner');
		const clanId = toID(target.trim());
		if (!clanId) return this.errorReply("Usage: /clan resetstats [clan id]");

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		try {
			await Clans.updateOne(
				{ _id: clanId },
				{ $set: { 'stats.tourWins': 0, 'stats.totalPointsEarned': 0 } }
			);
			await log(clanId, 'ADMIN_RESETSTATS', `${user.id} reset stats`);
			this.sendReply(`Reset all stats for clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while resetting stats.");
			Monitor.crashlog(e as Error, "Clan resetstats command", { clanId });
		}
	},

	async setdescadmin(target, room, user) {
		this.checkCan('roomowner');
		const [clanIdRaw, ...descArr] = target.split(',').map(s => s.trim());
		const clanId = toID(clanIdRaw);
		const desc = descArr.join(',') || '';

		if (!clanId || !desc) return this.errorReply("Usage: /clan setdescadmin [clan id], [desc]");
		if (desc.length > MAX_CLAN_DESC_LENGTH) {
			return this.errorReply(`Description must be ${MAX_CLAN_DESC_LENGTH} characters or less.`);
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		try {
			await Clans.updateOne({ _id: clanId }, { $set: { desc } });
			// Admin desc changes are not logged separately — low audit value
			this.sendReply(`Set description for clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while setting the description.");
			Monitor.crashlog(e as Error, "Clan setdescadmin command", { clanId });
		}
	},

	async settagadmin(target, room, user) {
		this.checkCan('roomowner');
		const [clanIdRaw, tagRaw] = target.split(',').map(s => s.trim());
		const clanId = toID(clanIdRaw);
		const tag = tagRaw?.toUpperCase();

		if (!clanId || !tag) return this.errorReply("Usage: /clan settagadmin [clan id], [tag]");
		if (tag.length > MAX_CLAN_TAG_LENGTH || !CLAN_TAG_REGEX.test(tag)) {
			return this.errorReply(`Tag must be ${MAX_CLAN_TAG_LENGTH} characters or less and only uppercase letters.`);
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		try {
			await Clans.updateOne({ _id: clanId }, { $set: { tag } });
			// Admin tag changes are not logged separately — low audit value
			this.sendReply(`Set tag for clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while setting the tag.");
			Monitor.crashlog(e as Error, "Clan settagadmin command", { clanId });
		}
	},

	async seticonadmin(target, room, user) {
		this.checkCan('roomowner');
		const [clanIdRaw, ...iconArr] = target.split(',').map(s => s.trim());
		const clanId = toID(clanIdRaw);
		const iconUrl = iconArr.join(',') || '';

		if (!clanId || !iconUrl) return this.errorReply("Usage: /clan seticonadmin [clan id], [icon url]");
		if (iconUrl.length > MAX_CLAN_ICON_URL_LENGTH || !ICON_URL_REGEX.test(iconUrl)) {
			return this.errorReply("Icon URL must be a valid HTTP(S) image URL (png/jpg/jpeg/gif/webp) and 1000 chars or less.");
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		try {
			await Clans.updateOne({ _id: clanId }, { $set: { icon: iconUrl } });
			// Admin icon changes are not logged separately — low audit value
			this.sendReply(`Set icon for clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while setting the icon.");
			Monitor.crashlog(e as Error, "Clan seticonadmin command", { clanId });
		}
	},

	async kickall(target, room, user) {
		this.checkCan('roomowner');
		const clanId = toID(target.trim());
		if (!clanId) return this.errorReply("Usage: /clan kickall [clan id]");

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		const ownerId = clan.owner;
		const membersToKick = Object.keys(clan.members).filter(uid => uid !== ownerId);

		if (!membersToKick.length) {
			return this.sendReply(`No members to kick in clan '${clan.name}'.`);
		}

		try {
			await Clans.updateOne({ _id: clanId }, {
				$unset: Object.fromEntries(membersToKick.map(uid => [`members.${uid}`, ""])),
			});
			await UserClans.updateMany(
				{ memberOf: clanId, _id: { $in: membersToKick } },
				{ $unset: { memberOf: 1 } }
			);
			await log(clanId, 'ADMIN_KICKALL', `${user.id} kicked all members (${membersToKick.length} removed)`);
			this.sendReply(`Kicked all members except owner from clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while kicking all members.");
			Monitor.crashlog(e as Error, "Clan kickall command", { clanId });
		}
	},

	async clearinvites(target, room, user) {
		this.checkCan('roomowner');
		const clanId = toID(target.trim());
		if (!clanId) return this.errorReply("Usage: /clan clearinvites [clan id]");

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		const invitedUserIds = clan.invites.map(i => i.userid);

		try {
			await Clans.updateOne({ _id: clanId }, { $set: { invites: [] } });
			if (invitedUserIds.length) {
				await UserClans.updateMany(
					{ _id: { $in: invitedUserIds } },
					{ $pull: { invites: clanId } }
				);
			}
			// Invite clears are not logged — low audit value
			this.sendReply(`Cleared all invites from clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while clearing invites.");
			Monitor.crashlog(e as Error, "Clan clearinvites command", { clanId });
		}
	},

	async export(target, room, user) {
		this.checkCan('roomowner');
		const clanId = toID(target.trim());
		if (!clanId) return this.errorReply("Usage: /clan export [clan id]");

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		const members = Object.keys(clan.members);
		const [logs, pointsLogs] = await Promise.all([
			ClanLogs.find({ clanId }, {}),
			ClanPointsLogs.find({ clanId }, {}),
		]);

		const exportObj = { clan, members, logs, pointsLogs };
		const exportStr = `<details><summary>Export data for clan '${clan.name}'</summary><pre>${JSON.stringify(exportObj, null, 2)}</pre></details>`;
		this.sendReply(`|html|${exportStr}`);
	},

	async transferadmin(target, room, user) {
		this.checkCan('roomowner');
		const [clanIdRaw, newOwnerRaw] = target.split(',').map(s => s.trim());
		const clanId = toID(clanIdRaw);
		const newOwnerId = toID(newOwnerRaw);

		if (!clanId || !newOwnerId) {
			return this.errorReply("Usage: /clan transferadmin [clan id], [new owner]");
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		if (!clan.members[newOwnerId]) {
			return this.errorReply(`User '${newOwnerId}' is not a member of the clan.`);
		}

		const oldOwnerId = clan.owner;

		try {
			await Clans.updateOne({ _id: clanId }, {
				$set: {
					owner: newOwnerId,
					[`members.${newOwnerId}.role`]: 'owner' as ClanRole,
					[`members.${oldOwnerId}.role`]: 'leader' as ClanRole,
				},
			});
			await log(clanId, 'ADMIN_TRANSFEROWNER', `${user.id} transferred ownership to ${newOwnerId}`);
			this.sendReply(`Transferred ownership of clan '${clan.name}' to '${newOwnerId}'.`);
		} catch (e) {
			this.errorReply("An error occurred while transferring ownership.");
			Monitor.crashlog(e as Error, "Clan transferadmin command", { clanId, newOwnerId });
		}
	},

	async banuser(target, room, user) {
		this.checkCan('roomowner');
		const bannedId = toID(target.trim());
		if (!bannedId) return this.errorReply("Usage: /clan banuser [username]");

		try {
			await ClanBans.upsert({ _id: bannedId }, { $set: { banned: true } });
			this.sendReply(`User '${bannedId}' is now banned from joining clans.`);
		} catch (e) {
			this.errorReply("An error occurred while banning the user.");
			Monitor.crashlog(e as Error, "Clan banuser command", { bannedId });
		}
	},

	async unbanuser(target, room, user) {
		this.checkCan('roomowner');
		const bannedId = toID(target.trim());
		if (!bannedId) return this.errorReply("Usage: /clan unbanuser [username]");

		try {
			await ClanBans.deleteOne({ _id: bannedId });
			this.sendReply(`User '${bannedId}' is unbanned and may join clans.`);
		} catch (e) {
			this.errorReply("An error occurred while unbanning the user.");
			Monitor.crashlog(e as Error, "Clan unbanuser command", { bannedId });
		}
	},

	async clearlogs(target, room, user) {
		this.checkCan('roomowner');
		const clanId = toID(target.trim());
		if (!clanId) return this.errorReply("Usage: /clan clearlogs [clan id]");

		try {
			await ClanLogs.deleteMany({ clanId });
			await ClanPointsLogs.deleteMany({ clanId });
			this.sendReply(`Cleared all logs for clan '${clanId}'.`);
		} catch (e) {
			this.errorReply("An error occurred while clearing logs.");
			Monitor.crashlog(e as Error, "Clan clearlogs command", { clanId });
		}
	},

	async clearmembers(target, room, user) {
		this.checkCan('roomowner');
		const clanId = toID(target.trim());
		if (!clanId) return this.errorReply("Usage: /clan clearmembers [clan id]");

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		const ownerId = clan.owner;
		const membersToRemove = Object.keys(clan.members).filter(uid => uid !== ownerId);

		if (!membersToRemove.length) {
			return this.sendReply(`No members to remove in clan '${clan.name}'.`);
		}

		try {
			await Clans.updateOne({ _id: clanId }, {
				$unset: Object.fromEntries(membersToRemove.map(uid => [`members.${uid}`, ""])),
			});
			await UserClans.updateMany(
				{ memberOf: clanId, _id: { $in: membersToRemove } },
				{ $unset: { memberOf: 1 } }
			);
			await log(clanId, 'ADMIN_CLEARMEMBERS', `${user.id} removed all members (${membersToRemove.length} removed)`);
			this.sendReply(`Removed all members except owner from clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while clearing members.");
			Monitor.crashlog(e as Error, "Clan clearmembers command", { clanId });
		}
	},
};




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

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
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

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
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

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
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

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
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




export const memberCommands: Chat.ChatCommands = {

	async join(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to join a clan.");

		const clanId = toID(target);
		const userId = user.id;

		if (!clanId) return this.errorReply("Specify the ID of the clan you wish to join.");

		const banInfo = await ClanBans.findOne({ _id: userId });
		if (banInfo?.banned) return this.errorReply("You are banned from joining clans.");

		const [clan, userClanInfo] = await Promise.all([
			Clans.findOne({ _id: clanId }),
			UserClans.findOne({ _id: userId }),
		]);

		if (!clan) return this.errorReply(`Clan '${clanId}' not found.`);
		if (userClanInfo?.memberOf) {
			return this.errorReply(`You are already a member of the clan '${userClanInfo.memberOf}'.`);
		}

		const isInvited = clan.invites.some(invite => invite.userid === userId);
		if (clan.inviteOnly && !isInvited) {
			return this.errorReply(`The clan '${esc(clan.name)}' is invite-only. You must be invited to join.`);
		}

		try {
			await Clans.updateOne(
				{ _id: clanId },
				{ $pull: { invites: { userid: userId } } }
			);
			await Clans.updateOne(
				{ _id: clanId },
				{
					$set: {
						[`members.${userId}`]: {
							role: 'member',
							joinDate: Date.now(),
							totalPointsContributed: 0,
						},
					},
				}
			);
			await UserClans.upsert({ _id: userId }, {
				$set: { memberOf: clanId },
				$pull: { invites: clanId },
			});

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
			if (clanRoom) {
				clanRoom.auth.set(userId, '+');
				clanRoom.saveSettings();
				user.joinRoom(clanRoom.roomid, this.connection);
				clanRoom.add(`|html|<div class="infobox">${esc(user.name)} joined the clan and was granted Room Voice.</div>`).update();
			}

			await log(clanId, 'JOIN', `${userId} joined the clan`);

			this.sendReply(`You have successfully joined the clan '${esc(clan.name)}'!`);
			if (clanRoom) this.sendReply(`You have been automatically joined to the clan chatroom: #${esc(clan.chatRoom)}`);
		} catch (e) {
			this.errorReply("An error occurred while joining the clan. Please try again.");
			Monitor.crashlog(e as Error, "Clan join command", { clanId, userId });
		}
	},

	async leave(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to leave a clan.");

		const userId = user.id;
		const ctx = await getClanContext(userId, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		if (clan.owner === userId) {
			return this.errorReply("You are the owner of this clan. Transfer ownership before leaving or delete the clan.");
		}

		try {
			await Clans.updateOne({ _id: clanId }, { $unset: { [`members.${userId}`]: "" } });
			await UserClans.updateOne({ _id: userId }, { $unset: { memberOf: 1 } });

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
			if (clanRoom) {
				clanRoom.auth.delete(userId);
				clanRoom.saveSettings();
				clanRoom.add(`|html|<div class="infobox"><center>${esc(user.name)} left the clan.</center></div>`).update();
				user.leaveRoom(clanRoom.roomid, this.connection);
			}

			await log(clanId, 'LEAVE', `${userId} left the clan`);

			this.sendReply(`You have successfully left the clan '${esc(clan.name)}'.`);
		} catch (e) {
			this.errorReply("An error occurred while leaving the clan. Please try again.");
			Monitor.crashlog(e as Error, "Clan leave command", { clanId, userId });
		}
	},

	async kick(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to kick users.");

		const targetId = toID(target);
		const kickerId = user.id;

		if (!targetId) return this.errorReply("Specify the user you wish to kick.");
		if (targetId === kickerId) return this.errorReply("You cannot kick yourself.");

		const ctx = await getClanContext(kickerId, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		if (!hasMinRole(clan, kickerId, 'officer')) {
			return this.errorReply("You must be at least an Officer to kick members.");
		}
		if (!assertClanMember(clan, targetId, this)) return;
		if (!assertNotOwner(clan, targetId, this)) return;

		const kickerRole = clan.owner === kickerId ? 'owner' : (clan.members[kickerId]?.role ?? 'member');
		const targetRole = clan.members[targetId].role;

		const ROLE_LEVELS: Record<string, number> = { owner: 100, leader: 50, officer: 25, member: 10 };
		if ((ROLE_LEVELS[targetRole] ?? 0) >= (ROLE_LEVELS[kickerRole] ?? 0)) {
			return this.errorReply("You cannot kick users with an equal or higher role than yours.");
		}

		try {
			await Clans.updateOne({ _id: clanId }, { $unset: { [`members.${targetId}`]: "" } });
			await UserClans.updateOne({ _id: targetId }, { $unset: { memberOf: 1 } });

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
			if (clanRoom) {
				clanRoom.auth.delete(targetId);
				clanRoom.saveSettings();
				const kickedUser = Users.get(targetId);
				if (kickedUser?.inRooms.has(clan.chatRoom)) kickedUser.leaveRoom(clanRoom);
				clanRoom.add(`|html|<div class="infobox"><center>${esc(targetId)} was kicked from the clan by ${esc(user.name)}.</center></div>`).update();
			}

			const targetUser = Users.getExact(targetId);
			if (targetUser?.connected) {
				targetUser.popup(`|html|<div class="infobox">You have been kicked from the clan <b>${esc(clan.name)}</b> by ${esc(user.name)}.</div>`);
			}

			await log(clanId, 'KICK', `${kickerId} kicked ${targetId} from the clan`);

			this.sendReply(`You kicked '${esc(targetId)}' from ${esc(clan.name)}.`);
			refreshClanPage(user);
		} catch (e) {
			this.errorReply("An error occurred while kicking the user. Please try again.");
			Monitor.crashlog(e as Error, "Clan kick command", { clanId, kickerId, targetId });
		}
	},

	async invite(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to send invites.");

		const targetId = toID(target);
		const inviterId = user.id;

		if (!targetId) return this.errorReply("Specify the user you wish to invite.");
		if (targetId === inviterId) return this.errorReply("You cannot invite yourself.");

		const [inviterClanInfo, targetClanInfo] = await Promise.all([
			UserClans.findOne({ _id: inviterId }),
			UserClans.findOne({ _id: targetId }),
		]);

		const clanId = inviterClanInfo?.memberOf;
		if (!clanId) return this.errorReply("You are not currently a member of any clan.");

		if (targetClanInfo?.memberOf) {
			return this.errorReply(`'${esc(targetId)}' is already a member of the clan '${esc(targetClanInfo.memberOf)}'.`);
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		if (!hasMinRole(clan, inviterId, 'officer')) {
			return this.errorReply("You must be at least an Officer to invite users.");
		}
		if (clan.invites.some(invite => invite.userid === targetId)) {
			return this.errorReply(`'${esc(targetId)}' has already been invited to ${esc(clan.name)}.`);
		}

		try {
			await Clans.updateOne(
				{ _id: clanId },
				{ $push: { invites: { userid: targetId, actor: inviterId, timestamp: Date.now() } } }
			);
			await UserClans.upsert({ _id: targetId }, { $addToSet: { invites: clanId } });

			// Invites are not logged — low audit value

			this.sendReply(`You invited '${esc(targetId)}' to join ${esc(clan.name)}.`);

			const targetUser = Users.getExact(targetId);
			if (targetUser?.connected) {
				targetUser.popup(`|html|${generateInvitePopup(clan.name, clanId, user.name)}`);
			} else {
				this.sendReply(`'${esc(targetId)}' is offline and will see the invite when they log in.`);
			}

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
			if (clanRoom) {
				clanRoom.add(`|html|<div class="infobox"><center>${esc(user.name)} invited ${esc(targetId)} to the clan.</center></div>`).update();
			}
		} catch (e) {
			this.errorReply("An error occurred while sending the invite. Please try again.");
			Monitor.crashlog(e as Error, "Clan invite command", { clanId, inviterId, targetId });
		}
	},

	async deinvite(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to revoke invites.");

		const targetId = toID(target);
		const actorId = user.id;

		if (!targetId) return this.errorReply("Specify the user whose invite you wish to revoke.");

		const ctx = await getClanContext(actorId, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		if (!hasMinRole(clan, actorId, 'officer')) {
			return this.errorReply("You must be at least an Officer to revoke invites.");
		}
		if (!clan.invites.some(invite => invite.userid === targetId)) {
			return this.errorReply(`'${esc(targetId)}' does not have a pending invite to ${esc(clan.name)}.`);
		}

		try {
			await Clans.updateOne({ _id: clanId }, { $pull: { invites: { userid: targetId } } });
			await UserClans.updateOne({ _id: targetId }, { $pull: { invites: clanId } });

			// Deinvites are not logged — low audit value

			this.sendReply(`You revoked ${esc(targetId)}'s invite to ${esc(clan.name)}.`);

			const targetUser = Users.getExact(targetId);
			if (targetUser?.connected) {
				targetUser.popup(`|html|<div class="infobox">Your invite to join the clan <b>${esc(clan.name)}</b> has been revoked by ${esc(user.name)}.</div>`);
			}

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
			if (clanRoom) {
				clanRoom.add(`|html|<div class="infobox"><center>${esc(user.name)} revoked ${esc(targetId)}'s invite to the clan.</center></div>`).update();
			}
		} catch (e) {
			this.errorReply("An error occurred while revoking the invite. Please try again.");
			Monitor.crashlog(e as Error, "Clan deinvite command", { clanId, actorId, targetId });
		}
	},

	async invites(target, room, user) {
		this.runBroadcast();
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to check invites.");

		const userId = user.id;
		const userClanInfo = await UserClans.findOne({ _id: userId });
		const memberOfClanId = userClanInfo?.memberOf;

		let output = '';
		let isClanOfficer = false;

		if (memberOfClanId) {
			const clan = await Clans.findOne({ _id: memberOfClanId });
			if (clan) {
				isClanOfficer = hasMinRole(clan, userId, 'officer');

				if (isClanOfficer) {
					const sentInvites = clan.invites;
					if (sentInvites.length) {
						const sentDataRows: string[][] = [];
						const sentHeaderRow = ['User', 'Invited By', 'Date'];
						const sentTitle = `Invites Sent by ${esc(clan.name)}`;

						sentInvites.forEach(invite => {
							sentDataRows.push([
								esc(invite.userid),
								esc(invite.actor),
								to(new Date(invite.timestamp), { date: true, time: true }),
							]);
						});

						output += Table(sentTitle, sentHeaderRow, sentDataRows);
					} else {
						output += `<div class="infobox">${esc(clan.name)} has no pending outgoing invitations.</div>`;
					}
				}
			}
		}

		if (!isClanOfficer) {
			const receivedInvites = userClanInfo?.invites || [];
			if (receivedInvites.length) {
				const invitedClans = await Clans.find({ _id: { $in: receivedInvites } });
				const headerRow = ['Clan', 'ID', 'Action'];
				const dataRows: string[][] = [];
				const title = 'Your Pending Clan Invites';

				invitedClans.forEach(clan => {
					dataRows.push([
						esc(clan.name),
						esc(clan._id),
						`<button class="button" name="send" value="/clan join ${clan._id}">Accept</button>`,
					]);
				});

				if (output) output += '<hr />';
				output += Table(title, headerRow, dataRows);
			} else if (!output) {
				return this.errorReply("You have no pending clan invitations.");
			}
		}

		if (!output) {
			return this.errorReply("You are not currently a member of a clan and have no pending invites.");
		}

		this.sendReply(`|html|${output}`);
	},

	async inviteonly(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to toggle invite-only mode.");

		const value = target.trim().toLowerCase();
		const actorId = user.id;

		let newInviteOnlyStatus: boolean;
		if (['on', 'true', '1'].includes(value)) {
			newInviteOnlyStatus = true;
		} else if (['off', 'false', '0'].includes(value)) {
			newInviteOnlyStatus = false;
		} else if (value === 'toggle') {
			newInviteOnlyStatus = null as any;
		} else {
			return this.errorReply("Usage: /clan inviteonly [on/off/toggle]");
		}

		const ctx = await getClanContext(actorId, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		if (!hasMinRole(clan, actorId, 'leader')) {
			return this.errorReply("You must be at least a Leader to change invite-only mode.");
		}

		if (newInviteOnlyStatus === null) newInviteOnlyStatus = !clan.inviteOnly;

		if (clan.inviteOnly === newInviteOnlyStatus) {
			const currentStatus = newInviteOnlyStatus ? 'already invite-only' : 'already open to all users';
			return this.errorReply(`The clan is ${currentStatus}.`);
		}

		try {
			await Clans.updateOne({ _id: clanId }, { $set: { inviteOnly: newInviteOnlyStatus } });

			// Invite-only toggle is not logged — minor setting, low audit value

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
			if (clanRoom) {
				const statusText = newInviteOnlyStatus ? 'is now invite-only' : 'is now open to all users';
				clanRoom.add(`|html|<div class="infobox"><center>${esc(user.name)} changed the clan setting: The clan ${statusText}.</center></div>`).update();
			}

			const statusText = newInviteOnlyStatus ? 'enabled' : 'disabled';
			this.sendReply(`You have successfully ${statusText} invite-only mode for ${esc(clan.name)}.`);
		} catch (e) {
			this.errorReply("An error occurred while updating invite-only mode. Please try again.");
			Monitor.crashlog(e as Error, "Clan inviteonly command", { clanId, actorId });
		}
	},

	async announce(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to announce to your clan.");

		const message = target.trim();
		if (!message) return this.errorReply("You must specify a message to announce.");

		const actorId = user.id;
		const ctx = await getClanContext(actorId, this);
		if (!ctx) return;

		const { clan } = ctx;

		if (!hasMinRole(clan, actorId, 'leader')) {
			return this.errorReply("You must be at least a Leader to send announcements.");
		}

		const memberIds = Object.keys(clan.members);
		const popupHtml = generateAnnouncementPopup(message, user.name, clan.name);

		// Announcements are not logged — no audit value

		let sentTo = 0;
		for (const memberId of memberIds) {
			const memberUser = Users.getExact(memberId);
			if (memberUser?.connected) {
				memberUser.popup(`|html|${popupHtml}`);
				sentTo++;
			}
		}

		this.sendReply(`Announcement sent to ${sentTo} online member(s) of your clan.`);
	},
};








export const rankCommands: Chat.ChatCommands = {

	async promote(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to promote users.");

		const [targetUsername, newRoleRaw] = target.split(',').map(s => s.trim());
		const targetId = toID(targetUsername);
		const actorId = user.id;
		const newRole = toID(newRoleRaw) as ClanRole;

		if (!targetId || !newRole) {
			return this.errorReply("Usage: /clan promote [username], [role] — roles: leader, officer, member");
		}
		if (targetId === actorId) return this.errorReply("You cannot promote yourself.");
		if (!ASSIGNABLE_ROLES.includes(newRole)) {
			return this.errorReply(`Invalid role '${esc(newRole)}'. Valid roles: ${ASSIGNABLE_ROLES.join(', ')}`);
		}
		if (newRole === 'owner') {
			return this.errorReply("Use /clan transfer to transfer ownership.");
		}

		const ctx = await getClanContext(actorId, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		if (!hasMinRole(clan, actorId, 'leader')) {
			return this.errorReply("You must be at least a Leader to promote members.");
		}
		if (!assertClanMember(clan, targetId, this)) return;
		if (!assertNotOwner(clan, targetId, this)) return;

		const currentRole = clan.members[targetId].role;
		const actorRole = clan.owner === actorId ? 'owner' : (clan.members[actorId]?.role ?? 'member');
		const currentLevel = ROLE_LEVELS[currentRole] ?? 0;
		const newLevel = ROLE_LEVELS[newRole] ?? 0;
		const actorLevel = ROLE_LEVELS[actorRole] ?? 0;

		if (newLevel >= actorLevel) {
			return this.errorReply("You cannot promote users to a role equal to or higher than your own.");
		}
		if (currentLevel >= actorLevel) {
			return this.errorReply("You cannot promote users with a role equal to or higher than your own.");
		}
		if (newLevel <= currentLevel) {
			return this.errorReply("The new role must be higher than the current role. Use /clan demote to lower a role.");
		}

		try {
			await Clans.updateOne(
				{ _id: clanId },
				{ $set: { [`members.${targetId}.role`]: newRole } }
			);

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
			if (clanRoom) {
				const newRoomRank = CLAN_ROLE_TO_ROOM_RANK[newRole] || '+';
				clanRoom.auth.set(targetId, newRoomRank);
				clanRoom.saveSettings();
				clanRoom.add(`|html|<div class="infobox"><center>${esc(targetId)} was promoted from ${esc(currentRole)} to ${esc(newRole)} by ${esc(user.name)}.</center></div>`).update();
			}

			const targetUser = Users.getExact(targetId);
			if (targetUser?.connected) {
				targetUser.popup(`|html|<div class="infobox">You have been promoted to <b>${esc(newRole)}</b> in ${esc(clan.name)} by ${esc(user.name)}.</div>`);
			}

			await log(clanId, 'PROMOTE', `${actorId} promoted ${targetId} to ${newRole}`);

			this.sendReply(`You promoted '${esc(targetId)}' from ${esc(currentRole)} to ${esc(newRole)}.`);
			refreshClanPage(user);
		} catch (e) {
			this.errorReply("An error occurred while promoting the user. Please try again.");
			Monitor.crashlog(e as Error, "Clan promote command", { clanId, actorId, targetId });
		}
	},

	async demote(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to demote users.");

		const [targetUsername, newRoleRaw] = target.split(',').map(s => s.trim());
		const targetId = toID(targetUsername);
		const actorId = user.id;
		const newRole = toID(newRoleRaw) as ClanRole;

		if (!targetId || !newRole) {
			return this.errorReply("Usage: /clan demote [username], [role] — roles: leader, officer, member");
		}
		if (targetId === actorId) return this.errorReply("You cannot demote yourself.");
		if (!ASSIGNABLE_ROLES.includes(newRole)) {
			return this.errorReply(`Invalid role '${esc(newRole)}'. Valid roles: ${ASSIGNABLE_ROLES.join(', ')}`);
		}
		if (newRole === 'owner') {
			return this.errorReply("Use /clan transfer to transfer ownership.");
		}

		const ctx = await getClanContext(actorId, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		if (!hasMinRole(clan, actorId, 'leader')) {
			return this.errorReply("You must be at least a Leader to demote members.");
		}
		if (!assertClanMember(clan, targetId, this)) return;
		if (!assertNotOwner(clan, targetId, this)) return;

		const currentRole = clan.members[targetId].role;
		const actorRole = clan.owner === actorId ? 'owner' : (clan.members[actorId]?.role ?? 'member');
		const currentLevel = ROLE_LEVELS[currentRole] ?? 0;
		const newLevel = ROLE_LEVELS[newRole] ?? 0;
		const actorLevel = ROLE_LEVELS[actorRole] ?? 0;

		if (newLevel >= actorLevel) {
			return this.errorReply("You cannot demote users to a role equal to or higher than your own.");
		}
		if (currentLevel >= actorLevel) {
			return this.errorReply("You cannot demote users with a role equal to or higher than your own.");
		}
		if (newLevel >= currentLevel) {
			return this.errorReply("The new role must be lower than the current role. Use /clan promote to raise a role.");
		}

		try {
			await Clans.updateOne(
				{ _id: clanId },
				{ $set: { [`members.${targetId}.role`]: newRole } }
			);

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
			if (clanRoom) {
				const newRoomRank = CLAN_ROLE_TO_ROOM_RANK[newRole] || '+';
				clanRoom.auth.set(targetId, newRoomRank);
				clanRoom.saveSettings();
				clanRoom.add(`|html|<div class="infobox"><center>${esc(targetId)} was demoted from ${esc(currentRole)} to ${esc(newRole)} by ${esc(user.name)}.</center></div>`).update();
			}

			const targetUser = Users.getExact(targetId);
			if (targetUser?.connected) {
				targetUser.popup(`|html|<div class="infobox">You have been demoted to <b>${esc(newRole)}</b> in ${esc(clan.name)} by ${esc(user.name)}.</div>`);
			}

			await log(clanId, 'DEMOTE', `${actorId} demoted ${targetId} to ${newRole}`);

			this.sendReply(`You demoted '${esc(targetId)}' from ${esc(currentRole)} to ${esc(newRole)}.`);
		} catch (e) {
			this.errorReply("An error occurred while demoting the user. Please try again.");
			Monitor.crashlog(e as Error, "Clan demote command", { clanId, actorId, targetId });
		}
	},

	async transfer(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in to transfer ownership.");

		const targetId = toID(target);
		const actorId = user.id;

		if (!targetId) return this.errorReply("Specify the user you wish to transfer ownership to.");
		if (targetId === actorId) return this.errorReply("You are already the owner.");

		const ctx = await getClanContext(actorId, this);
		if (!ctx) return;

		const { clan, clanId } = ctx;

		if (clan.owner !== actorId) {
			return this.errorReply("Only the clan owner can transfer ownership.");
		}
		if (!assertClanMember(clan, targetId, this)) return;

		try {
			await Clans.updateOne(
				{ _id: clanId },
				{
					$set: {
						owner: targetId,
						[`members.${targetId}.role`]: 'owner' as ClanRole,
						[`members.${actorId}.role`]: 'leader' as ClanRole,
					},
				}
			);

			const clanRoom = Rooms.get(toID(clan.chatRoom) as RoomID);
			if (clanRoom) {
				clanRoom.auth.set(targetId, '#');
				clanRoom.auth.set(actorId, '@');
				clanRoom.saveSettings();
				clanRoom.add(`|html|<div class="infobox"><center>Clan ownership has been transferred from ${esc(user.name)} to ${esc(targetId)}.</center></div>`).update();
			}

			const targetUser = Users.getExact(targetId);
			if (targetUser?.connected) {
				targetUser.popup(`|html|<div class="infobox">You are now the owner of <b>${esc(clan.name)}</b>! Ownership was transferred to you by ${esc(user.name)}.</div>`);
			}

			await log(clanId, 'PROMOTE', `${actorId} transferred ownership to ${targetId}`);

			this.sendReply(`You transferred ownership of ${esc(clan.name)} to '${esc(targetId)}'. You are now a Leader.`);
		} catch (e) {
			this.errorReply("An error occurred while transferring ownership. Please try again.");
			Monitor.crashlog(e as Error, "Clan transfer command", { clanId, actorId, targetId });
		}
	},
};
