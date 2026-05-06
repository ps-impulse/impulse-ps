import { ClanLogs } from './database';
import type { Clan, ClanLogType, ClanRole } from './interface';
import { ROLE_LEVELS } from './constants';

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

export function getClanRole(
	clan: Clan,
	userId: ID
): ClanRole | null {
	if (clan.owner === userId) return 'owner';
	const member = clan.members[userId];
	if (!member) return null;
	return member.role ?? null;
}

export function hasMinRole(
	clan: Clan,
	userId: ID,
	minRole: ClanRole
): boolean {
	const userRole = getClanRole(clan, userId);
	if (!userRole) return false;
	return (ROLE_LEVELS[userRole] ?? 0) >= (ROLE_LEVELS[minRole] ?? 0);
}

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
