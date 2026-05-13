export const Rulesets: {[k: string]: FormatData} = {
	pokerogueclassic: {
		effectType: 'Rule',
		name: 'PokeRogue Classic',
		desc: 'Applies Boss Shields to designated Pokémon following exact PokéRogue Classic Mode mechanics.',

		onSwitchIn(pokemon) {
			if (pokemon.side.id === 'p2') {
				if (pokemon.side.pokemon.length !== 1) return;
				if (pokemon.volatiles['bossshield']) return;

				if (pokemon.species.id === 'eternatus') {
					pokemon.level = 200;
					
					const phase1Moves = ['dynamaxcannon', 'sludgebomb', 'flamethrower', 'cosmicpower'];
					pokemon.moveSlots = [];
					pokemon.baseMoveSlots = [];
					for (const moveid of phase1Moves) {
						const move = this.dex.moves.get(moveid);
						if (move.exists) {
							pokemon.moveSlots.push({
								move: move.name,
								id: move.id,
								pp: Math.floor(move.pp * 1.6),
								maxpp: Math.floor(move.pp * 1.6),
								target: move.target,
								disabled: false,
								used: false,
								virtual: true,
							});
						}
					}
					pokemon.setItem('lumberry');
					this.add('-message', `Eternatus radiates an overwhelming, otherworldly aura!`);
				}

				let shields = 0;

				if ([150, 162, 174, 188, 200].includes(pokemon.level)) {
					shields = 4;
				} else if ([84, 94, 104, 114, 126, 138].includes(pokemon.level)) {
					shields = 3;
				} else if ([38, 48, 56, 64, 74].includes(pokemon.level)) {
					shields = 2;
				} else if ([10, 16, 24, 32].includes(pokemon.level)) {
					shields = 1;
				} else {
					return;
				}

				const species = this.dex.species.get(pokemon.species.id);
				if (species.exists) {
					const bs = species.baseStats;
					const bst = bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe;
					if (bst >= 670) shields += 1;
				}

				if (shields > 0) {
					pokemon.m.maxShields = shields;
					pokemon.addVolatile('bossshield');
				}
			}
		},

		onModifyMovePriority: -1,
		onModifyMove(move, pokemon, target) {
			if (!target || target.side.id !== 'p2') return;
			if (!target.volatiles['bossshield']) return;

			if (move.ohko) {
				move.ohko = false;
				move.basePower = 200;
				move.accuracy = 100;
				this.add('-message', `OHKO moves deal 200 fixed BP damage against boss Pokémon!`);
			}
		},
	},

	pokerogueendless: {
		effectType: 'Rule',
		name: 'PokeRogue Endless',
		desc: 'Applies Endless Mode Boss Shields, Token Scaling, and the 250-Wave Eternatus loop.',

		onSwitchIn(pokemon) {
			if (pokemon.side.id === 'p2') {
				if (pokemon.side.pokemon.length !== 1) return;
				if (pokemon.volatiles['bossshield']) return;

				// --- 1. IDENTIFY FLOOR FROM NICKNAME ---
				const floorMatch = pokemon.name.match(/^FLOOR:(\d+)$/);
				if (!floorMatch) return;
				const estimatedFloor = parseInt(floorMatch[1]);
				const isBossWave = estimatedFloor % 10 === 0;

				this.add('-message', `[System] Floor ${estimatedFloor}. Boss Encounter: ${isBossWave}`);

				// --- 2. ENDLESS TOKENS SETUP ---
				// Base count: 1 per 50 floors, +1 bonus per Eternatus fight (every 250 floors)
				const baseTokenCount = Math.floor(estimatedFloor / 50) + Math.floor(estimatedFloor / 250);

				if (baseTokenCount > 0) {
					const species = this.dex.species.get(pokemon.species.id);
					const bs = species.exists ? species.baseStats : null;
					const bst = bs ? bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe : 0;
					const isParadoxOrLegendary = bst >= 670;
					const isEternatusFloor = isBossWave && estimatedFloor % 250 === 0;

					type TokenType = 'damage' | 'protection' | 'recovery' | 'fullheal' | 'endure' | 'paralyze' | 'poison' | 'burn';

					const commonPool: { token: TokenType; weight: number }[] = [
						{ token: 'damage',     weight: 9 },
						{ token: 'protection', weight: 9 },
						{ token: 'fullheal',   weight: 9 },
						{ token: 'endure',     weight: 4 },
						{ token: 'paralyze',   weight: 3 },
						{ token: 'poison',     weight: 3 },
						{ token: 'burn',       weight: 3 },
					];

					const greatPool: { token: TokenType; weight: number }[] = [
						{ token: 'damage',     weight: 5 },
						{ token: 'protection', weight: 5 },
						{ token: 'fullheal',   weight: 5 },
						{ token: 'endure',     weight: 5 },
					];

					const ultraPool: { token: TokenType; weight: number }[] = [
						{ token: 'damage',     weight: 10 },
						{ token: 'protection', weight: 10 },
						{ token: 'recovery',   weight: 10 },
						{ token: 'fullheal',   weight: 10 },
						{ token: 'endure',     weight: 10 },
					];

					const caps: Record<TokenType, number> = {
						damage: 999, protection: 999,
						recovery: 10, fullheal: 10, endure: 10,
						paralyze: 10, poison: 10, burn: 10,
					};

					const tokenMap: Partial<Record<TokenType, number>> = {};

					const drawFromPool = (pool: { token: TokenType; weight: number }[], count: number) => {
						const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
						for (let i = 0; i < count; i++) {
							let roll = Math.floor(Math.random() * totalWeight);
							for (const entry of pool) {
								roll -= entry.weight;
								if (roll < 0) {
									tokenMap[entry.token] = Math.min((tokenMap[entry.token] || 0) + 1, caps[entry.token]);
									break;
								}
							}
						}
					};

					if (isEternatusFloor) {
						drawFromPool(greatPool, baseTokenCount * 3);
					} else if (isParadoxOrLegendary && isBossWave) {
						drawFromPool(commonPool, baseTokenCount);
					} else {
						drawFromPool(commonPool, baseTokenCount);
					}

					if (tokenMap.damage)     pokemon.m.damageTokens     = tokenMap.damage;
					if (tokenMap.protection) pokemon.m.protectionTokens = tokenMap.protection;
					if (tokenMap.recovery)   pokemon.m.recoveryTokens   = tokenMap.recovery;
					if (tokenMap.fullheal)   pokemon.m.fullHealTokens   = tokenMap.fullheal;
					if (tokenMap.endure)     pokemon.m.endureTokens     = tokenMap.endure;
					if (tokenMap.paralyze)   pokemon.m.paralyzeTokens   = tokenMap.paralyze;
					if (tokenMap.poison)     pokemon.m.poisonTokens     = tokenMap.poison;
					if (tokenMap.burn)       pokemon.m.burnTokens       = tokenMap.burn;

					const summary = (Object.entries(tokenMap) as [TokenType, number][])
						.map(([k, v]) => `${k}x${v}`)
						.join(', ');
					this.add('-message', `[Endless Mode] Enemy tokens: ${summary}`);
				}

				// --- 3. ETERNATUS 250-FLOOR LOOP ---
				const isEternatusFloor = isBossWave && estimatedFloor % 250 === 0;

				if (isEternatusFloor || pokemon.species.id === 'eternatus') {
					if (pokemon.species.id !== 'eternatus') {
						pokemon.formeChange('Eternatus', this.effect, true);
					}

					const phase1Moves = ['dynamaxcannon', 'sludgebomb', 'flamethrower', 'cosmicpower'];
					pokemon.moveSlots = [];
					pokemon.baseMoveSlots = [];
					for (const moveid of phase1Moves) {
						const move = this.dex.moves.get(moveid);
						if (move.exists) {
							pokemon.moveSlots.push({
								move: move.name,
								id: move.id,
								pp: Math.floor(move.pp * 1.6),
								maxpp: Math.floor(move.pp * 1.6),
								target: move.target,
								disabled: false,
								used: false,
								virtual: true,
							});
						}
					}
					pokemon.setItem('lumberry');
					this.add('-message', `Eternatus radiates an overwhelming, otherworldly aura!`);
				}

				// --- 4. ENDLESS BOSS SHIELDS ---
				let shields = 0;
				if (isBossWave) {
					shields = 4;
					const species = this.dex.species.get(pokemon.species.id);
					if (species.exists) {
						const bs = species.baseStats;
						const bst = bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe;
						if (bst >= 670) shields += 1;
					}
				}

				if (shields > 0) {
					pokemon.m.maxShields = shields;
					pokemon.addVolatile('bossshield');
				}
			}
		},

		// --- ENDLESS TOKEN: DAMAGE & PROTECTION MODIFIERS ---
		onBasePowerPriority: 20,
		onBasePower(basePower, attacker, defender, move) {
			if (defender.side.id === 'p2' && defender.m.protectionTokens) {
				const tokens = Math.min(defender.m.protectionTokens, 999);
				const reductionMultiplier = Math.max(0.05, 1 - (tokens * 0.025));
				this.debug(`[Endless] Protection Token multiplier: ${reductionMultiplier}`);
				return this.chainModify(reductionMultiplier);
			}

			if (attacker.side.id === 'p2' && attacker.m.damageTokens) {
				const tokens = Math.min(attacker.m.damageTokens, 999);
				const damageMultiplier = 1 + (tokens * 0.05);
				this.debug(`[Endless] Damage Token multiplier: ${damageMultiplier}`);
				return this.chainModify(damageMultiplier);
			}
		},

		// --- ENDLESS TOKEN: ENDURE ---
		// Bypassed by OHKO moves and multi-hit moves per spec
		onDamage(damage, target, source, effect) {
			if (target.side.id === 'p2' && target.m.endureTokens && damage >= target.hp && effect && effect.effectType === 'Move') {
				if (effect.ohko) return damage;
				if ((effect as any).multihit) return damage;

				const tokens = Math.min(target.m.endureTokens, 10);
				const endureChance = tokens * 2; // 2% per stack, up to 20%

				if (this.randomChance(endureChance, 100)) {
					this.add('-message', `The wild ${target.name} endured the hit due to its Endure Tokens!`);
					return target.hp - 1;
				}
			}
			return damage;
		},

		// --- ENDLESS TOKEN: STATUS ON HIT (Paralyze / Poison / Burn) ---
		onAfterMoveSecondary(target, source, move) {
			if (source.side.id !== 'p2') return;
			if (!move || move.effectType !== 'Move') return;

			// Paralyze Token: 2.5% per stack
			if (source.m.paralyzeTokens && !target.status) {
				const tokens = Math.min(source.m.paralyzeTokens, 10);
				if (this.randomChance(Math.floor(tokens * 2.5 * 10), 1000)) {
					target.trySetStatus('par', source);
				}
			}

			// Poison Token: 5% per stack
			if (source.m.poisonTokens && !target.status) {
				const tokens = Math.min(source.m.poisonTokens, 10);
				if (this.randomChance(tokens * 5, 100)) {
					target.trySetStatus('psn', source);
				}
			}

			// Burn Token: 5% per stack
			if (source.m.burnTokens && !target.status) {
				const tokens = Math.min(source.m.burnTokens, 10);
				if (this.randomChance(tokens * 5, 100)) {
					target.trySetStatus('brn', source);
				}
			}
		},

		// --- ENDLESS TOKEN: RECOVERY & FULL HEAL ---
		onResidualOrder: 5,
		onResidual(pokemon) {
			if (pokemon.side.id !== 'p2') return;

			// Recovery Token: Heals 2% max HP per stack, capped at 10 stacks (20% max)
			if (pokemon.m.recoveryTokens && pokemon.hp < pokemon.maxhp) {
				const tokens = Math.min(pokemon.m.recoveryTokens, 10);
				const healAmount = Math.floor(pokemon.maxhp * tokens * 0.02);
				this.heal(healAmount, pokemon);
				this.add('-message', `The wild ${pokemon.name} restored its health using its Recovery Tokens!`);
			}

			// Full Heal Token: 2.5% per stack to cure status, capped at 10 stacks (25% max)
			if (pokemon.m.fullHealTokens && pokemon.status) {
				const tokens = Math.min(pokemon.m.fullHealTokens, 10);
				if (this.randomChance(Math.floor(tokens * 2.5 * 10), 1000)) {
					pokemon.cureStatus();
					this.add('-message', `The wild ${pokemon.name} cured its status condition using its Full Heal Tokens!`);
				}
			}
		},

		onModifyMovePriority: -1,
		onModifyMove(move, pokemon, target) {
			if (!target || target.side.id !== 'p2') return;
			if (!target.volatiles['bossshield']) return;

			if (move.ohko) {
				move.ohko = false;
				move.basePower = 200;
				move.accuracy = 100;
				this.add('-message', `OHKO moves deal 200 fixed BP damage against boss Pokémon!`);
			}
		},
	},

	pokerogueexptracker: {
		effectType: 'Rule',
		name: 'PokeRogue EXP Tracker',
		desc: 'Tracks participation natively and outputs exact EXP yields on faint.',

		onStart() {
			if (!(this as any).p1Participants) {
				(this as any).p1Participants = new Set<string>();
			}
		},

		onSwitchIn(pokemon) {
			if (pokemon.side.id === 'p1') {
				if (!(this as any).p1Participants) {
					(this as any).p1Participants = new Set<string>();
				}
				(this as any).p1Participants.add(pokemon.species.id);
			}
		},

		onFaint(pokemon) {
			if (pokemon.side.id === 'p2') {
				const participants = Array.from((this as any).p1Participants || []).join(',');
				const species = pokemon.species.id;
				const level = pokemon.level;
				
				this.add('-message', `PR_EXP|${species}|${level}|${participants}`);
				
				if ((this as any).p1Participants) {
					(this as any).p1Participants.clear();
				}
			}
		},
	},
};
