/*
 * Pokemon Showdown - Impulse Server
 * Clans Utility Functions
 * @author PrinceSky-Git
 */

import { ClanLogs } from './database';
import type { Clan, ClanLogType, ClanRole } from './interface';
import { ROLE_LEVELS } from './constants';

// ─── Activity Logging ─────────────────────────────────────────────────────────

/**
 * Logs a clan activity event to the database as a single formatted message.
 *
 * @param clanId  - The clan the activity belongs to
 * @param type    - The log type (used for filtering and display prefix)
 * @param message - A pre-formatted single-line description of the event
 *
 * @example
 * await log(clanId, 'KICK', `${actorId} kicked ${targetId} from the clan`);
 * await log(clanId, 'PROMOTE', `${actorId} promoted ${targetId} to leader`);
 */
export async function log(
	clanId: ID,
	type: ClanLogType,
	message: string
): Promise<void> {
	await ClanLogs.insertOne({
		clanId,
		timestamp: Date.now(),
		type,
		message: `[${type}] ${message}`,
	});
}

// ─── Role Checking ────────────────────────────────────────────────────────────

/**
 * Returns the role of a user within a clan.
 * The owner always returns 'owner' regardless of the stored member role.
 *
 * @param clan   - The clan document
 * @param userId - The user ID to check
 * @returns The user's ClanRole or null if they are not a member
 */
export function getClanRole(
	clan: Clan,
	userId: ID
): ClanRole | null {
	if (clan.owner === userId) return 'owner';
	const member = clan.members[userId];
	if (!member) return null;
	return member.role ?? null;
}

/**
 * Checks whether a user meets the minimum role requirement within a clan.
 * The owner always passes all role checks.
 *
 * @param clan    - The clan document
 * @param userId  - The user ID to check
 * @param minRole - The minimum role required
 * @returns True if the user meets or exceeds the minimum role, false otherwise
 *
 * @example
 * hasMinRole(clan, userId, 'officer') // true if user is officer, leader, or owner
 * hasMinRole(clan, userId, 'leader')  // true if user is leader or owner
 * hasMinRole(clan, userId, 'owner')   // true only if user is the owner
 */
export function hasMinRole(
	clan: Clan,
	userId: ID,
	minRole: ClanRole
): boolean {
	const userRole = getClanRole(clan, userId);
	if (!userRole) return false;
	return (ROLE_LEVELS[userRole] ?? 0) >= (ROLE_LEVELS[minRole] ?? 0);
}

// ─── Date & Duration Formatting ───────────────────────────────────────────────

/**
 * Formats a Date object into a readable date and/or time string.
 *
 * @param date    - The date to format
 * @param options - Whether to include the date, time, or both
 * @returns A formatted string, or an empty string if the date is invalid
 *
 * @example
 * to(new Date(), { date: true, time: true }) // "2025-01-15 14:30:00"
 * to(new Date(), { date: true })             // "2025-01-15"
 * to(new Date(), { time: true })             // "14:30:00"
 */
export function to(
	date: Date,
	options: { date?: boolean; time?: boolean } = {}
): string {
	if (!(date instanceof Date) || isNaN(date.getTime())) return '';

	const { date: showDate = false, time: showTime = false } = options;

	if (!showDate && !showTime) return date.toISOString();

	let result = '';

	if (showDate) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		result += `${year}-${month}-${day}`;
	}

	if (showTime) {
		if (showDate) result += ' ';
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');
		result += `${hours}:${minutes}:${seconds}`;
	}

	return result;
}

/**
 * Converts a duration in milliseconds to a human-readable string.
 *
 * @param ms - The duration in milliseconds
 * @returns A compact human-readable duration string
 *
 * @example
 * toDurationString(90000)        // "1m 30s"
 * toDurationString(3700000)      // "1h 1m"
 * toDurationString(172800000)    // "2d"
 */
export function toDurationString(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const months = Math.floor(days / 30);
	const years = Math.floor(days / 365);

	if (years > 0) {
		const remainingMonths = Math.floor((days % 365) / 30);
		return remainingMonths > 0 ? `${years}y ${remainingMonths}mo` : `${years}y`;
	}
	if (months > 0) {
		const remainingDays = days % 30;
		return remainingDays > 0 ? `${months}mo ${remainingDays}d` : `${months}mo`;
	}
	if (days > 0) {
		const remainingHours = hours % 24;
		return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
	}
	if (hours > 0) {
		const remainingMinutes = minutes % 60;
		return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
	}
	if (minutes > 0) {
		const remainingSeconds = seconds % 60;
		return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
	}
	return `${seconds}s`;
}
