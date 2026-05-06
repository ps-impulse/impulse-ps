import { Clans, ClanWars, ClanLogs, ClanBattleLogs, UserClans } from './database';
import { getClanById, assertClanMember, log, toDurationString, displayElo, getExpectedScore, safeElo, calculateElo, 
		  generateWarCard, generateWarStats, generateHeadToHeadRecord, broadcastWarUpdate, broadcastWarEnded, 
		  getWarUhtmlId, broadcastClanMessage, to, getClanContext, getExistingWar, hasMinRole } from './utils';
import { MIN_BEST_OF, MAX_BEST_OF, WAR_CHALLENGE_COOLDOWN_MS, LOBBY_ROOM_ID, ROOM_RANK_LEADER, ROOM_RANK_OFFICER, ROOM_RANK_MEMBER } from './constants';
import { DEFAULT_LOG_LIMIT, DEFAULT_PAGE_SIZE } from './constants';
import { Utils } from '../../../lib';
import { Table } from '../../impulse-utils';
import type { ClanWar, ClanBattleLogEntry, ClanRole } from './interface';

export interface WarCommandContext {
	myClan: ClanDoc;
	myClanId: ID;
}

export interface FullWarContext extends WarCommandContext {
	war: ClanWar;
	clan1: ClanDoc;
	clan2: ClanDoc;
	uhtmlId: string;
	opponentClan: ClanDoc;
	opponentClanId: ID;
}

export async function getWarPermissionContext(
	userId: ID,
	context: Chat.CommandContext
): Promise<WarCommandContext | null> {
	const clanCtx = await getClanContext(userId, context);
	if (!clanCtx) return null;

	const { clan, clanId } = clanCtx;

	if (!hasMinRole(clan, userId, 'leader')) {
		context.errorReply("You must be at least a Leader to manage wars.");
		return null;
	}

	return { myClan: clan, myClanId: clanId };
}

export async function getFullWarContext(
	myClan: ClanDoc,
	myClanId: ID,
	opponentClanId: ID,
	context: Chat.CommandContext
): Promise<FullWarContext | null> {
	const war = await ClanWars.findOne({
		clans: { $all: [myClanId, opponentClanId] },
		status: 'active',
	});

	if (!war) {
		context.errorReply(`No active war found with '${opponentClanId}'.`);
		return null;
	}

	const opponentClan = await Clans.findOne({ _id: opponentClanId });
	if (!opponentClan) {
		context.errorReply(`Clan '${opponentClanId}' not found.`);
		return null;
	}

	const [clan1, clan2] = await Promise.all([
		Clans.findOne({ _id: war.clans[0] }),
		Clans.findOne({ _id: war.clans[1] }),
	]);

	if (!clan1 || !clan2) {
		context.errorReply("Error: One or both clans in this war no longer exist.");
		return null;
	}

	const uhtmlId = `clan-war-card-${war._id}`;

	return {
		myClan,
		myClanId,
		war,
		clan1,
		clan2,
		uhtmlId,
		opponentClan,
		opponentClanId,
	};
}

export function validateBestOf(
	bestOf: number,
	context: Chat.CommandContext
): boolean {
	if (isNaN(bestOf) || bestOf < MIN_BEST_OF) {
		context.errorReply(`'Best of' must be a positive odd number (e.g. 3, 5, 7).`);
		return false;
	}
	if (bestOf % 2 === 0) {
		context.errorReply(`'Best of' must be an odd number (3, 5, 7, etc.).`);
		return false;
	}
	if (bestOf > MAX_BEST_OF) {
		context.errorReply(`'Best of' cannot be higher than ${MAX_BEST_OF}.`);
		return false;
	}
	return true;
}

export async function assertNoExistingWar(
	clanId: ID,
	clanName: string,
	context: Chat.CommandContext
): Promise<boolean> {
	const existingWar = await getExistingWar(clanId);
	if (!existingWar) return true;

	const opponentId = existingWar.clans[0] === clanId
		? existingWar.clans[1]
		: existingWar.clans[0];
	const opponent = await Clans.findOne({ _id: opponentId });

	context.errorReply(
		`${clanName} is already in a ${existingWar.status} war with ${opponent?.name || opponentId}.`
	);
	return false;
}

