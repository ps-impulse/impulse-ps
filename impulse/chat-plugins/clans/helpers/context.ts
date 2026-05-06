import { Clans, UserClans, ClanWars, type ClanDoc } from '../database';
import type { ClanWar } from '../interface';

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

export async function getExistingWar(clanId: ID): Promise<ClanWar | null> {
	return ClanWars.findOne({
		clans: clanId,
		status: { $in: ['pending', 'active'] },
	});
}

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
