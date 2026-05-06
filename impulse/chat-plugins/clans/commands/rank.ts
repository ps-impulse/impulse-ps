import { Clans } from '../database';
import { hasMinRole, log } from '../utils';
import { getClanContext, assertClanMember, assertNotOwner } from '../helpers/context';
import { CLAN_ROLE_TO_ROOM_RANK } from '../constants';
import { refreshClanPage } from '../render';
import { Utils } from '../../../../lib';
import type { ClanRole } from '../interface';

const esc = (v: string | number | undefined | null) => Utils.escapeHTML(String(v ?? ''));

const ASSIGNABLE_ROLES: ClanRole[] = ['leader', 'officer', 'member'];

const ROLE_LEVELS: Record<ClanRole, number> = {
	owner: 100,
	leader: 50,
	officer: 25,
	member: 10,
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

			const clanRoom = Rooms.get(clan.chatRoom);
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

			const clanRoom = Rooms.get(clan.chatRoom);
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

			const clanRoom = Rooms.get(clan.chatRoom);
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
