export const LOBBY_ROOM_ID = 'clanwarlogs' as RoomID;

export const MAX_CLAN_NAME_LENGTH = 30;
export const MAX_CLAN_ID_MIN_LENGTH = 3;
export const MAX_CLAN_ID_MAX_LENGTH = 20;
export const MAX_CLAN_DESC_LENGTH = 80;
export const MAX_CLAN_TAG_LENGTH = 4;
export const MAX_CLAN_ICON_URL_LENGTH = 1000;
export const MAX_ANNOUNCEMENT_LENGTH = 500;

export const MAX_BEST_OF = 101;
export const MIN_BEST_OF = 1;
export const WAR_CHALLENGE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export const DEFAULT_ELO = 1000;
export const ELO_K_FACTOR = 32;
export const MIN_ELO_CHANGE = 1;

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_LOG_LIMIT = 50;
export const MAX_LOG_LIMIT = 100;
export const MIN_LOG_LIMIT = 1;

export const ROLE_LEVELS: Record<string, number> = {
	owner: 100,
	leader: 50,
	officer: 25,
	member: 10,
};

export const DEFAULT_CLAN_POINTS = 0;
export const DEFAULT_MEMBER_POINTS = 0;

export const ROOM_RANK_OWNER = '#';
export const ROOM_RANK_LEADER = '@';
export const ROOM_RANK_OFFICER = '%';
export const ROOM_RANK_MEMBER = '+';
export const ROOM_RANK_MOTW = '^';

export const CLAN_ROLE_TO_ROOM_RANK: Record<string, string> = {
	owner: '#',
	leader: '@',
	officer: '%',
	member: '+',
};

export const ICON_URL_REGEX = /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)$/i;
export const CLAN_TAG_REGEX = /^[A-Z]+$/;

export const DEFAULT_STATS = {
	tourWins: 0,
	eventWins: 0,
	totalPointsEarned: 0,
	clanBattleWins: 0,
	clanBattleLosses: 0,
	elo: DEFAULT_ELO,
	lastWarChallenge: 0,
};
