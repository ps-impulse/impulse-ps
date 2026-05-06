import { Clans, UserClans, ClanBattleLogs, ClanWars } from './database';
import type { ClanBattleLogEntry } from './interface';
import { calculateElo, safeElo } from './helpers/elo';
import { broadcastWarUpdate, broadcastWarEnded, getWarUhtmlId } from './helpers/broadcast';
import { resolveWarClans } from './war/war-context';
import { log } from './utils';

interface BattleEndResult {
	winner: ID;
	loser: ID;
	winnerClanId: ID;
	loserClanId: ID;
}

async function resolveBattleClans(
	winner: ID,
	loser: ID
): Promise<BattleEndResult | null> {
	const [winnerClanInfo, loserClanInfo] = await Promise.all([
		UserClans.findOne({ _id: winner }),
		UserClans.findOne({ _id: loser }),
	]);

	const winnerClanId = winnerClanInfo?.memberOf;
	const loserClanId = loserClanInfo?.memberOf;

	if (!winnerClanId || !loserClanId || winnerClanId === loserClanId) {
		return null;
	}

	return { winner, loser, winnerClanId, loserClanId };
}

async function handleWarConclusion(
	battle: RoomBattle,
	result: BattleEndResult,
	war: any,
	winsNeeded: number,
	newWinnerScore: number,
	newLoserScore: number
): Promise<void> {
	const { winner, loser, winnerClanId, loserClanId } = result;

	const [winnerClan, loserClan] = await Promise.all([
		Clans.findOne({ _id: winnerClanId }),
		Clans.findOne({ _id: loserClanId }),
	]);

	if (!winnerClan || !loserClan) {
		Monitor.crashlog(
			new Error("War battle ended but a clan was missing."),
			"Clan War Battle End Handler",
			{ winnerClanId, loserClanId, battleID: battle.roomid }
		);
		return;
	}

	const winnerOldElo = safeElo(winnerClan.stats.elo);
	const loserOldElo = safeElo(loserClan.stats.elo);
	const [newWinnerElo, newLoserElo, eloChange] = calculateElo(winnerOldElo, loserOldElo);

	const winnerName = Users.get(winner)?.name || winner;
	const loserName = Users.get(loser)?.name || loser;

	const battleLogEntry: Omit<ClanBattleLogEntry, '_id'> = {
		timestamp: Date.now(),
		winningClan: winnerClanId,
		losingClan: loserClanId,
		winner,
		loser,
		format: battle.format,
		battleID: battle.roomid,
		warId: war._id,
		eloChangeWinner: eloChange,
		eloChangeLoser: -eloChange,
		isWarWinningBattle: true,
	};

	try {
		await Promise.all([
			Clans.updateOne(
				{ _id: winnerClanId },
				{
					$set: { 'stats.elo': newWinnerElo },
					$inc: { 'stats.clanBattleWins': 1 },
				}
			),
			Clans.updateOne(
				{ _id: loserClanId },
				{
					$set: { 'stats.elo': newLoserElo },
					$inc: { 'stats.clanBattleLosses': 1 },
				}
			),
			ClanWars.updateOne(
				{ _id: war._id },
				{
					$set: { status: 'completed', endDate: Date.now() },
					$inc: { [`scores.${winnerClanId}`]: 1 },
				}
			),
			ClanBattleLogs.insertOne(battleLogEntry),
		]);

		await Promise.all([
			log(winnerClanId, 'WAR_WIN', `won against ${loserClanId} with score ${newWinnerScore}-${newLoserScore} (+${eloChange} ELO)`),
			log(loserClanId, 'WAR_LOSS', `lost against ${winnerClanId} with score ${newLoserScore}-${newWinnerScore} (-${eloChange} ELO)`),
		]);

		const clans = await resolveWarClans(war);
		if (!clans) return;

		const [clan1, clan2] = clans;

		war.status = 'completed';
		war.scores[winnerClanId] = newWinnerScore;
		war.scores[loserClanId] = newLoserScore;

		const warScore = `(Final Score: ${newWinnerScore} - ${newLoserScore})`;
		const endMessage = `${winnerClan.name} emerges victorious over ${loserClan.name}! ${warScore}`;

		const uhtmlId = getWarUhtmlId(war._id);
		broadcastWarEnded(war, clan1, clan2, uhtmlId, endMessage);
	} catch (e) {
		Monitor.crashlog(e as Error, "Clan War ELO Battle End Handler (War End)", {
			battleID: battle.roomid,
			warId: war._id,
			winnerClanId,
			loserClanId,
		});
	}
}

