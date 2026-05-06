export type ClanRole = 'owner' | 'leader' | 'officer' | 'member';

export interface ClanMember {
	role: ClanRole;
	joinDate: number;
	totalPointsContributed: number;
}

export interface ClanStats {
	tourWins: number;
	totalPointsEarned: number;
	clanBattleWins: number;
	clanBattleLosses: number;
	elo: number;
	lastWarChallenge?: number;
}

export interface ClanInvite {
	userid: ID;
	actor: ID;
	timestamp: number;
}

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
	chatRoom: RoomID;
	icon: string;
	lastActive: number;
	stats: ClanStats;
}

export interface ClanData {
	[clanId: string]: Clan;
}

export interface UserClanInfo {
	memberOf?: ID;
	invites?: ID[];
}

export interface UserClanData {
	[userid: string]: UserClanInfo;
}

export type ClanLogType =
	| 'CREATE' | 'DELETE'
	| 'JOIN' | 'LEAVE' | 'KICK'
	| 'PROMOTE' | 'DEMOTE'
	| 'SET_DESC' | 'SET_TAG' | 'SET_ICON' | 'SET_MOTW'
	| 'WAR_WIN' | 'WAR_LOSS' | 'WAR_TIE' | 'WAR_FORFEIT'
	| 'ADMIN_POINTS' | 'ADMIN_TOURWIN'
	| 'ADMIN_TRANSFEROWNER' | 'ADMIN_KICKALL' | 'ADMIN_CLEARMEMBERS'
	| 'ADMIN_RESETSTATS'
	| 'ADMIN_WAR_FORFEIT' | 'ADMIN_WAR_FORCEEND';

export interface ClanLog {
	timestamp: number;
	type: ClanLogType;
	message: string;
}

export interface ClanLogs {
	[clanId: string]: ClanLog[];
}

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

export interface ClanWar {
	_id: ID;
	clans: [ID, ID];
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
