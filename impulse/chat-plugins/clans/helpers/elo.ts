import { ELO_K_FACTOR, DEFAULT_ELO, MIN_ELO_CHANGE } from '../constants';

export function getExpectedScore(eloA: number, eloB: number): number {
	return 1 / (1 + 10 ** ((eloB - eloA) / 400));
}

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

export function safeElo(elo: number | undefined): number {
	return (typeof elo === 'number' && elo > 0) ? elo : DEFAULT_ELO;
}

export function displayElo(elo: number | undefined): number {
	return Math.floor(safeElo(elo));
}
