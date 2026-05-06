/*
 * File layout:
 *   impulse/db/clans/{clanid}.json        — clan document (members, settings)
 *   impulse/db/clans/logs/{clanid}.json   — clan activity, points, and battle logs
 *   impulse/db/clans/wars/{warid}.json    — one file per war
 *   impulse/db/clans/users.json           — userid → { memberOf, invites }
 *   impulse/db/clans/bans.json            — { [userid]: true }
 *   impulse/db/clans/clan-stats.json      — { [clanid]: ClanStatEntry } for ladder queries
 */

import { FS } from '../../../lib';
import type {
	Clan,
	UserClanInfo,
	ClanLog,
	ClanPointsLogEntry,
	ClanBattleLogEntry,
	ClanWar,
} from './interface';

export type ClanDoc = Omit<Clan, 'id'> & { _id: ID };
export type UserClanDoc = UserClanInfo & { _id: ID };
export type ClanLogDoc = ClanLog & { clanId: ID };
export type ClanPointsLogDoc = ClanPointsLogEntry & { clanId: ID };
export type ClanBanDoc = { _id: ID; banned: boolean };
export type ClanBattleLogDoc = ClanBattleLogEntry;
export type ClanWarDoc = ClanWar;

export interface ClanStatEntry {
	name: string;
	tag: string;
	points: number;
	memberCount: number;
	tourWins: number;
	eventWins: number;
	totalPointsEarned: number;
	clanBattleWins: number;
	clanBattleLosses: number;
	elo: number;
	lastWarChallenge: number;
}

const BASE = 'impulse/db/clans';
const WARS_DIR = `${BASE}/wars`;
const LOGS_DIR = `${BASE}/logs`;
const USERS_PATH = `${BASE}/users.json`;
const BANS_PATH = `${BASE}/bans.json`;
const STATS_PATH = `${BASE}/clan-stats.json`;

const clanPath = (id: ID) => `${BASE}/${id}.json`;
const warPath = (id: ID) => `${WARS_DIR}/${id}.json`;
const logPath = (id: ID) => `${LOGS_DIR}/${id}.json`;

FS(BASE).mkdirIfNonexistentSync();
FS(WARS_DIR).mkdirIfNonexistentSync();
FS(LOGS_DIR).mkdirIfNonexistentSync();

