/*
 * Pokemon Showdown - Impulse Server
 * Clans Context Helper
 * @author PrinceSky-Git
 */

import { Clans, UserClans, ClanWars, type ClanDoc } from '../database';
import type { ClanWar } from '../interface';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClanContext {
	clan: ClanDoc;
	clanId: ID;
}

export interface WarContext {
	war: ClanWar;
	clan1: ClanDoc;
	clan2: ClanDoc;
	uhtmlId: string;
}

export interface DualClanContext {
	myClan: ClanDoc;
	myClanId: ID;
	opponentClan: ClanDoc;
	opponentClanId: ID;
}

// ─── User Clan Context ───────────────────────────────────────────────────────

/**
 * Fetches the clan that a user belongs to.
 * Sends an errorReply via the provided context if any step fails.
 *
 * @param userId  - The user's ID
 * @param context - The Chat.CommandContext to send error replies through
 * @returns A ClanContext object, or null if any lookup failed
 */
export async function getClanContext(
	userId: ID,
	context: Chat.CommandContext
): Promise<ClanContext | null> {
	const userClanInfo = await UserClans.findOne({ _id: userId });
	const clanId = userClanInfo?.memberOf;

	if (!clanId) {
		context.errorReply("You are not currently a member of any clan.");
		return null;
	}

	const clan = await Clans.findOne({ _id: clanId });
	if (!clan) {
		context.errorReply(`Error: Your clan '${clanId}' was not found in the database.`);
		return null;
	}

	return { clan, clanId };
}

// ─── Clan by ID ──────────────────────────────────────────────────────────────

/**
 * Fetches a clan by its ID.
 * Sends an errorReply via the provided context if the clan is not found.
 *
 * @param clanId  - The clan ID to look up
 * @param context - The Chat.CommandContext to send error replies through
 * @returns The clan document, or null if not found
 */
export async function getClanById(
	clanId: ID,
	context: Chat.CommandContext
): Promise<ClanDoc | null> {
	const clan = await Clans.findOne({ _id: clanId });
	if (!clan) {
		context.errorReply(`Clan '${clanId}' not found.`);
		return null;
	}
	return clan;
}

// ─── Active War Context ──────────────────────────────────────────────────────

/**
 * Fetches the active war between two clans and both clan documents.
 * Sends an errorReply via the provided context if any step fails.
 *
 * @param clanId         - One of the two clan IDs
 * @param opponentClanId - The other clan ID
 * @param context        - The Chat.CommandContext to send error replies through
 * @returns A WarContext object, or null if any lookup failed
 */
export async function getActiveWarContext(
	clanId: ID,
	opponentClanId: ID,
	context: Chat.CommandContext
): Promise<WarContext | null> {
	const war = await ClanWars.findOne({
		clans: { $all: [clanId, opponentClanId] },
		status: 'active',
	});

	if (!war) {
		context.errorReply(`No active war found with '${opponentClanId}'.`);
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
	return { war, clan1, clan2, uhtmlId };
}

// ─── Pending War Context ─────────────────────────────────────────────────────

/**
 * Fetches a pending war between two clans and both clan documents.
 * Sends an errorReply via the provided context if any step fails.
 *
 * @param challengerClanId - The clan that issued the challenge (clans[0])
 * @param targetClanId     - The clan that received the challenge (clans[1])
 * @param context          - The Chat.CommandContext to send error replies through
 * @returns A WarContext object, or null if any lookup failed
 */
export async function getPendingWarContext(
	challengerClanId: ID,
	targetClanId: ID,
	context: Chat.CommandContext
): Promise<WarContext | null> {
	const war = await ClanWars.findOne({
		clans: [challengerClanId, targetClanId],
		status: 'pending',
	});

	if (!war) {
		context.errorReply(`No pending war challenge found from '${challengerClanId}'.`);
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
	return { war, clan1, clan2, uhtmlId };
}

// ─── Dual Clan Context ───────────────────────────────────────────────────────

/**
 * Fetches both the user's clan and an opponent clan in one call.
 * Sends an errorReply via the provided context if any step fails.
 *
 * @param userId         - The acting user's ID
 * @param opponentClanId - The opponent clan ID
 * @param context        - The Chat.CommandContext to send error replies through
 * @returns A DualClanContext object, or null if any lookup failed
 */
export async function getDualClanContext(
	userId: ID,
	opponentClanId: ID,
	context: Chat.CommandContext
): Promise<DualClanContext | null> {
	const clanCtx = await getClanContext(userId, context);
	if (!clanCtx) return null;

	const opponentClan = await getClanById(opponentClanId, context);
	if (!opponentClan) return null;

	if (clanCtx.clanId === opponentClanId) {
		context.errorReply("You cannot target your own clan.");
		return null;
	}

	return {
		myClan: clanCtx.clan,
		myClanId: clanCtx.clanId,
		opponentClan,
		opponentClanId,
	};
}

// ─── Existing War Check ──────────────────────────────────────────────────────

/**
 * Checks whether a clan already has a pending or active war.
 * Returns the existing war document if found, or null if the clan is free.
 *
 * @param clanId - The clan ID to check
 * @returns The existing ClanWar or null
 */
export async function getExistingWar(clanId: ID): Promise<ClanWar | null> {
	return ClanWars.findOne({
		clans: clanId,
		status: { $in: ['pending', 'active'] },
	});
}

// ─── Member Validation ───────────────────────────────────────────────────────

/**
 * Checks that a target user is a member of the given clan.
 * Sends an errorReply via the provided context if not.
 *
 * @param clan    - The clan document
 * @param targetId - The user ID to check membership for
 * @param context  - The Chat.CommandContext to send error replies through
 * @returns True if the user is a member, false otherwise
 */
export function assertClanMember(
	clan: ClanDoc,
	targetId: ID,
	context: Chat.CommandContext
): boolean {
	if (!clan.members[targetId]) {
		context.errorReply(`'${targetId}' is not a member of ${clan.name}.`);
		return false;
	}
	return true;
}

/**
 * Checks that a target user is NOT the clan owner.
 * Sends an errorReply via the provided context if they are.
 *
 * @param clan     - The clan document
 * @param targetId - The user ID to check
 * @param context  - The Chat.CommandContext to send error replies through
 * @returns True if the user is not the owner, false otherwise
 */
export function assertNotOwner(
	clan: ClanDoc,
	targetId: ID,
	context: Chat.CommandContext
): boolean {
	if (clan.owner === targetId) {
		context.errorReply("This action cannot be performed on the clan owner.");
		return false;
	}
	return true;
}