async function handleWarBattleWin(
	battle: RoomBattle,
	result: BattleEndResult,
	war: any,
	newWinnerScore: number
): Promise<void> {
	const { winner, loser, winnerClanId, loserClanId } = result;

	const winnerName = Users.get(winner)?.name || winner;
	const loserName = Users.get(loser)?.name || loser;

	const battleLogEntry: Omit<ClanBattleLogEntry, '_id'> = {
		timestamp: Date.now(),
		winningClan: winnerClanId,
		losingClan: loserClanId,
		winner,
		loser,
		format: battle.format,
		battleID: battle.roomid,
		warId: war._id,
		eloChangeWinner: 0,
		eloChangeLoser: 0,
		isWarWinningBattle: false,
	};

	try {
		await Promise.all([
			ClanWars.updateOne(
				{ _id: war._id },
				{ $inc: { [`scores.${winnerClanId}`]: 1 } }
			),
			ClanBattleLogs.insertOne(battleLogEntry),
		]);

		const [winnerClan, loserClan, updatedWar] = await Promise.all([
			Clans.findOne({ _id: winnerClanId }),
			Clans.findOne({ _id: loserClanId }),
			ClanWars.findOne({ _id: war._id }),
		]);

		if (!winnerClan || !loserClan || !updatedWar) return;

		const clans = await resolveWarClans(updatedWar);
		if (!clans) return;

		const [clan1, clan2] = clans;

		const lastBattle = {
			winnerName,
			loserName,
			winningClanName: winnerClan.name,
		};

		const uhtmlId = getWarUhtmlId(updatedWar._id);
		broadcastWarUpdate(updatedWar, clan1, clan2, uhtmlId, 'change', { lastBattle });
	} catch (e) {
		Monitor.crashlog(e as Error, "Clan War ELO Battle End Handler (War Continue)", {
			battleID: battle.roomid,
			warId: war._id,
			winnerClanId,
			loserClanId,
		});
	}
}

async function handleClanBattleEnd(
	battle: RoomBattle,
	winner: ID,
	players: ID[]
): Promise<void> {
	if (players.length !== 2 || battle.tour) return;

	const [p1, p2] = players;
	const loser = winner === p1 ? p2 : p1;

	if (!winner || !loser) return;

	let result: BattleEndResult | null;
	try {
		result = await resolveBattleClans(winner, loser);
	} catch (e) {
		Monitor.crashlog(e as Error, "Clan Battle End: resolveBattleClans failed", {
			battleID: battle.roomid,
			winner,
			loser,
		});
		return;
	}

	if (!result) return;

	const { winnerClanId, loserClanId } = result;

	let war: any;
	try {
		war = await ClanWars.findOne({
			clans: { $all: [winnerClanId, loserClanId] } as any,
			status: 'active',
		});
	} catch (e) {
		Monitor.crashlog(e as Error, "Clan Battle End: ClanWars lookup failed", {
			battleID: battle.roomid,
			winnerClanId,
			loserClanId,
		});
		return;
	}

	if (!war || !war.bestOf || war.paused) return;

	const winsNeeded = Math.ceil(war.bestOf / 2);
	const newWinnerScore = (war.scores[winnerClanId] || 0) + 1;
	const newLoserScore = war.scores[loserClanId] || 0;

	if (newWinnerScore >= winsNeeded) {
		await handleWarConclusion(
			battle,
			result,
			war,
			winsNeeded,
			newWinnerScore,
			newLoserScore
		);
	} else {
		await handleWarBattleWin(battle, result, war, newWinnerScore);
	}
}

export const handlers: Chat.Handlers = {
	onBattleEnd: (battle, winner, players) => {
		void handleClanBattleEnd(battle, winner, players);
	},
};