function readJson<T>(path: string, fallback: T): T {
	try {
		const raw = FS(path).readIfExistsSync();
		if (!raw) return fallback;
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function writeJson(path: string, data: unknown): Promise<void> {
	return new Promise(resolve => {
		FS(path).writeUpdate(() => {
			resolve();
			return JSON.stringify(data, null, '\t');
		});
	});
}

interface ClanFile {
	clan: ClanDoc;
}

interface ClanLogsFile {
	logs: ClanLogDoc[];
	pointsLogs: ClanPointsLogDoc[];
	battleLogs: ClanBattleLogDoc[];
}

function readLogsFile(id: ID): ClanLogsFile {
	const raw = FS(logPath(id)).readIfExistsSync();
	if (!raw) return { logs: [], pointsLogs: [], battleLogs: [] };
	try {
		return JSON.parse(raw) as ClanLogsFile;
	} catch {
		return { logs: [], pointsLogs: [], battleLogs: [] };
	}
}

function writeLogsFile(id: ID, logs: ClanLogsFile): Promise<void> {
	return writeJson(logPath(id), logs);
}

function readClanFile(id: ID): ClanFile | null {
	const raw = FS(clanPath(id)).readIfExistsSync();
	if (!raw) return null;
	try {
		const data = JSON.parse(raw);
		// Migration: Move logs to separate file if they exist in the main clan file
		if (data.logs || data.pointsLogs || data.battleLogs) {
			const logs: ClanLogsFile = {
				logs: data.logs || [],
				pointsLogs: data.pointsLogs || [],
				battleLogs: data.battleLogs || [],
			};
			if (!FS(logPath(id)).existsSync()) {
				FS(logPath(id)).writeSync(JSON.stringify(logs, null, '\t'));
			}
			return { clan: data.clan };
		}
		return data as ClanFile;
	} catch {
		return null;
	}
}

function writeClanFile(file: ClanFile): Promise<void> {
	return writeJson(clanPath(file.clan._id), file);
}

function readAllClanFiles(): ClanFile[] {
	const files: ClanFile[] = [];
	try {
		for (const entry of FS(BASE).readdirSync()) {
			if (!entry.endsWith('.json')) continue;
			const id = entry.slice(0, -5) as ID;
			if (id === 'users' || id === 'bans' || id === 'clan-stats') continue;
			const file = readClanFile(id);
			if (file) files.push(file);
		}
	} catch {}
	return files;
}

export function readClanStats(): Record<ID, ClanStatEntry> {
	return readJson<Record<ID, ClanStatEntry>>(STATS_PATH, {} as Record<ID, ClanStatEntry>);
}

export async function syncClanStats(clan: ClanDoc): Promise<void> {
	const stats = readClanStats();
	stats[clan._id] = {
		name: clan.name,
		tag: clan.tag,
		points: clan.points,
		memberCount: Object.keys(clan.members).length,
		tourWins: clan.stats.tourWins,
		totalPointsEarned: clan.stats.totalPointsEarned,
		clanBattleWins: clan.stats.clanBattleWins,
		clanBattleLosses: clan.stats.clanBattleLosses,
		elo: clan.stats.elo,
		lastWarChallenge: clan.stats.lastWarChallenge || 0,
	};
	await writeJson(STATS_PATH, stats);
}

export async function removeClanStats(id: ID): Promise<void> {
	const stats = readClanStats();
	delete stats[id];
	await writeJson(STATS_PATH, stats);
}

function readWarFile(id: ID): ClanWarDoc | null {
	const raw = FS(warPath(id)).readIfExistsSync();
	if (!raw) return null;
	try {
		return JSON.parse(raw) as ClanWarDoc;
	} catch {
		return null;
	}
}

function writeWarFile(war: ClanWarDoc): Promise<void> {
	return writeJson(warPath(war._id), war);
}

function deleteWarFile(id: ID): void {
	FS(warPath(id)).unlinkIfExistsSync();
}

function readAllWarFiles(): ClanWarDoc[] {
	const wars: ClanWarDoc[] = [];
	try {
		for (const entry of FS(WARS_DIR).readdirSync()) {
			if (!entry.endsWith('.json')) continue;
			const war = readWarFile(entry.slice(0, -5) as ID);
			if (war) wars.push(war);
		}
	} catch {}
	return wars;
}

type UsersData = Record<string, UserClanInfo>;
type BansData = Record<string, boolean>;

const readUsers = (): UsersData => readJson<UsersData>(USERS_PATH, {});
const writeUsers = (d: UsersData): Promise<void> => writeJson(USERS_PATH, d);
const readBans = (): BansData => readJson<BansData>(BANS_PATH, {});
const writeBans = (d: BansData): Promise<void> => writeJson(BANS_PATH, d);

function generateWarId(): ID {
	return `war_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` as ID;
}

type FilterQuery<T> = Partial<T> & Record<string, any>;

function matchesFilter<T extends Record<string, any>>(doc: T, filter: FilterQuery<T>): boolean {
	for (const [key, value] of Object.entries(filter)) {
		if (key === '$or') {
			if (!(value as FilterQuery<T>[]).some(c => matchesFilter(doc, c))) return false;
			continue;
		}
		if (key === '$and') {
			if (!(value as FilterQuery<T>[]).every(c => matchesFilter(doc, c))) return false;
			continue;
		}

		const docValue = getNestedValue(doc, key);

		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			for (const [op, opVal] of Object.entries(value as Record<string, any>)) {
				switch (op) {
				case '$in': {
					const arr = opVal as any[];
					const hit = Array.isArray(docValue) ? docValue.some((v: any) => arr.includes(v)) : arr.includes(docValue);
					if (!hit) return false;
					break;
				}
				case '$nin': {
					const arr = opVal as any[];
					const hit = Array.isArray(docValue) ? docValue.some((v: any) => arr.includes(v)) : arr.includes(docValue);
					if (hit) return false;
					break;
				}
				case '$all': {
					const arr = opVal as any[];
					const target = Array.isArray(docValue) ? docValue : [];
					if (!arr.every((v: any) => target.includes(v))) return false;
					break;
				}
				case '$ne': if (docValue === opVal) return false; break;
				case '$gt': if (!(docValue > opVal)) return false; break;
				case '$gte': if (!(docValue >= opVal)) return false; break;
				case '$lt': if (!(docValue < opVal)) return false; break;
				case '$lte': if (!(docValue <= opVal)) return false; break;
				case '$exists':
					if (opVal && docValue === undefined) return false;
					if (!opVal && docValue !== undefined) return false;
					break;
				}
			}
		} else if (Array.isArray(value)) {
			if (JSON.stringify(docValue) !== JSON.stringify(value)) return false;
		} else {
			if (docValue !== value) return false;
		}
	}
	return true;
}

function getNestedValue(obj: Record<string, any>, path: string): any {
	let current = obj;
	for (const part of path.split('.')) {
		if (current === null || current === undefined) return undefined;
		current = current[part];
	}
	return current;
}

function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
	const parts = path.split('.');
	let current = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
			current[parts[i]] = {};
		}
		current = current[parts[i]];
	}
	current[parts[parts.length - 1]] = value;
}

