/*
 * Pokemon Showdown - Impulse Server
 * Clans Interface & Types
 * @author PrinceSky-Git
 */

// ─── Role Types ───────────────────────────────────────────────────────────────

export type ClanRole = 'owner' | 'leader' | 'officer' | 'member';

// ─── Member ───────────────────────────────────────────────────────────────────

export interface ClanMember {
	role: ClanRole;
	joinDate: number;
	totalPointsContributed: number;
}

// ─── Clan Stats ───────────────────────────────────────────────────────────────

export interface ClanStats {
	tourWins: number;
	totalPointsEarned: number;
	clanBattleWins: number;
	clanBattleLosses: number;
	elo: number;
	lastWarChallenge?: number;
}

// ─── Clan Invite ─────────────────────────────────────────────────────────────

export interface ClanInvite {
	userid: ID;
	actor: ID;
	timestamp: number;
}

// ─── Clan ────────────────────────────────────────────────────────────────────

export interface Clan {
	id: ID;
	name: string;
	tag: string;
	owner: ID;
	members: {
		[userid: string]: ClanMember;
	};
	created: number;
	desc: string;
	memberOfTheWeek: ID;
	inviteOnly: boolean;
	invites: ClanInvite[];
	points: number;
	chatRoom: ID;
	icon: string;
	lastActive: number;
	stats: ClanStats;
}

export interface ClanData {
	[clanId: string]: Clan;
}

// ─── User Clan Info ───────────────────────────────────────────────────────────

export interface UserClanInfo {
	memberOf?: ID;
	invites?: ID[];
}

export interface UserClanData {
	[userid: string]: UserClanInfo;
}

// ─── Log Types ────────────────────────────────────────────────────────────────

export type ClanLogType =
	// ─── Clan Lifecycle ───────────────────────────────────────────────────────
	| 'CREATE' | 'DELETE'
	// ─── Membership ──────────────────────────────────────────────────────────
	| 'JOIN' | 'LEAVE' | 'KICK'
	// ─── Roles ───────────────────────────────────────────────────────────────
	| 'PROMOTE' | 'DEMOTE'
	// ─── Settings ────────────────────────────────────────────────────────────
	| 'SET_DESC' | 'SET_TAG' | 'SET_ICON' | 'SET_MOTW'
	// ─── War Outcomes ─────────────────────────────────────────────────────────
	| 'WAR_WIN' | 'WAR_LOSS' | 'WAR_TIE' | 'WAR_FORFEIT'
	// ─── Admin Actions ────────────────────────────────────────────────────────
	| 'ADMIN_POINTS' | 'ADMIN_TOURWIN'
	| 'ADMIN_TRANSFEROWNER' | 'ADMIN_KICKALL' | 'ADMIN_CLEARMEMBERS'
	| 'ADMIN_RESETSTATS'
	| 'ADMIN_WAR_FORFEIT' | 'ADMIN_WAR_FORCEEND';

// ─── Clan Log ────────────────────────────────────────────────────────────────

export interface ClanLog {
	timestamp: number;
	type: ClanLogType;
	message: string; // Pre-formatted single line e.g. "[KICK] targetus kicked by adminuser"
}

export interface ClanLogs {
	[clanId: string]: ClanLog[];
}

// ─── Points Log ───────────────────────────────────────────────────────────────

export interface ClanPointsLogEntry {
	timestamp: number;
	userid: ID;
	actor: ID;
	amount: number;
	reason: string;
}

export interface ClanPointsLogs {
	[clanId: string]: ClanPointsLogEntry[];
}

// ─── War ─────────────────────────────────────────────────────────────────────

export interface ClanWar {
	_id: ID;
	clans: [ID, ID]; // Index 0 is always the challenger, index 1 is always the target
	scores: { [clanId: string]: number };
	status: 'pending' | 'active' | 'completed';
	startDate: number;
	endDate?: number;
	bestOf: number;
	tieConfirmations?: ID[];
	paused?: boolean;
	pauseConfirmations?: ID[];
	resumeConfirmations?: ID[];
	extendConfirmations?: { clanId: ID; newBestOf: number }[];
}

// ─── Battle Log ───────────────────────────────────────────────────────────────

export interface ClanBattleLogEntry {
	timestamp: number;
	winningClan: ID;
	losingClan: ID;
	winner: ID;
	loser: ID;
	format: string;
	battleID: RoomID;
	warId?: ID;
	eloChangeWinner?: number;
	eloChangeLoser?: number;
	isWarWinningBattle?: boolean;
}
