import { Clans, ClanWars, type ClanWarDoc } from '../database';
import { log } from '../utils';
import { calculateElo, safeElo } from '../helpers/elo';
import { broadcastWarUpdate, broadcastWarEnded, getWarUhtmlId } from '../helpers/broadcast';
import {
	getWarPermissionContext,
	getFullWarContext,
	validateBestOf,
	assertNoExistingWar,
	assertWarNotPaused,
	assertWarIsPaused,
	resolveWarClans,
} from './war-context';
import type { ClanWar } from '../interface';
import { WAR_CHALLENGE_COOLDOWN_MS } from '../constants';

export const playerWarCommands: Chat.ChatCommands = {

	async challenge(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in.");

		const warCtx = await getWarPermissionContext(user.id, this);
		if (!warCtx) return;

		const { myClan, myClanId } = warCtx;

		const [targetClanId, bestOfStr] = target.split(',').map(s => s.trim());
		const bestOf = parseInt(bestOfStr);
		const opponentClanId = toID(targetClanId);

		if (!opponentClanId) return this.errorReply("Specify a clan ID to challenge.");
		if (!validateBestOf(bestOf, this)) return;
		if (opponentClanId === myClanId) return this.errorReply("You cannot challenge your own clan.");

		const targetClan = await Clans.findOne({ _id: opponentClanId });
		if (!targetClan) return this.errorReply(`Clan '${opponentClanId}' not found.`);

		const lastChallenge = myClan.stats.lastWarChallenge || 0;
		const timeSinceLastChallenge = Date.now() - lastChallenge;
		if (timeSinceLastChallenge < WAR_CHALLENGE_COOLDOWN_MS) {
			const hoursRemaining = Math.ceil((WAR_CHALLENGE_COOLDOWN_MS - timeSinceLastChallenge) / (60 * 60 * 1000));
			return this.errorReply(`Your clan must wait ${hoursRemaining} more hour(s) before challenging another clan. (24 hour cooldown)`);
		}

		if (!await assertNoExistingWar(myClanId, myClan.name, this)) return;
		if (!await assertNoExistingWar(opponentClanId, targetClan.name, this)) return;

		const newWar: Omit<ClanWar, '_id'> = {
			clans: [myClanId, opponentClanId],
			scores: { [myClanId]: 0, [opponentClanId]: 0 },
			status: 'pending',
			startDate: Date.now(),
			bestOf,
		};

		try {
			const insertResult = await ClanWars.insertOne(newWar as ClanWarDoc);
			const warId = insertResult.insertedId;
			if (!warId) return this.errorReply("There was an error creating the war document. Aborting.");

			await Clans.updateOne(
				{ _id: myClanId },
				{ $set: { 'stats.lastWarChallenge': Date.now() } }
			);

			const war = await ClanWars.findOne({ _id: warId });
			if (!war) return this.errorReply("Failed to fetch the newly created war. Aborting.");

			// Challenges are not logged — outcome events (win/loss/tie/forfeit) are what matter

			const uhtmlId = getWarUhtmlId(war._id);
			broadcastWarUpdate(war, myClan, targetClan, uhtmlId, 'new');

			this.sendReply(`You have challenged ${targetClan.name} to a Best of ${bestOf} War!`);
		} catch (e) {
			this.errorReply("An error occurred while sending the challenge. Please try again.");
			Monitor.crashlog(e as Error, "Clan war challenge command", { myClanId, opponentClanId });
		}
	},

	async accept(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in.");

		const warCtx = await getWarPermissionContext(user.id, this);
		if (!warCtx) return;

		const { myClan, myClanId } = warCtx;

		const challengerClanId = toID(target);
		if (!challengerClanId) return this.errorReply("Specify a clan ID to accept a challenge from.");

		const war = await ClanWars.findOne({
			clans: [challengerClanId, myClanId],
			status: 'pending',
		});
		if (!war) return this.errorReply(`You do not have a pending war challenge from '${challengerClanId}'.`);

		if (!await assertNoExistingWar(myClanId, myClan.name, this)) return;

		const challengerClan = await Clans.findOne({ _id: challengerClanId });
		if (!challengerClan) return this.errorReply(`Clan '${challengerClanId}' not found.`);

		if (!await assertNoExistingWar(challengerClanId, challengerClan.name, this)) return;

		try {
			await ClanWars.updateOne(
				{ _id: war._id },
				{ $set: { status: 'active', startDate: Date.now() } }
			);

			const updatedWar = await ClanWars.findOne({ _id: war._id });
			if (!updatedWar) return this.errorReply("Failed to fetch updated war data.");

			// Accepts are not logged — outcome events are what matter

			const uhtmlId = getWarUhtmlId(updatedWar._id);
			broadcastWarUpdate(updatedWar, challengerClan, myClan, uhtmlId, 'change');

			this.sendReply(`You have accepted the war challenge from ${challengerClan.name}!`);
		} catch (e) {
			this.errorReply("An error occurred while accepting the challenge. Please try again.");
			Monitor.crashlog(e as Error, "Clan war accept command", { myClanId, challengerClanId });
		}
	},

	async deny(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in.");

		const warCtx = await getWarPermissionContext(user.id, this);
		if (!warCtx) return;

		const { myClan, myClanId } = warCtx;

		const challengerClanId = toID(target);
		if (!challengerClanId) return this.errorReply("Specify a clan ID to deny.");

		const war = await ClanWars.findOne({
			clans: { $all: [challengerClanId, myClanId] },
			status: 'pending',
		});
		if (!war) return this.errorReply(`No pending challenge found between your clan and '${challengerClanId}'.`);

		const challengerClan = await Clans.findOne({ _id: challengerClanId });
		if (!challengerClan) return this.errorReply("Challenging clan not found.");

		try {
			await ClanWars.deleteOne({ _id: war._id });
			await Clans.updateOne(
				{ _id: challengerClanId },
				{ $set: { 'stats.lastWarChallenge': 0 } }
			);

			// Denies are not logged — outcome events are what matter

			const uhtmlId = getWarUhtmlId(war._id);
			const endMessage = `${myClan.name} has refused the war challenge from ${challengerClan.name}.`;
			broadcastWarEnded(war, challengerClan, myClan, uhtmlId, endMessage);

			this.sendReply(`You have declined the war challenge from ${challengerClan.name}.`);
		} catch (e) {
			this.errorReply("An error occurred while declining the challenge. Please try again.");
			Monitor.crashlog(e as Error, "Clan war deny command", { myClanId, challengerClanId });
		}
	},

	async cancel(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in.");

		const warCtx = await getWarPermissionContext(user.id, this);
		if (!warCtx) return;

		const { myClan, myClanId } = warCtx;

		const targetClanId = toID(target);
		if (!targetClanId) return this.errorReply("Specify the clan ID. Usage: /clan war cancel [clanid]");

		const war = await ClanWars.findOne({
			clans: { $all: [myClanId, targetClanId] },
			status: 'pending',
		});
		if (!war) return this.errorReply(`No pending war challenge found with '${targetClanId}'.`);

		if (war.clans[0] !== myClanId) {
			return this.errorReply("Only the challenging clan can cancel a pending war.");
		}

		const targetClan = await Clans.findOne({ _id: targetClanId });
		if (!targetClan) return this.errorReply(`Clan '${targetClanId}' not found.`);

		try {
			await ClanWars.deleteOne({ _id: war._id });
			await Clans.updateOne(
				{ _id: myClanId },
				{ $set: { 'stats.lastWarChallenge': 0 } }
			);

			// Cancels are not logged — outcome events are what matter

			const uhtmlId = getWarUhtmlId(war._id);
			const endMessage = `${myClan.name} has withdrawn their war challenge to ${targetClan.name}.`;
			broadcastWarEnded(war, myClan, targetClan, uhtmlId, endMessage);

			this.sendReply(`You have withdrawn your war challenge to ${targetClan.name}.`);
		} catch (e) {
			this.errorReply("An error occurred while cancelling the challenge. Please try again.");
			Monitor.crashlog(e as Error, "Clan war cancel command", { myClanId, targetClanId });
		}
	},

	async rematch(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in.");

		const warCtx = await getWarPermissionContext(user.id, this);
		if (!warCtx) return;

		const { myClan, myClanId } = warCtx;

		const [targetClanId, bestOfStr] = target.split(',').map(s => s.trim());
		const bestOf = parseInt(bestOfStr);
		const opponentClanId = toID(targetClanId);

		if (!opponentClanId) return this.errorReply("Specify a clan ID. Usage: /clan war rematch [clanid], [bestof]");
		if (!validateBestOf(bestOf, this)) return;
		if (opponentClanId === myClanId) return this.errorReply("You cannot challenge your own clan.");

		const targetClan = await Clans.findOne({ _id: opponentClanId });
		if (!targetClan) return this.errorReply(`Clan '${opponentClanId}' not found.`);

		const previousWar = await ClanWars.findOne({
			clans: { $all: [myClanId, opponentClanId] },
			status: 'completed',
		});
		if (!previousWar) {
			return this.errorReply(`You have no war history with ${targetClan.name}. Use /clan war challenge instead.`);
		}

		if (!await assertNoExistingWar(myClanId, myClan.name, this)) return;
		if (!await assertNoExistingWar(opponentClanId, targetClan.name, this)) return;

		const newWar: Omit<ClanWar, '_id'> = {
			clans: [myClanId, opponentClanId],
			scores: { [myClanId]: 0, [opponentClanId]: 0 },
			status: 'pending',
			startDate: Date.now(),
			bestOf,
		};

		try {
			const insertResult = await ClanWars.insertOne(newWar as ClanWarDoc);
			const warId = insertResult.insertedId;
			if (!warId) return this.errorReply("There was an error creating the war document. Aborting.");

			await Clans.updateOne(
				{ _id: myClanId },
				{ $set: { 'stats.lastWarChallenge': Date.now() } }
			);

			const war = await ClanWars.findOne({ _id: warId });
			if (!war) return this.errorReply("Failed to fetch the newly created war. Aborting.");

			// Rematches are not logged — outcome events are what matter

			const uhtmlId = getWarUhtmlId(war._id);
			broadcastWarUpdate(war, myClan, targetClan, uhtmlId, 'new');

			this.sendReply(`You have challenged ${targetClan.name} to a rematch (Best of ${bestOf})!`);
		} catch (e) {
			this.errorReply("An error occurred while sending the rematch. Please try again.");
			Monitor.crashlog(e as Error, "Clan war rematch command", { myClanId, opponentClanId });
		}
	},

	async forfeit(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in.");

		const warCtx = await getWarPermissionContext(user.id, this);
		if (!warCtx) return;

		const { myClan, myClanId } = warCtx;

		const winnerClanId = toID(target);
		if (!winnerClanId) return this.errorReply("Specify the opponent clan ID. Usage: /clan war forfeit [clanid]");

		const war = await ClanWars.findOne({
			clans: { $all: [winnerClanId, myClanId] },
			status: 'active',
		});
		if (!war) return this.errorReply(`No active war found with '${winnerClanId}'.`);

		const winnerClan = await Clans.findOne({ _id: winnerClanId });
		if (!winnerClan) return this.errorReply(`Opponent clan '${winnerClanId}' not found.`);

		const winnerOldElo = safeElo(winnerClan.stats.elo);
		const loserOldElo = safeElo(myClan.stats.elo);
		const [newWinnerElo, newLoserElo, eloChange] = calculateElo(winnerOldElo, loserOldElo);

		try {
			await Promise.all([
				Clans.updateOne(
					{ _id: winnerClanId },
					{ $set: { 'stats.elo': newWinnerElo }, $inc: { 'stats.clanBattleWins': 1 } }
				),
				Clans.updateOne(
					{ _id: myClanId },
					{ $set: { 'stats.elo': newLoserElo }, $inc: { 'stats.clanBattleLosses': 1 } }
				),
				ClanWars.updateOne(
					{ _id: war._id },
					{ $set: { status: 'completed', endDate: Date.now() } }
				),
			]);

			await Promise.all([
				log(myClanId, 'WAR_FORFEIT', `${user.id} forfeited to ${winnerClanId} (-${eloChange} ELO)`),
				log(winnerClanId, 'WAR_WIN', `${user.id} forced ${myClanId} to forfeit (+${eloChange} ELO)`),
			]);

			const clans = await resolveWarClans(war);
			if (!clans) return this.errorReply("Could not find clan data for war card update.");

			const [clan1, clan2] = clans;
			war.status = 'completed';

			const uhtmlId = getWarUhtmlId(war._id);
			const endMessage = `${myClan.name} has forfeited the war to ${winnerClan.name}. ELO Change: ${eloChange}`;
			broadcastWarEnded(war, clan1, clan2, uhtmlId, endMessage);

			this.sendReply(`You have forfeited the war against ${winnerClan.name}. Your clan lost ${eloChange} ELO.`);
		} catch (e) {
			this.errorReply("An error occurred while forfeiting the war. Please try again.");
			Monitor.crashlog(e as Error, "Clan war forfeit command", { myClanId, winnerClanId, warId: war._id });
		}
	},

	async tie(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in.");

		const warCtx = await getWarPermissionContext(user.id, this);
		if (!warCtx) return;

		const { myClan, myClanId } = warCtx;

		const opponentClanId = toID(target);
		if (!opponentClanId) return this.errorReply("Specify the opponent clan ID. Usage: /clan war tie [clanid]");

		const fullCtx = await getFullWarContext(myClan, myClanId, opponentClanId, this);
		if (!fullCtx) return;

		const { war, clan1, clan2, uhtmlId, opponentClan } = fullCtx;

		const tieConfirmations = war.tieConfirmations || [];
		if (tieConfirmations.includes(myClanId)) {
			return this.errorReply(`Your clan has already confirmed the tie with ${opponentClan.name}.`);
		}

		try {
			await ClanWars.updateOne(
				{ _id: war._id },
				{ $addToSet: { tieConfirmations: myClanId } }
			);

			const updatedWar = await ClanWars.findOne({ _id: war._id });
			if (!updatedWar) return this.errorReply("Failed to fetch war data after update.");

			const confirmations = updatedWar.tieConfirmations || [];

			if (confirmations.length === 2) {
				await ClanWars.updateOne(
					{ _id: war._id },
					{ $set: { status: 'completed', endDate: Date.now() }, $unset: { tieConfirmations: 1 } }
				);

				const score1 = war.scores[clan1._id] || 0;
				const score2 = war.scores[clan2._id] || 0;

				await Promise.all([
					log(clan1._id, 'WAR_TIE', `drew against ${clan2._id} (${score1}-${score2})`),
					log(clan2._id, 'WAR_TIE', `drew against ${clan1._id} (${score2}-${score1})`),
				]);

				const endMessage = `The war between ${clan1.name} and ${clan2.name} has ended in a draw! Final Score: ${score1} - ${score2}`;
				updatedWar.status = 'completed';
				broadcastWarEnded(updatedWar, clan1, clan2, uhtmlId, endMessage);

				this.sendReply(`The war with ${opponentClan.name} has been concluded as a tie.`);
			} else {
				this.sendReply(`You have proposed ending the war as a tie. Waiting for ${opponentClan.name}'s decision...`);
				broadcastWarUpdate(updatedWar, clan1, clan2, uhtmlId, 'change');
			}
		} catch (e) {
			this.errorReply("An error occurred while proposing the tie. Please try again.");
			Monitor.crashlog(e as Error, "Clan war tie command", { myClanId, opponentClanId, warId: war._id });
		}
	},

	async extend(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in.");

		const warCtx = await getWarPermissionContext(user.id, this);
		if (!warCtx) return;

		const { myClan, myClanId } = warCtx;

		const [opponentClanIdRaw, newBestOfStr] = target.split(',').map(s => s.trim());
		const opponentClanId = toID(opponentClanIdRaw);
		const newBestOf = parseInt(newBestOfStr);

		if (!opponentClanId) return this.errorReply("Specify the opponent clan ID. Usage: /clan war extend [clanid], [newbestof]");
		if (!validateBestOf(newBestOf, this)) return;

		const fullCtx = await getFullWarContext(myClan, myClanId, opponentClanId, this);
		if (!fullCtx) return;

		const { war, opponentClan } = fullCtx;

		if (newBestOf <= war.bestOf) {
			return this.errorReply(`New best of (${newBestOf}) must be greater than current best of (${war.bestOf}).`);
		}

		const extendConfirmations = war.extendConfirmations || [];
		const alreadyConfirmed = extendConfirmations.some(
			(conf: any) => conf.clanId === myClanId && conf.newBestOf === newBestOf
		);
		if (alreadyConfirmed) {
			return this.errorReply(`Your clan has already confirmed extending to Best of ${newBestOf}.`);
		}

		try {
			await ClanWars.updateOne(
				{ _id: war._id },
				{ $push: { extendConfirmations: { clanId: myClanId, newBestOf } } }
			);

			const updatedWar = await ClanWars.findOne({ _id: war._id });
			const confirmations = updatedWar?.extendConfirmations || [];
			const matchingConfirmations = confirmations.filter((conf: any) => conf.newBestOf === newBestOf);

			if (matchingConfirmations.length === 2) {
				await ClanWars.updateOne(
					{ _id: war._id },
					{ $set: { bestOf: newBestOf }, $unset: { extendConfirmations: 1 } }
				);

				// Extensions are not logged — outcome events are what matter

				const winsNeeded = Math.ceil(newBestOf / 2);
				const message = `|html|<div class="broadcast-blue"><center>` +
					`<strong>WAR EXTENDED!</strong><br />` +
					`Both clans agreed to extend the war!<br />` +
					`<strong>New Format:</strong> Best of ${newBestOf} (First to ${winsNeeded} wins)` +
					`</center></div>`;

				const room1 = Rooms.get(myClan.chatRoom);
				const room2 = Rooms.get(opponentClan.chatRoom);
				if (room1) room1.add(message).update();
				if (room2) room2.add(message).update();

				this.sendReply(`The war has been extended to Best of ${newBestOf}.`);
			} else {
				this.sendReply(`You have proposed extending the war to Best of ${newBestOf}. Waiting for ${opponentClan.name} to decide...`);

				const newWinsNeeded = Math.ceil(newBestOf / 2);
				const opponentRoom = Rooms.get(opponentClan.chatRoom);
				if (opponentRoom) {
					opponentRoom.add(
						`|html|<div class="broadcast-blue"><center>` +
						`<strong>EXTENSION PROPOSAL</strong><br />` +
						`<strong>${myClan.name}</strong> wants to extend the war!<br />` +
						`<strong>New Format:</strong> Best of ${newBestOf} (First to ${newWinsNeeded} wins)<br /><br />` +
						`Use <strong>/clan war extend ${myClanId}, ${newBestOf}</strong> to accept.` +
						`</center></div>`
					).update();
				}
			}
		} catch (e) {
			this.errorReply("An error occurred while proposing the extension. Please try again.");
			Monitor.crashlog(e as Error, "Clan war extend command", { myClanId, opponentClanId, warId: war._id });
		}
	},

	async pause(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in.");

		const warCtx = await getWarPermissionContext(user.id, this);
		if (!warCtx) return;

		const { myClan, myClanId } = warCtx;

		const opponentClanId = toID(target);
		if (!opponentClanId) return this.errorReply("Specify the opponent clan ID. Usage: /clan war pause [clanid]");

		const fullCtx = await getFullWarContext(myClan, myClanId, opponentClanId, this);
		if (!fullCtx) return;

		const { war, clan1, clan2, uhtmlId, opponentClan } = fullCtx;

		if (!assertWarNotPaused(war, this)) return;

		const pauseConfirmations = war.pauseConfirmations || [];
		if (pauseConfirmations.includes(myClanId)) {
			return this.errorReply(`Your clan has already confirmed pausing the war.`);
		}

		try {
			await ClanWars.updateOne(
				{ _id: war._id },
				{ $addToSet: { pauseConfirmations: myClanId } }
			);

			const updatedWar = await ClanWars.findOne({ _id: war._id });
			if (!updatedWar) return this.errorReply("Failed to fetch war data after update.");

			const confirmations = updatedWar.pauseConfirmations || [];

			if (confirmations.length === 2) {
				await ClanWars.updateOne(
					{ _id: war._id },
					{ $set: { paused: true }, $unset: { pauseConfirmations: 1 } }
				);

				const finalWar = await ClanWars.findOne({ _id: war._id });
				if (!finalWar) return this.errorReply("Failed to fetch final war data.");

				broadcastWarUpdate(finalWar, clan1, clan2, uhtmlId, 'change');
				this.sendReply(`The war has been paused.`);
			} else {
				broadcastWarUpdate(updatedWar, clan1, clan2, uhtmlId, 'change');
				this.sendReply(`You have proposed pausing the war. Waiting for ${opponentClan.name} to agree...`);
			}
		} catch (e) {
			this.errorReply("An error occurred while pausing the war. Please try again.");
			Monitor.crashlog(e as Error, "Clan war pause command", { myClanId, opponentClanId, warId: war._id });
		}
	},

	async resume(target, room, user) {
		this.checkChat();
		if (!user.named) return this.errorReply("You must be logged in.");

		const warCtx = await getWarPermissionContext(user.id, this);
		if (!warCtx) return;

		const { myClan, myClanId } = warCtx;

		const opponentClanId = toID(target);
		if (!opponentClanId) return this.errorReply("Specify the opponent clan ID. Usage: /clan war resume [clanid]");

		const fullCtx = await getFullWarContext(myClan, myClanId, opponentClanId, this);
		if (!fullCtx) return;

		const { war, clan1, clan2, uhtmlId, opponentClan } = fullCtx;

		if (!assertWarIsPaused(war, this)) return;

		const resumeConfirmations = war.resumeConfirmations || [];
		if (resumeConfirmations.includes(myClanId)) {
			return this.errorReply(`Your clan has already confirmed resuming the war.`);
		}

		try {
			await ClanWars.updateOne(
				{ _id: war._id },
				{ $addToSet: { resumeConfirmations: myClanId } }
			);

			const updatedWar = await ClanWars.findOne({ _id: war._id });
			if (!updatedWar) return this.errorReply("Failed to fetch war data after update.");

			const confirmations = updatedWar.resumeConfirmations || [];

			if (confirmations.length === 2) {
				await ClanWars.updateOne(
					{ _id: war._id },
					{ $set: { paused: false }, $unset: { resumeConfirmations: 1 } }
				);

				const finalWar = await ClanWars.findOne({ _id: war._id });
				if (!finalWar) return this.errorReply("Failed to fetch final war data.");

				broadcastWarUpdate(finalWar, clan1, clan2, uhtmlId, 'change');
				this.sendReply(`The war has been resumed.`);
			} else {
				broadcastWarUpdate(updatedWar, clan1, clan2, uhtmlId, 'change');
				this.sendReply(`You have confirmed resuming the war. Waiting for ${opponentClan.name} to agree...`);
			}
		} catch (e) {
			this.errorReply("An error occurred while resuming the war. Please try again.");
			Monitor.crashlog(e as Error, "Clan war resume command", { myClanId, opponentClanId, warId: war._id });
		}
	},
};