function unsetNestedValue(obj: Record<string, any>, path: string): void {
	const parts = path.split('.');
	let current = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		if (!current[parts[i]] || typeof current[parts[i]] !== 'object') return;
		current = current[parts[i]];
	}
	delete current[parts[parts.length - 1]];
}

function applyUpdate<T extends Record<string, any>>(doc: T, update: Record<string, any>): T {
	for (const [op, fields] of Object.entries(update)) {
		switch (op) {
		case '$set':
			for (const [path, val] of Object.entries(fields as Record<string, any>)) {
				setNestedValue(doc, path, val);
			}
			break;
		case '$unset':
			for (const path of Object.keys(fields as Record<string, any>)) {
				unsetNestedValue(doc, path);
			}
			break;
		case '$inc':
			for (const [path, delta] of Object.entries(fields as Record<string, any>)) {
				setNestedValue(doc, path, (getNestedValue(doc, path) ?? 0) + (delta as number));
			}
			break;
		case '$push':
			for (const [path, val] of Object.entries(fields as Record<string, any>)) {
				const arr = getNestedValue(doc, path);
				Array.isArray(arr) ? arr.push(val) : setNestedValue(doc, path, [val]);
			}
			break;
		case '$pull':
			for (const [path, condition] of Object.entries(fields as Record<string, any>)) {
				const arr = getNestedValue(doc, path);
				if (!Array.isArray(arr)) break;
				if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
					setNestedValue(doc, path, arr.filter((item: any) =>
						!matchesFilter(typeof item === 'object' ? item : { _: item }, condition)
					));
				} else {
					setNestedValue(doc, path, arr.filter((v: any) => v !== condition));
				}
			}
			break;
		case '$addToSet':
			for (const [path, val] of Object.entries(fields as Record<string, any>)) {
				const arr = getNestedValue(doc, path);
				if (Array.isArray(arr)) {
					if (!arr.includes(val)) arr.push(val);
				} else {
					setNestedValue(doc, path, [val]);
				}
			}
			break;
		}
	}
	return doc;
}

function sortDocs<T extends Record<string, any>>(docs: T[], sortObj: Record<string, 1 | -1>): T[] {
	const entries = Object.entries(sortObj);
	if (!entries.length) return docs;
	return [...docs].sort((a, b) => {
		for (const [field, dir] of entries) {
			const av = getNestedValue(a, field) ?? 0;
			const bv = getNestedValue(b, field) ?? 0;
			if (av < bv) return dir === 1 ? -1 : 1;
			if (av > bv) return dir === 1 ? 1 : -1;
		}
		return 0;
	});
}

interface FindOptions {
	limit?: number;
	skip?: number;
	sort?: Record<string, 1 | -1>;
}

interface InsertOneResult {
	insertedId: ID;
}

interface Collection<T extends Record<string, any>> {
	findOne(filter: FilterQuery<T>): Promise<T | null>;
	find(filter: FilterQuery<T>, options?: FindOptions): Promise<T[]>;
	insertOne(doc: Omit<T, '_id'> | T): Promise<InsertOneResult>;
	updateOne(filter: FilterQuery<T>, update: Record<string, any>): Promise<void>;
	updateMany(filter: FilterQuery<T>, update: Record<string, any>): Promise<void>;
	deleteOne(filter: FilterQuery<T>): Promise<void>;
	deleteMany(filter: FilterQuery<T>): Promise<void>;
	upsert(filter: FilterQuery<T>, update: Record<string, any>): Promise<void>;
	countDocuments(filter: FilterQuery<T>): Promise<number>;
}