export function assertWarNotPaused(
	war: ClanWar,
	context: Chat.CommandContext
): boolean {
	if (war.paused) {
		context.errorReply("This war is currently paused. Resume it before taking this action.");
		return false;
	}
	return true;
}

export function assertWarIsPaused(
	war: ClanWar,
	context: Chat.CommandContext
): boolean {
	if (!war.paused) {
		context.errorReply("This war is not currently paused.");
		return false;
	}
	return true;
}

export async function resolveWarClans(
	war: ClanWar
): Promise<[ClanDoc, ClanDoc] | null> {
	const [clan1, clan2] = await Promise.all([
		Clans.findOne({ _id: war.clans[0] }),
		Clans.findOne({ _id: war.clans[1] }),
	]);

	if (!clan1 || !clan2) return null;
	return [clan1, clan2];
}


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
			]);

			await Promise.all([
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


export const infoWarCommands: Chat.ChatCommands = {

	async status(target, room, user) {
		this.runBroadcast();
		this.checkChat();

		let clanId: ID;
		if (target) {
			clanId = toID(target);
		} else {
			const userClanInfo = await UserClans.findOne({ _id: user.id });
			if (!userClanInfo?.memberOf) {
				return this.errorReply("You are not in a clan. Specify a clan ID (e.g., /clan war status [clanid]).");
			}
			clanId = userClanInfo.memberOf;
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		const wars = await ClanWars.find(
			{ clans: clanId, status: { $in: ['pending', 'active'] } },
			{ limit: DEFAULT_LOG_LIMIT, sort: { startDate: -1 } }
		);

		if (!wars.length) {
			return this.sendReplyBox(`${clan.name} has no pending or active wars.`);
		}

		const opponentIds = wars.map(war =>
			war.clans[0] === clanId ? war.clans[1] : war.clans[0]
		);
		const opponentClans = await Clans.find({ _id: { $in: opponentIds } });
		const opponentMap = new Map(opponentClans.map(c => [c._id, c]));

		const headerRow = ['Opponent', 'Status', 'Score (Us - Them)', 'Format', 'Started'];
		const dataRows: string[][] = [];
		const title = `${clan.name} War Status`;

		for (const war of wars) {
			const opponentId = war.clans[0] === clanId ? war.clans[1] : war.clans[0];
			const opponentClan = opponentMap.get(opponentId);
			const myScore = war.scores[clanId] || 0;
			const opponentScore = war.scores[opponentId] || 0;

			dataRows.push([
				opponentClan?.name || opponentId,
				war.status === 'active'
					? `<strong style="color:green;">Active${war.paused ? ' (Paused)' : ''}</strong>`
					: `<em style="color:gray;">Pending</em>`,
				`<strong>${myScore} - ${opponentScore}</strong>`,
				`Best of ${war.bestOf}`,
				to(new Date(war.startDate), { date: true }),
			]);
		}

		const output = Table(title, headerRow, dataRows);
		this.sendReply(`|html|${output}`);
	},

	'': 'status',

	async ladder(target, room, user) {
		this.runBroadcast();
		this.checkChat();

		const [pageStr, sortBy] = target.split(',').map(s => s.trim());
		const page = parseInt(pageStr) || 1;
		const limit = DEFAULT_PAGE_SIZE;
		const skip = (page - 1) * limit;

		const sortType = toID(sortBy);

		let sortField: string;
		let headerName: string;

		switch (sortType) {
		case 'wins':
			sortField = 'stats.clanBattleWins';
			headerName = 'Wins';
			break;
		case 'losses':
			sortField = 'stats.clanBattleLosses';
			headerName = 'Losses';
			break;
		case 'winrate':
			sortField = 'stats.clanBattleWins';
			headerName = 'Win Rate';
			break;
		case 'elo':
		default:
			sortField = 'stats.elo';
			headerName = 'ELO';
			break;
		}

		const allClans = await Clans.find({}, { skip: 0, limit: 1000, sort: { [sortField]: -1 } });

		let warClans = allClans.filter(clan =>
			(clan.stats.clanBattleWins || 0) > 0 || (clan.stats.clanBattleLosses || 0) > 0
		);

		if (sortType === 'winrate') {
			warClans = warClans.sort((a, b) => {
				const aWins = a.stats.clanBattleWins || 0;
				const aTotal = aWins + (a.stats.clanBattleLosses || 0);
				const aRate = aTotal > 0 ? aWins / aTotal : 0;

				const bWins = b.stats.clanBattleWins || 0;
				const bTotal = bWins + (b.stats.clanBattleLosses || 0);
				const bRate = bTotal > 0 ? bWins / bTotal : 0;

				return bRate - aRate;
			});
		}

		const total = warClans.length;
		const totalPages = Math.ceil(total / limit);
		const paginatedClans = warClans.slice(skip, skip + limit);

		if (paginatedClans.length === 0) {
			return this.errorReply("No clans have participated in wars yet.");
		}

		const headerRow = ['Rank', 'Clan', 'ELO Rating', 'Battle Wins', 'Battle Losses', 'Win %'];
		const dataRows: string[][] = [];
		const title = `Clan War Ladder (Page ${page}/${totalPages}) - Sorted by ${headerName}`;

		paginatedClans.forEach((clan, i) => {
			const wins = clan.stats.clanBattleWins || 0;
			const losses = clan.stats.clanBattleLosses || 0;
			const totalBattles = wins + losses;
			const winrate = totalBattles > 0 ? ((wins / totalBattles) * 100).toFixed(1) : '0.0';

			dataRows.push([
				`<strong>#${skip + i + 1}</strong>`,
				clan.name,
				`<strong style="font-size: 1.1em;">${displayElo(clan.stats.elo)}</strong>`,
				wins.toString(),
				losses.toString(),
				`<strong>${winrate}%</strong>`,
			]);
		});

		let output = Table(title, headerRow, dataRows);

		const cmd = `/clan war ladder`;
		if (page > 1 || page < totalPages) {
			output += '<center>';
			if (page > 1) {
				output += `<button class="button" name="send" value="${cmd} ${page - 1}, ${sortType || 'elo'}">Previous</button> `;
			}
			if (page < totalPages) {
				output += `<button class="button" name="send" value="${cmd} ${page + 1}, ${sortType || 'elo'}">Next</button>`;
			}
			output += '</center>';
		}

		output += `<br /><center><small>Sort by: ` +
			`<button class="button" name="send" value="${cmd} 1, elo">ELO Rating</button> ` +
			`<button class="button" name="send" value="${cmd} 1, wins">Battle Wins</button> ` +
			`<button class="button" name="send" value="${cmd} 1, losses">Battle Losses</button> ` +
			`<button class="button" name="send" value="${cmd} 1, winrate">Win Rate</button>` +
			`</small></center>`;

		this.sendReply(`|html|${output}`);
	},

	async stats(target, room, user) {
		this.runBroadcast();
		this.checkChat();

		let clanId: ID;
		if (target) {
			clanId = toID(target);
		} else {
			const userClanInfo = await UserClans.findOne({ _id: user.id });
			if (!userClanInfo?.memberOf) {
				return this.errorReply("You are not in a clan. Specify a clan ID (e.g., /clan war stats [clanid]).");
			}
			clanId = userClanInfo.memberOf;
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		const [completedWars, activePendingWars, battleLogs] = await Promise.all([
			ClanWars.find({ clans: clanId, status: 'completed' }, {}),
			ClanWars.find({ clans: clanId, status: { $in: ['pending', 'active'] } }, {}),
			ClanBattleLogs.find(
				{ $or: [{ winningClan: clanId }, { losingClan: clanId }] },
				{}
			),
		]);

		const html = generateWarStats(clan, completedWars, activePendingWars, battleLogs);
		this.sendReply(`|html|${html}`);
	},

	async history(target, room, user) {
		this.runBroadcast();
		this.checkChat();

		let clanId: ID;
		if (target) {
			clanId = toID(target);
		} else {
			const userClanInfo = await UserClans.findOne({ _id: user.id });
			if (!userClanInfo?.memberOf) {
				return this.errorReply("You are not in a clan. Specify a clan ID (e.g., /clan war history [clanid]).");
			}
			clanId = userClanInfo.memberOf;
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		const wars = await ClanWars.find(
			{ clans: clanId, status: 'completed' },
			{ limit: DEFAULT_LOG_LIMIT, sort: { endDate: -1 } }
		);

		if (!wars.length) {
			return this.sendReplyBox(`${clan.name} has no completed war history.`);
		}

		const opponentIds = wars.map(war =>
			war.clans[0] === clanId ? war.clans[1] : war.clans[0]
		);
		const opponentClans = await Clans.find({ _id: { $in: opponentIds } });
		const opponentMap = new Map(opponentClans.map(c => [c._id, c]));

		const headerRow = ['Opponent', 'Result', 'Battle Score', 'Format', 'Date'];
		const dataRows: string[][] = [];
		const title = `${clan.name} War History (Last ${wars.length} Wars)`;

		for (const war of wars) {
			const opponentId = war.clans[0] === clanId ? war.clans[1] : war.clans[0];
			const opponentClan = opponentMap.get(opponentId);
			const myScore = war.scores[clanId] || 0;
			const opponentScore = war.scores[opponentId] || 0;

			let result: string;
			let resultColor: string;
			if (myScore > opponentScore) {
				result = 'WIN';
				resultColor = 'green';
			} else if (myScore < opponentScore) {
				result = 'LOSS';
				resultColor = 'red';
			} else {
				result = 'TIE';
				resultColor = 'gray';
			}

			dataRows.push([
				opponentClan?.name || opponentId,
				`<strong style="color:${resultColor};">${result}</strong>`,
				`${myScore} - ${opponentScore}`,
				`Best of ${war.bestOf}`,
				war.endDate ? to(new Date(war.endDate), { date: true }) : 'N/A',
			]);
		}

		const output = Table(title, headerRow, dataRows);
		this.sendReply(`|html|${output}`);
	},

	async record(target, room, user) {
		this.runBroadcast();
		this.checkChat();

		const [clan1IdRaw, clan2IdRaw] = target.split(',').map(s => toID(s.trim()));
		if (!clan1IdRaw || !clan2IdRaw) {
			return this.errorReply("Usage: /clan war record [clan1], [clan2]");
		}

		const [clan1, clan2] = await Promise.all([
			getClanById(clan1IdRaw, this),
			getClanById(clan2IdRaw, this),
		]);
		if (!clan1 || !clan2) return;

		const wars = await ClanWars.find({
			clans: { $all: [clan1IdRaw, clan2IdRaw] },
			status: 'completed',
		}, {});

		if (!wars.length) {
			return this.sendReplyBox(`${clan1.name} and ${clan2.name} have no war history together.`);
		}

		const html = generateHeadToHeadRecord(clan1, clan2, wars);
		this.sendReply(`|html|${html}`);
	},

	async mvp(target, room, user) {
		this.runBroadcast();
		this.checkChat();

		let clanId: ID;
		if (target) {
			clanId = toID(target);
		} else {
			const userClanInfo = await UserClans.findOne({ _id: user.id });
			if (!userClanInfo?.memberOf) {
				return this.errorReply("You are not in a clan. Specify a clan ID (e.g., /clan war mvp [clanid]).");
			}
			clanId = userClanInfo.memberOf;
		}

		const clan = await getClanById(clanId, this);
		if (!clan) return;

		const battleLogs = await ClanBattleLogs.find(
			{ winningClan: clanId },
			{}
		);

		if (!battleLogs.length) {
			return this.sendReplyBox(`${clan.name} has no war battle wins yet.`);
		}

		const memberWins: { [userid: string]: number } = {};
		for (const log of battleLogs) {
			memberWins[log.winner] = (memberWins[log.winner] || 0) + 1;
		}

		const top10 = Object.entries(memberWins)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);

		const headerRow = ['Rank', 'Top Trainer', 'War Victories'];
		const dataRows: string[][] = [];
		const title = `${clan.name} War MVPs - Top Trainers`;

		top10.forEach(([userid, wins], i) => {
			dataRows.push([
				`<strong>#${i + 1}</strong>`,
				userid,
				`<strong style="font-size: 1.1em; color: gold;">${wins}</strong>`,
			]);
		});

		const output = Table(title, headerRow, dataRows);
		this.sendReply(`|html|${output}`);
	},
};


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
