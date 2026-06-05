import type * as sqlite from 'better-sqlite3';
import type { TransactionEnvironment } from '../../../lib/sql';

export const statements = {
	deleteSaveSlots: 'DELETE FROM save_slots WHERE userid = ?',
	insertSaveSlot: 'INSERT INTO save_slots (userid, slot, state) VALUES (?, ?, ?)',
	deleteEggs: 'DELETE FROM eggs WHERE userid = ?',
	insertEgg: 'INSERT INTO eggs (userid, species, wavesRemaining, bannerType, tier, shiny, hiddenAbility) VALUES (?, ?, ?, ?, ?, ?, ?)',
};

export const transactions = {
	saveSlots: (
		data: { userid: string, slots: { slot: number, state: string }[] },
		env: TransactionEnvironment
	) => {
		const deleteStmt = env.statements.get(statements.deleteSaveSlots)!;
		const insertStmt = env.statements.get(statements.insertSaveSlot)!;

		deleteStmt.run(data.userid);
		for (const slot of data.slots) {
			insertStmt.run(data.userid, slot.slot, slot.state);
		}
	},
	saveEggs: (
		data: { userid: string, eggs: any[] },
		env: TransactionEnvironment
	) => {
		const deleteStmt = env.statements.get(statements.deleteEggs)!;
		const insertStmt = env.statements.get(statements.insertEgg)!;

		deleteStmt.run(data.userid);
		for (const egg of data.eggs) {
			insertStmt.run(data.userid, egg.species, egg.wavesRemaining, egg.bannerType, egg.tier, egg.shiny, egg.hiddenAbility);
		}
	},
};