const ClansCollection: Collection<ClanDoc> = {
	async findOne(filter) {
		if (filter._id) {
			const file = readClanFile(filter._id as ID);
			if (!file) return null;
			return matchesFilter(file.clan, filter) ? file.clan : null;
		}
		for (const file of readAllClanFiles()) {
			if (matchesFilter(file.clan, filter)) return file.clan;
		}
		return null;
	},

	async find(filter, options = {}) {
		let results: ClanDoc[] = [];
		if (filter._id && typeof filter._id === 'object' && '$in' in filter._id) {
			for (const id of (filter._id as any).$in as ID[]) {
				const file = readClanFile(id);
				if (file && matchesFilter(file.clan, filter)) results.push(file.clan);
			}
		} else {
			for (const file of readAllClanFiles()) {
				if (matchesFilter(file.clan, filter)) results.push(file.clan);
			}
		}
		if (options.sort) results = sortDocs(results, options.sort);
		if (options.skip) results = results.slice(options.skip);
		if (options.limit) results = results.slice(0, options.limit);
		return results;
	},

	async insertOne(doc) {
		const clan = doc as ClanDoc;
		await writeClanFile({ clan });
		await writeLogsFile(clan._id, { logs: [], pointsLogs: [], battleLogs: [] });
		await syncClanStats(clan);
		return { insertedId: clan._id };
	},

	async updateOne(filter, update) {
		let file: ClanFile | null = null;
		if (filter._id) {
			file = readClanFile(filter._id as ID);
		} else {
			for (const f of readAllClanFiles()) {
				if (matchesFilter(f.clan, filter)) { file = f; break; }
			}
		}
		if (!file) return;
		applyUpdate(file.clan, update);
		await writeClanFile(file);
		await syncClanStats(file.clan);
	},

	async updateMany(filter, update) {
		for (const file of readAllClanFiles()) {
			if (matchesFilter(file.clan, filter)) {
				applyUpdate(file.clan, update);
				await writeClanFile(file);
				await syncClanStats(file.clan);
			}
		}
	},

	async deleteOne(filter) {
		let id: ID | null = null;
		if (filter._id) {
			id = filter._id as ID;
		} else {
			for (const file of readAllClanFiles()) {
				if (matchesFilter(file.clan, filter)) { id = file.clan._id; break; }
			}
		}
		if (!id) return;
		FS(clanPath(id)).unlinkIfExistsSync();
		FS(logPath(id)).unlinkIfExistsSync();
		await removeClanStats(id);
	},

	async deleteMany(filter) {
		for (const file of readAllClanFiles()) {
			if (matchesFilter(file.clan, filter)) {
				FS(clanPath(file.clan._id)).unlinkIfExistsSync();
				FS(logPath(file.clan._id)).unlinkIfExistsSync();
				await removeClanStats(file.clan._id);
			}
		}
	},

	async upsert(filter, update) {
		return ClansCollection.updateOne(filter, update);
	},

	async countDocuments(filter) {
		let count = 0;
		for (const file of readAllClanFiles()) {
			if (matchesFilter(file.clan, filter)) count++;
		}
		return count;
	},
};

