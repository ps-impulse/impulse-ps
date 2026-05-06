/*
 * Pokemon Showdown - Impulse Server
 * Clans War Admin Commands
 * @author PrinceSky-Git
 */

import { Clans, ClanWars, type ClanWarDoc } from '../database';
import { log } from '../utils';
import { calculateElo, safeElo } from '../helpers/elo';
import { broadcastWarUpdate, broadcastWarEnded, getWarUhtmlId } from '../helpers/broadcast';
import { getClanById } from '../helpers/context';
import { validateBestOf, resolveWarClans } from './war-context';
import type { ClanWar } from '../interface';

export const adminWarCommands: Chat.ChatCommands = {

	async forceend(target, room, user) {
		this.checkChat();
		this.checkCan('roomowner');

		const clanId = toID(target);
		if (!clanId) return this.errorReply("Specify a clan ID. Usage: /clan war forceend [clanid]");

		const targetClan = await getClanById(clanId, this);
		if (!targetClan) return;

		const war = await ClanWars.findOne({ clans: clanId, status: 'active' });
		if (!war) return this.errorReply(`No active war found for clan '${clanId}'.`);

		try {
			await ClanWars.updateOne(
				{ _id: war._id },
				{ $set: { status: 'completed', endDate: Date.now() } }
			);

			const clans = await resolveWarClans(war);
			if (!clans) return this.errorReply("A clan was deleted.");

			const [clan1, clan2] = clans;
			const score1 = war.scores[clan1._id] || 0;
			const score2 = war.scores[clan2._id] || 0;
			war.status = 'completed';

			await Promise.all([
				log(clan1._id, 'ADMIN_WAR_FORCEEND', `${user.id} force-ended the war`),
				log(clan2._id, 'ADMIN_WAR_FORCEEND', `${user.id} force-ended the war`),
			]);

			const uhtmlId = getWarUhtmlId(war._id);
			const endMessage = `[ADMIN] ${user.name} has concluded the war. Final Score: ${score1} - ${score2}`;
			broadcastWarEnded(war, clan1, clan2, uhtmlId, endMessage);

			this.sendReply(`Force ended the war between ${clan1.name} and ${clan2.name}.`);
		} catch (e) {
			this.errorReply("An error occurred while force ending the war.");
			Monitor.crashlog(e as Error, "Clan war forceend command", { clanId, warId: war._id });
		}
	},

	async forcetie(target, room, user) {
		this.checkChat();
		this.checkCan('roomowner');

		const clanId = toID(target);
		if (!clanId) return this.errorReply("Specify a clan ID. Usage: /clan war forcetie [clanid]");

		const targetClan = await getClanById(clanId, this);
		if (!targetClan) return;

		const war = await ClanWars.findOne({ clans: clanId, status: 'active' });
		if (!war) return this.errorReply(`No active war found for clan '${clanId}'.`);

		try {
			await ClanWars.updateOne(
				{ _id: war._id },
				{ $set: { status: 'completed', endDate: Date.now() } }
			);

			const clans = await resolveWarClans(war);
			if (!clans) return this.errorReply("A clan was deleted.");

			const [clan1, clan2] = clans;
			const score1 = war.scores[clan1._id] || 0;
			const score2 = war.scores[clan2._id] || 0;
			war.status = 'completed';

			// Force ties use WAR_TIE so they appear in the war outcome history
			await Promise.all([
				log(clan1._id, 'WAR_TIE', `${user.id} forced a draw against ${clan2._id}`),
				log(clan2._id, 'WAR_TIE', `${user.id} forced a draw against ${clan1._id}`),
			]);

			const uhtmlId = getWarUhtmlId(war._id);
			const endMessage = `[ADMIN] ${user.name} has declared the war a tie. Final Score: ${score1} - ${score2}`;
			broadcastWarEnded(war, clan1, clan2, uhtmlId, endMessage);

			this.sendReply(`Force tied the war between ${clan1.name} and ${clan2.name}.`);
		} catch (e) {
			this.errorReply("An error occurred while force tying the war.");
			Monitor.crashlog(e as Error, "Clan war forcetie command", { clanId, warId: war._id });
		}
	},

	async forfeitadmin(target, room, user) {
		this.checkChat();
		this.checkCan('roomowner');

		const [loserClanIdRaw, winnerClanIdRaw] = target.split(',').map(s => toID(s.trim()));
		if (!loserClanIdRaw || !winnerClanIdRaw) {
			return this.errorReply("Usage: /clan war forfeitadmin [loserclanid], [winnerclanid]");
		}

		const [loserClan, winnerClan] = await Promise.all([
			getClanById(loserClanIdRaw, this),
			getClanById(winnerClanIdRaw, this),
		]);
		if (!loserClan || !winnerClan) return;

		const war = await ClanWars.findOne({
			clans: { $all: [loserClanIdRaw, winnerClanIdRaw] },
			status: 'active',
		});
		if (!war) return this.errorReply(`No active war found between these clans.`);

		const winnerOldElo = safeElo(winnerClan.stats.elo);
		const loserOldElo = safeElo(loserClan.stats.elo);
		const [newWinnerElo, newLoserElo, eloChange] = calculateElo(winnerOldElo, loserOldElo);

		try {
			await Promise.all([
				Clans.updateOne(
					{ _id: winnerClanIdRaw },
					{ $set: { 'stats.elo': newWinnerElo }, $inc: { 'stats.clanBattleWins': 1 } }
				),
				Clans.updateOne(
					{ _id: loserClanIdRaw },
					{ $set: { 'stats.elo': newLoserElo }, $inc: { 'stats.clanBattleLosses': 1 } }
				),
				ClanWars.updateOne(
					{ _id: war._id },
					{ $set: { status: 'completed', endDate: Date.now() } }
				),
				log(loserClanIdRaw, 'ADMIN_WAR_FORFEIT', `${user.id} forced forfeit to ${winnerClanIdRaw} (-${eloChange} ELO)`),
				log(winnerClanIdRaw, 'WAR_WIN', `${user.id} forced ${loserClanIdRaw} to forfeit (+${eloChange} ELO)`),
			]);

			const clans = await resolveWarClans(war);
			if (!clans) return this.errorReply("Could not find clan data for war card update.");

			const [clan1, clan2] = clans;
			war.status = 'completed';

			const uhtmlId = getWarUhtmlId(war._id);
			const endMessage = `[ADMIN] ${user.name} has forced ${loserClan.name} to forfeit to ${winnerClan.name}. ELO Change: ${eloChange}`;
			broadcastWarEnded(war, clan1, clan2, uhtmlId, endMessage);

			this.sendReply(`Force forfeited war: ${loserClan.name} loses to ${winnerClan.name}. ELO Change: ${eloChange}`);
		} catch (e) {
			this.errorReply("An error occurred while force forfeiting the war.");
			Monitor.crashlog(e as Error, "Clan war forfeitadmin command", { loserClanIdRaw, winnerClanIdRaw, warId: war._id });
		}
	},

	async resetcooldown(target, room, user) {
		this.checkChat();
		this.checkCan('roomowner');

		const clanId = toID(target);
		if (!clanId) return this.errorReply("Specify a clan ID. Usage: /clan war resetcooldown [clanid]");

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		try {
			await Clans.updateOne(
				{ _id: clanId },
				{ $unset: { 'stats.lastWarChallenge': 1 } }
			);

			// Cooldown resets are not logged — low audit value

			const clanRoom = Rooms.get(clan.chatRoom);
			if (clanRoom) {
				clanRoom.add(
					`|html|<div class="broadcast-red"><center>` +
					`<strong>COOLDOWN RESET</strong><br />` +
					`By order of Admin ${user.name}, your clan may challenge again immediately!` +
					`</center></div>`
				).update();
			}

			this.sendReply(`Reset war challenge cooldown for clan '${clan.name}'.`);
		} catch (e) {
			this.errorReply("An error occurred while resetting the cooldown.");
			Monitor.crashlog(e as Error, "Clan war resetcooldown command", { clanId });
		}
	},

	async setscore(target, room, user) {
		this.checkChat();
		this.checkCan('roomowner');

		const [clan1IdRaw, score1Str, clan2IdRaw, score2Str] = target.split(',').map(s => s.trim());
		const score1 = parseInt(score1Str);
		const score2 = parseInt(score2Str);
		const c1ID = toID(clan1IdRaw);
		const c2ID = toID(clan2IdRaw);

		if (!c1ID || !c2ID || isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
			return this.errorReply("Usage: /clan war setscore [clan1id], [score1], [clan2id], [score2]");
		}

		const [clan1, clan2] = await Promise.all([
			getClanById(c1ID, this),
			getClanById(c2ID, this),
		]);
		if (!clan1 || !clan2) return;

		const war = await ClanWars.findOne({
			clans: { $all: [c1ID, c2ID] },
			status: 'active',
		});
		if (!war) return this.errorReply(`No active war found between '${c1ID}' and '${c2ID}'.`);

		try {
			await ClanWars.updateOne(
				{ _id: war._id },
				{ $set: { scores: { [c1ID]: score1, [c2ID]: score2 } } }
			);

			const updatedWar = await ClanWars.findOne({ _id: war._id });
			if (!updatedWar) return this.errorReply("Failed to fetch war data after update.");

			// Score adjustments are not logged — low audit value

			const uhtmlId = getWarUhtmlId(updatedWar._id);
			const lastBattle = {
				winnerName: "Admin",
				loserName: user.name,
				winningClanName: `Score manually set to ${score1} - ${score2}`,
			};

			broadcastWarUpdate(updatedWar, clan1, clan2, uhtmlId, 'change', { lastBattle });
			this.sendReply(`War score updated. ${clan1.name}: ${score1}, ${clan2.name}: ${score2}.`);
		} catch (e) {
			this.errorReply("An error occurred while setting the score.");
			Monitor.crashlog(e as Error, "Clan war setscore command", { c1ID, c2ID, warId: war._id });
		}
	},

	async setbestof(target, room, user) {
		this.checkChat();
		this.checkCan('roomowner');

		const [clan1IdRaw, clan2IdRaw, bestOfStr] = target.split(',').map(s => s.trim());
		const newBestOf = parseInt(bestOfStr);
		const c1ID = toID(clan1IdRaw);
		const c2ID = toID(clan2IdRaw);

		if (!c1ID || !c2ID) {
			return this.errorReply("Usage: /clan war setbestof [clan1id], [clan2id], [newbestof]");
		}
		if (!validateBestOf(newBestOf, this)) return;

		const [clan1, clan2] = await Promise.all([
			getClanById(c1ID, this),
			getClanById(c2ID, this),
		]);
		if (!clan1 || !clan2) return;

		const war = await ClanWars.findOne({
			clans: { $all: [c1ID, c2ID] },
			status: 'active',
		});
		if (!war) return this.errorReply(`No active war found between '${c1ID}' and '${c2ID}'.`);

		try {
			await ClanWars.updateOne(
				{ _id: war._id },
				{ $set: { bestOf: newBestOf } }
			);

			const updatedWar = await ClanWars.findOne({ _id: war._id });
			if (!updatedWar) return this.errorReply("Failed to fetch war data after update.");

			// Best of changes are not logged — low audit value

			const uhtmlId = getWarUhtmlId(updatedWar._id);
			const lastBattle = {
				winnerName: "Admin",
				loserName: user.name,
				winningClanName: `Format changed to Best of ${newBestOf}`,
			};

			broadcastWarUpdate(updatedWar, clan1, clan2, uhtmlId, 'change', { lastBattle });
			this.sendReply(`War 'Best of' updated to ${newBestOf} for the war between ${clan1.name} and ${clan2.name}.`);
		} catch (e) {
			this.errorReply("An error occurred while setting the best of.");
			Monitor.crashlog(e as Error, "Clan war setbestof command", { c1ID, c2ID, warId: war._id });
		}
	},

	async forcepause(target, room, user) {
		this.checkChat();
		this.checkCan('roomowner');

		const clanId = toID(target);
		if (!clanId) return this.errorReply("Usage: /clan war forcepause [clanid]");

		const war = await ClanWars.findOne({ clans: clanId, status: 'active' });
		if (!war) return this.errorReply(`No active war found for clan '${clanId}'.`);
		if (war.paused) return this.errorReply("This war is already paused.");

		try {
			await ClanWars.updateOne(
				{ _id: war._id },
				{ $set: { paused: true }, $unset: { pauseConfirmations: 1, resumeConfirmations: 1 } }
			);

			const clans = await resolveWarClans(war);
			if (!clans) return this.errorReply("A clan was deleted.");

			const [clan1, clan2] = clans;

			const updatedWar = await ClanWars.findOne({ _id: war._id });
			if (!updatedWar) return this.errorReply("Failed to fetch war data after update.");

			// Force pauses are not logged — low audit value

			const uhtmlId = getWarUhtmlId(updatedWar._id);
			broadcastWarUpdate(updatedWar, clan1, clan2, uhtmlId, 'change');

			this.sendReply(`War between ${clan1.name} and ${clan2.name} has been paused.`);
		} catch (e) {
			this.errorReply("An error occurred while force pausing the war.");
			Monitor.crashlog(e as Error, "Clan war forcepause command", { clanId, warId: war._id });
		}
	},

	async forceresume(target, room, user) {
		this.checkChat();
		this.checkCan('roomowner');

		const clanId = toID(target);
		if (!clanId) return this.errorReply("Usage: /clan war forceresume [clanid]");

		const war = await ClanWars.findOne({ clans: clanId, status: 'active' });
		if (!war) return this.errorReply(`No active war found for clan '${clanId}'.`);
		if (!war.paused) return this.errorReply("This war is not paused.");

		try {
			await ClanWars.updateOne(
				{ _id: war._id },
				{ $set: { paused: false }, $unset: { pauseConfirmations: 1, resumeConfirmations: 1 } }
			);

			const clans = await resolveWarClans(war);
			if (!clans) return this.errorReply("A clan was deleted.");

			const [clan1, clan2] = clans;

			const updatedWar = await ClanWars.findOne({ _id: war._id });
			if (!updatedWar) return this.errorReply("Failed to fetch war data after update.");

			// Force resumes are not logged — low audit value

			const uhtmlId = getWarUhtmlId(updatedWar._id);
			broadcastWarUpdate(updatedWar, clan1, clan2, uhtmlId, 'change');

			this.sendReply(`War between ${clan1.name} and ${clan2.name} has been resumed.`);
		} catch (e) {
			this.errorReply("An error occurred while force resuming the war.");
			Monitor.crashlog(e as Error, "Clan war forceresume command", { clanId, warId: war._id });
		}
	},

	async clearpending(target, room, user) {
		this.checkChat();
		this.checkCan('roomowner');

		const [clan1IdRaw, clan2IdRaw] = target.split(',').map(s => toID(s.trim()));
		if (!clan1IdRaw || !clan2IdRaw) {
			return this.errorReply("Usage: /clan war clearpending [clan1id], [clan2id]");
		}

		const war = await ClanWars.findOne({
			clans: { $all: [clan1IdRaw, clan2IdRaw] },
			status: 'pending',
		});
		if (!war) return this.errorReply(`No pending war found between '${clan1IdRaw}' and '${clan2IdRaw}'.`);

		try {
			await ClanWars.deleteOne({ _id: war._id });

			// Pending clears are not logged — low audit value

			const uhtmlId = getWarUhtmlId(war._id);
			const clearedHtml = `<div class="infobox">This challenge has been cleared by an admin.</div>`;

			const [clan1, clan2] = await Promise.all([
				Clans.findOne({ _id: war.clans[0] }),
				Clans.findOne({ _id: war.clans[1] }),
			]);

			if (clan1) {
				const room1 = Rooms.get(clan1.chatRoom);
				if (room1) room1.add(`|uhtmlchange|${uhtmlId}|${clearedHtml}`).update();
			}
			if (clan2) {
				const room2 = Rooms.get(clan2.chatRoom);
				if (room2) room2.add(`|uhtmlchange|${uhtmlId}|${clearedHtml}`).update();
			}

			this.sendReply(`Deleted pending war challenge between '${clan1IdRaw}' and '${clan2IdRaw}'.`);
		} catch (e) {
			this.errorReply("An error occurred while clearing the pending war.");
			Monitor.crashlog(e as Error, "Clan war clearpending command", { clan1IdRaw, clan2IdRaw });
		}
	},

	async forcecreate(target, room, user) {
		this.checkChat();
		this.checkCan('roomowner');

		const [clan1IdRaw, clan2IdRaw, bestOfStr] = target.split(',').map(s => s.trim());
		const newBestOf = parseInt(bestOfStr);
		const c1ID = toID(clan1IdRaw);
		const c2ID = toID(clan2IdRaw);

		if (!c1ID || !c2ID) {
			return this.errorReply("Usage: /clan war forcecreate [clan1id], [clan2id], [bestof]");
		}
		if (!validateBestOf(newBestOf, this)) return;
		if (c1ID === c2ID) return this.errorReply("Clans must be different.");

		const [clan1, clan2] = await Promise.all([
			getClanById(c1ID, this),
			getClanById(c2ID, this),
		]);
		if (!clan1 || !clan2) return;

		const [clan1ExistingWar, clan2ExistingWar] = await Promise.all([
			ClanWars.findOne({ clans: c1ID, status: { $in: ['pending', 'active'] } }),
			ClanWars.findOne({ clans: c2ID, status: { $in: ['pending', 'active'] } }),
		]);

		if (clan1ExistingWar) return this.errorReply(`${clan1.name} is already in a war.`);
		if (clan2ExistingWar) return this.errorReply(`${clan2.name} is already in a war.`);

		const newWar: Omit<ClanWar, '_id'> = {
			clans: [c1ID, c2ID],
			scores: { [c1ID]: 0, [c2ID]: 0 },
			status: 'active',
			startDate: Date.now(),
			bestOf: newBestOf,
		};

		try {
			const insertResult = await ClanWars.insertOne(newWar as ClanWarDoc);
			const warId = insertResult.insertedId;
			if (!warId) return this.errorReply("There was an error creating the war document. Aborting.");

			const war = await ClanWars.findOne({ _id: warId });
			if (!war) return this.errorReply("Failed to fetch the newly created war. Aborting.");

			// Force creates are not logged — outcome events are what matter

			const uhtmlId = getWarUhtmlId(war._id);
			const lastBattle = {
				winnerName: "Admin",
				loserName: user.name,
				winningClanName: "War forcibly started",
			};

			broadcastWarUpdate(war, clan1, clan2, uhtmlId, 'new', { lastBattle });
			this.sendReply(`Force-started an active war between ${clan1.name} and ${clan2.name}.`);
		} catch (e) {
			this.errorReply("An error occurred while force creating the war.");
			Monitor.crashlog(e as Error, "Clan war forcecreate command", { c1ID, c2ID });
		}
	},
};
},
};

};
},
};
