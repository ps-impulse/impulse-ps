/*
 * Pokemon Showdown - Impulse Server
 * Clans ELO Helper
 * @author PrinceSky-Git
 */

import { ELO_K_FACTOR, DEFAULT_ELO, MIN_ELO_CHANGE } from '../constants';

/**
 * Calculates the expected score for player A against player B
 * using the standard ELO expected score formula.
 *
 * @param eloA - ELO rating of player A
 * @param eloB - ELO rating of player B
 * @returns A number between 0 and 1 representing the expected score
 */
export function getExpectedScore(eloA: number, eloB: number): number {
	return 1 / (1 + 10 ** ((eloB - eloA) / 400));
}

/**
 * Calculates new ELO ratings after a match between a winner and a loser.
 *
 * @param winnerElo - Current ELO of the winner
 * @param loserElo - Current ELO of the loser
 * @returns A tuple of [newWinnerElo, newLoserElo, eloChange]
 */
export function calculateElo(
	winnerElo: number,
	loserElo: number
): [number, number, number] {
	const expectedWinner = getExpectedScore(winnerElo, loserElo);
	const eloChange = Math.max(MIN_ELO_CHANGE, Math.round(ELO_K_FACTOR * (1 - expectedWinner)));

	const newWinnerElo = winnerElo + eloChange;
	const newLoserElo = loserElo - eloChange;

	return [newWinnerElo, newLoserElo, eloChange];
}

/**
 * Safely retrieves a clan's ELO rating, falling back to the default
 * if the value is missing or invalid.
 *
 * @param elo - The raw ELO value from the clan document
 * @returns A valid ELO number
 */
export function safeElo(elo: number | undefined): number {
	return (typeof elo === 'number' && elo > 0) ? elo : DEFAULT_ELO;
}

/**
 * Returns a display-ready floored ELO string.
 *
 * @param elo - The raw ELO value from the clan document
 * @returns A floored integer ELO as a number
 */
export function displayElo(elo: number | undefined): number {
	return Math.floor(safeElo(elo));
}