const UserClansCollection: Collection<UserClanDoc> = {
	async findOne(filter) {
		const users = readUsers();
		if (filter._id) {
			const entry = users[filter._id as string];
			if (!entry) return null;
			const doc: UserClanDoc = { _id: filter._id as ID, ...entry };
			return matchesFilter(doc, filter) ? doc : null;
		}
		for (const [uid, info] of Object.entries(users)) {
			const doc: UserClanDoc = { _id: uid as ID, ...info };
			if (matchesFilter(doc, filter)) return doc;
		}
		return null;
	},

	async find(filter, options = {}) {
		const users = readUsers();
		let results: UserClanDoc[] = Object.entries(users)
			.map(([uid, info]) => ({ _id: uid as ID, ...info }))
			.filter(doc => matchesFilter(doc, filter));
		if (options.sort) results = sortDocs(results, options.sort);
		if (options.skip) results = results.slice(options.skip);
		if (options.limit) results = results.slice(0, options.limit);
		return results;
	},

	async insertOne(doc) {
		const d = doc as UserClanDoc;
		const users = readUsers();
		users[d._id] = { memberOf: d.memberOf, invites: d.invites };
		await writeUsers(users);
		return { insertedId: d._id };
	},

	async updateOne(filter, update) {
		const users = readUsers();
		let targetId: string | null = null;
		if (filter._id) {
			targetId = filter._id as string;
			if (!users[targetId]) users[targetId] = {};
		} else {
			for (const [uid, info] of Object.entries(users)) {
				const doc: UserClanDoc = { _id: uid as ID, ...info };
				if (matchesFilter(doc, filter)) { targetId = uid; break; }
			}
		}
		if (targetId === null) return;
		const doc: UserClanDoc = { _id: targetId as ID, ...(users[targetId] || {}) };
		applyUpdate(doc, update);
		const { _id, ...rest } = doc;
		if (!rest.memberOf && !rest.invites?.length) {
			delete users[targetId];
		} else {
			users[targetId] = rest;
		}
		await writeUsers(users);
	},

	async updateMany(filter, update) {
		const users = readUsers();
		for (const [uid, info] of Object.entries(users)) {
			const doc: UserClanDoc = { _id: uid as ID, ...info };
			if (matchesFilter(doc, filter)) {
				applyUpdate(doc, update);
				const { _id, ...rest } = doc;
				if (!rest.memberOf && !rest.invites?.length) {
					delete users[uid];
				} else {
					users[uid] = rest;
				}
			}
		}
		await writeUsers(users);
	},

	async deleteOne(filter) {
		const users = readUsers();
		if (filter._id) {
			delete users[filter._id as string];
		} else {
			for (const [uid, info] of Object.entries(users)) {
				const doc: UserClanDoc = { _id: uid as ID, ...info };
				if (matchesFilter(doc, filter)) { delete users[uid]; break; }
			}
		}
		await writeUsers(users);
	},

	async deleteMany(filter) {
		const users = readUsers();
		for (const [uid, info] of Object.entries(users)) {
			const doc: UserClanDoc = { _id: uid as ID, ...info };
			if (matchesFilter(doc, filter)) delete users[uid];
		}
		await writeUsers(users);
	},

	async upsert(filter, update) {
		const users = readUsers();
		const id = filter._id as string;
		if (!users[id]) users[id] = {};
		const doc: UserClanDoc = { _id: id as ID, ...users[id] };
		applyUpdate(doc, update);
		const { _id, ...rest } = doc;
		users[id] = rest;
		await writeUsers(users);
	},

	async countDocuments(filter) {
		const users = readUsers();
		let count = 0;
		for (const [uid, info] of Object.entries(users)) {
			const doc: UserClanDoc = { _id: uid as ID, ...info };
			if (matchesFilter(doc, filter)) count++;
		}
		return count;
	},
};

const ClanLogsCollection: Collection<ClanLogDoc> = {
	async findOne(filter) {
		if (!filter.clanId) return null;
		const logsFile = readLogsFile(filter.clanId as ID);
		return logsFile.logs.find(l => matchesFilter(l, filter)) ?? null;
	},

	async find(filter, options = {}) {
		if (!filter.clanId) return [];
		const logsFile = readLogsFile(filter.clanId as ID);
		let results = logsFile.logs.filter(l => matchesFilter(l, filter));
		if (options.sort) results = sortDocs(results, options.sort);
		if (options.skip) results = results.slice(options.skip);
		if (options.limit) results = results.slice(0, options.limit);
		return results;
	},

	async insertOne(doc) {
		const d = doc as ClanLogDoc;
		const logsFile = readLogsFile(d.clanId);
		logsFile.logs.push(d);
		await writeLogsFile(d.clanId, logsFile);
		return { insertedId: '' as ID };
	},

	async updateOne() {},
	async updateMany() {},

	async deleteOne(filter) {
		if (!filter.clanId) return;
		const logsFile = readLogsFile(filter.clanId as ID);
		const idx = logsFile.logs.findIndex(l => matchesFilter(l, filter));
		if (idx !== -1) {
			logsFile.logs.splice(idx, 1);
			await writeLogsFile(filter.clanId as ID, logsFile);
		}
	},

	async deleteMany(filter) {
		if (filter.clanId) {
			const logsFile = readLogsFile(filter.clanId as ID);
			const before = logsFile.logs.length;
			logsFile.logs = logsFile.logs.filter(l => !matchesFilter(l, filter));
			if (logsFile.logs.length !== before) {
				await writeLogsFile(filter.clanId as ID, logsFile);
			}
		} else {
			// This is inefficient but deleteMany without clanId is rare for logs
			for (const entry of FS(BASE).readdirSync()) {
				if (!entry.endsWith('.json')) continue;
				const id = entry.slice(0, -5) as ID;
				if (['users', 'bans', 'clan-stats'].includes(id)) continue;
				const logsFile = readLogsFile(id);
				const before = logsFile.logs.length;
				logsFile.logs = logsFile.logs.filter(l => !matchesFilter(l, filter));
				if (logsFile.logs.length !== before) {
					await writeLogsFile(id, logsFile);
				}
			}
		}
	},

	async upsert() {},

	async countDocuments(filter) {
		if (!filter.clanId) return 0;
		const logsFile = readLogsFile(filter.clanId as ID);
		return logsFile.logs.filter(l => matchesFilter(l, filter)).length;
	},
};

