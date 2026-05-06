import {
	Clans, UserClans, ClanLogs, ClanPointsLogs,
	ClanBattleLogs, ClanWars, ClanBans,
} from '../database';
import { log } from '../utils';
import { refreshClanPage } from '../render';
import { getClanById } from '../helpers/context';
import {
	MAX_CLAN_DESC_LENGTH,
	MAX_CLAN_TAG_LENGTH,
	MAX_CLAN_ICON_URL_LENGTH,
	CLAN_TAG_REGEX,
	ICON_URL_REGEX,
	DEFAULT_STATS,
} from '../constants';
import { FS } from '../../../../lib';
import type { ClanRole } from '../interface';

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
		const chatRoom = Rooms.get(clan.chatRoom);

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
