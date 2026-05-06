/*
 * Pokemon Showdown - Impulse Server
 * Clans War Info Commands
 * @author PrinceSky-Git
 */

import { Clans, UserClans, ClanWars, ClanBattleLogs } from '../database';
import { to } from '../utils';
import { getClanById } from '../helpers/context';
import { displayElo } from '../helpers/elo';
import { generateWarStats, generateHeadToHeadRecord } from '../helpers/html';
import { Table } from '../../../impulse-utils';
import { DEFAULT_PAGE_SIZE, DEFAULT_LOG_LIMIT } from '../constants';

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