const ClanPointsLogsCollection: Collection<ClanPointsLogDoc> = {
	async findOne(filter) {
		if (!filter.clanId) return null;
		const logsFile = readLogsFile(filter.clanId as ID);
		return logsFile.pointsLogs.find(l => matchesFilter(l, filter)) ?? null;
	},

	async find(filter, options = {}) {
		if (!filter.clanId) return [];
		const logsFile = readLogsFile(filter.clanId as ID);
		let results = logsFile.pointsLogs.filter(l => matchesFilter(l, filter));
		if (options.sort) results = sortDocs(results, options.sort);
		if (options.skip) results = results.slice(options.skip);
		if (options.limit) results = results.slice(0, options.limit);
		return results;
	},

	async insertOne(doc) {
		const d = doc as ClanPointsLogDoc;
		const logsFile = readLogsFile(d.clanId);
		logsFile.pointsLogs.push(d);
		await writeLogsFile(d.clanId, logsFile);
		return { insertedId: '' as ID };
	},

	async updateOne() {},
	async updateMany() {},

	async deleteOne(filter) {
		if (!filter.clanId) return;
		const logsFile = readLogsFile(filter.clanId as ID);
		const idx = logsFile.pointsLogs.findIndex(l => matchesFilter(l, filter));
		if (idx !== -1) {
			logsFile.pointsLogs.splice(idx, 1);
			await writeLogsFile(filter.clanId as ID, logsFile);
		}
	},

	async deleteMany(filter) {
		if (filter.clanId) {
			const logsFile = readLogsFile(filter.clanId as ID);
			const before = logsFile.pointsLogs.length;
			logsFile.pointsLogs = logsFile.pointsLogs.filter(l => !matchesFilter(l, filter));
			if (logsFile.pointsLogs.length !== before) {
				await writeLogsFile(filter.clanId as ID, logsFile);
			}
		} else {
			for (const entry of FS(BASE).readdirSync()) {
				if (!entry.endsWith('.json')) continue;
				const id = entry.slice(0, -5) as ID;
				if (['users', 'bans', 'clan-stats'].includes(id)) continue;
				const logsFile = readLogsFile(id);
				const before = logsFile.pointsLogs.length;
				logsFile.pointsLogs = logsFile.pointsLogs.filter(l => !matchesFilter(l, filter));
				if (logsFile.pointsLogs.length !== before) {
					await writeLogsFile(id, logsFile);
				}
			}
		}
	},

	async upsert() {},

	async countDocuments(filter) {
		if (!filter.clanId) return 0;
		const logsFile = readLogsFile(filter.clanId as ID);
		return logsFile.pointsLogs.filter(l => matchesFilter(l, filter)).length;
	},
};

const ClanBansCollection: Collection<ClanBanDoc> = {
	async findOne(filter) {
		const bans = readBans();
		if (filter._id) {
			return bans[filter._id as string] ? { _id: filter._id as ID, banned: true } : null;
		}
		for (const [uid, banned] of Object.entries(bans)) {
			const doc: ClanBanDoc = { _id: uid as ID, banned };
			if (matchesFilter(doc, filter)) return doc;
		}
		return null;
	},

	async find(filter, options = {}) {
		const bans = readBans();
		let results: ClanBanDoc[] = Object.entries(bans)
			.map(([uid, banned]) => ({ _id: uid as ID, banned }))
			.filter(doc => matchesFilter(doc, filter));
		if (options.sort) results = sortDocs(results, options.sort);
		if (options.skip) results = results.slice(options.skip);
		if (options.limit) results = results.slice(0, options.limit);
		return results;
	},

	async insertOne(doc) {
		const d = doc as ClanBanDoc;
		const bans = readBans();
		bans[d._id] = d.banned;
		await writeBans(bans);
		return { insertedId: d._id };
	},

	async updateOne(filter, update) {
		const bans = readBans();
		const id = filter._id as string;
		if (!id) return;
		if (!bans[id]) bans[id] = false;
		const doc: ClanBanDoc = { _id: id as ID, banned: bans[id] };
		applyUpdate(doc, update);
		bans[id] = doc.banned;
		await writeBans(bans);
	},

	async updateMany() {},

	async deleteOne(filter) {
		const bans = readBans();
		if (filter._id) {
			delete bans[filter._id as string];
		} else {
			for (const [uid, banned] of Object.entries(bans)) {
				const doc: ClanBanDoc = { _id: uid as ID, banned };
				if (matchesFilter(doc, filter)) { delete bans[uid]; break; }
			}
		}
		await writeBans(bans);
	},

	async deleteMany(filter) {
		const bans = readBans();
		for (const [uid, banned] of Object.entries(bans)) {
			const doc: ClanBanDoc = { _id: uid as ID, banned };
			if (matchesFilter(doc, filter)) delete bans[uid];
		}
		await writeBans(bans);
	},

	async upsert(filter, update) {
		const bans = readBans();
		const id = filter._id as string;
		if (!bans[id]) bans[id] = false;
		const doc: ClanBanDoc = { _id: id as ID, banned: bans[id] };
		applyUpdate(doc, update);
		bans[id] = doc.banned;
		await writeBans(bans);
	},

	async countDocuments(filter) {
		const bans = readBans();
		let count = 0;
		for (const [uid, banned] of Object.entries(bans)) {
			if (matchesFilter({ _id: uid as ID, banned }, filter)) count++;
		}
		return count;
	},
};

const ClanBattleLogsCollection: Collection<ClanBattleLogDoc> = {
	async findOne(filter) {
		for (const entry of FS(BASE).readdirSync()) {
			if (!entry.endsWith('.json')) continue;
			const id = entry.slice(0, -5) as ID;
			if (['users', 'bans', 'clan-stats'].includes(id)) continue;
			const logsFile = readLogsFile(id);
			const match = logsFile.battleLogs.find(l => matchesFilter(l, filter));
			if (match) return match;
		}
		return null;
	},

	async find(filter, options = {}) {
		const directId = (filter.winningClan ?? filter.losingClan) as ID | undefined;
		let clanIds: ID[] = [];

		if (directId && typeof directId === 'string') {
			clanIds = [directId];
		} else if (filter.$or) {
			const ids = new Set<ID>();
			for (const clause of filter.$or as any[]) {
				if (clause.winningClan) ids.add(clause.winningClan as ID);
				if (clause.losingClan) ids.add(clause.losingClan as ID);
			}
			clanIds = Array.from(ids);
		} else {
			for (const entry of FS(BASE).readdirSync()) {
				if (!entry.endsWith('.json')) continue;
				const id = entry.slice(0, -5) as ID;
				if (['users', 'bans', 'clan-stats'].includes(id)) continue;
				clanIds.push(id);
			}
		}

		// Deduplicate by battleID since both clan log files hold the same entry
		const seen = new Set<string>();
		let results: ClanBattleLogDoc[] = [];
		for (const id of clanIds) {
			const logsFile = readLogsFile(id);
			for (const entry of logsFile.battleLogs) {
				if (matchesFilter(entry, filter) && !seen.has(entry.battleID)) {
					seen.add(entry.battleID);
					results.push(entry);
				}
			}
		}

		if (options.sort) results = sortDocs(results, options.sort);
		if (options.skip) results = results.slice(options.skip);
		if (options.limit) results = results.slice(0, options.limit);
		return results;
	},

	async insertOne(doc) {
		const d = doc as ClanBattleLogDoc;
		// Store in both clan log files so each clan's logs are fully self-contained
		for (const clanId of [d.winningClan, d.losingClan]) {
			const logsFile = readLogsFile(clanId);
			logsFile.battleLogs.push(d);
			await writeLogsFile(clanId, logsFile);
		}
		return { insertedId: '' as ID };
	},

	async updateOne() {},
	async updateMany() {},
	async deleteOne() {},

	async deleteMany(filter) {
		const clanId = (filter.$or as any)?.[0]?.winningClan
			?? (filter.$or as any)?.[0]?.losingClan
			?? filter.winningClan
			?? filter.losingClan;

		if (clanId) {
			const logsFile = readLogsFile(clanId as ID);
			const before = logsFile.battleLogs.length;
			logsFile.battleLogs = logsFile.battleLogs.filter(l => !matchesFilter(l, filter));
			if (logsFile.battleLogs.length !== before) {
				await writeLogsFile(clanId as ID, logsFile);
			}
		} else {
			for (const entry of FS(BASE).readdirSync()) {
				if (!entry.endsWith('.json')) continue;
				const id = entry.slice(0, -5) as ID;
				if (['users', 'bans', 'clan-stats'].includes(id)) continue;
				const logsFile = readLogsFile(id);
				const before = logsFile.battleLogs.length;
				logsFile.battleLogs = logsFile.battleLogs.filter(l => !matchesFilter(l, filter));
				if (logsFile.battleLogs.length !== before) {
					await writeLogsFile(id, logsFile);
				}
			}
		}
	},

	async upsert() {},

	async countDocuments(filter) {
		return (await ClanBattleLogsCollection.find(filter)).length;
	},
};

const ClanWarsCollection: Collection<ClanWarDoc> = {
	async findOne(filter) {
		if (filter._id) {
			const war = readWarFile(filter._id as ID);
			if (!war) return null;
			return matchesFilter(war, filter) ? war : null;
		}
		for (const war of readAllWarFiles()) {
			if (matchesFilter(war, filter)) return war;
		}
		return null;
	},

	async find(filter, options = {}) {
		let results = readAllWarFiles().filter(w => matchesFilter(w, filter));
		if (options.sort) results = sortDocs(results, options.sort);
		if (options.skip) results = results.slice(options.skip);
		if (options.limit) results = results.slice(0, options.limit);
		return results;
	},

	async insertOne(doc) {
		const war = doc as ClanWarDoc;
		if (!war._id) war._id = generateWarId();
		await writeWarFile(war);
		return { insertedId: war._id };
	},

	async updateOne(filter, update) {
		let war: ClanWarDoc | null = null;
		if (filter._id) {
			war = readWarFile(filter._id as ID);
		} else {
			for (const w of readAllWarFiles()) {
				if (matchesFilter(w, filter)) { war = w; break; }
			}
		}
		if (!war) return;
		applyUpdate(war, update);
		await writeWarFile(war);
	},

	async updateMany(filter, update) {
		for (const war of readAllWarFiles()) {
			if (matchesFilter(war, filter)) {
				applyUpdate(war, update);
				await writeWarFile(war);
			}
		}
	},

	async deleteOne(filter) {
		if (filter._id) {
			deleteWarFile(filter._id as ID);
		} else {
			for (const war of readAllWarFiles()) {
				if (matchesFilter(war, filter)) { deleteWarFile(war._id); break; }
			}
		}
	},

	async deleteMany(filter) {
		for (const war of readAllWarFiles()) {
			if (matchesFilter(war, filter)) deleteWarFile(war._id);
		}
	},

	async upsert(filter, update) {
		return ClanWarsCollection.updateOne(filter, update);
	},

	async countDocuments(filter) {
		return readAllWarFiles().filter(w => matchesFilter(w, filter)).length;
	},
};

export const Clans = ClansCollection;
export const UserClans = UserClansCollection;
export const ClanLogs = ClanLogsCollection;
export const ClanPointsLogs = ClanPointsLogsCollection;
export const ClanBans = ClanBansCollection;
export const ClanBattleLogs = ClanBattleLogsCollection;
export const ClanWars = ClanWarsCollection;
ClanWarsCollection;
