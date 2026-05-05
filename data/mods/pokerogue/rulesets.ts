export const Rulesets: {[k: string]: FormatData} = {
	pokerogueclassic: {
		effectType: 'Rule',
		name: 'PokeRogue Classic',
		desc: 'Applies Boss Shields to designated Pokémon following exact PokéRogue Classic Mode mechanics.',

		onSwitchIn(pokemon) {
			if (pokemon.side.id === 'p2') {
				if (pokemon.side.pokemon.length !== 1) return;
				if (pokemon.volatiles['bossshield']) return;

				// --- HARDCODE ETERNATUS PHASE 1 ---
				if (pokemon.species.id === 'eternatus') {
					pokemon.level = 200; // Force Level 200
					
					// Force canonical PokéRogue Phase 1 Moveset
					const phase1Moves = ['dynamaxcannon', 'sludgebomb', 'flamethrower', 'cosmicpower'];
					pokemon.moveSlots = [];
					pokemon.baseMoveSlots = [];
					for (const moveid of phase1Moves) {
						const move = this.dex.moves.get(moveid);
						if (move.exists) {
							pokemon.moveSlots.push({
								move: move.name,
								id: move.id,
								pp: Math.floor(move.pp * 1.6), // Max PP
								maxpp: Math.floor(move.pp * 1.6),
								target: move.target,
								disabled: false,
								used: false,
								virtual: true,
							});
						}
					}
					// Give it a Lum Berry to block the first status condition
					pokemon.setItem('lumberry');
					this.add('-message', `Eternatus radiates an overwhelming, otherworldly aura!`);
				}
				// ----------------------------------

				let shields = 0;

				// Exact Classic Mode Boss Levels mapped to base shield counts
				if ([150, 162, 174, 188, 200].includes(pokemon.level)) {
					shields = 4; // Waves 160 - 200
				} else if ([84, 94, 104, 114, 126, 138].includes(pokemon.level)) {
					shields = 3; // Waves 100 - 150
				} else if ([38, 48, 56, 64, 74].includes(pokemon.level)) {
					shields = 2; // Waves 50 - 90
				} else if ([10, 16, 24, 32].includes(pokemon.level)) {
					shields = 1; // Waves 10 - 40
				} else {
					return; // If the level doesn't exactly match a boss wave cap, no shields are applied!
				}

				// Legendary/Paradox check (BST >= 670 gets +1 Shield)
				const species = this.dex.species.get(pokemon.species.id);
				if (species.exists) {
					const bs = species.baseStats;
					const bst = bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe;
					if (bst >= 670) {
						shields += 1;
					}
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
				move.basePower = 200; // Accurately reflects PokéRogue's 200 BP override
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

				// --- 1. REVERSE-ENGINEER THE WAVE & CHECK FOR BOSS ---
				let estimatedWave = 1;
				let isBossWave = false;
				const L = pokemon.level;
				
				if (L > 5) {
					// Reverse PokéRogue's quadratic formula
					const Y = (L - 2) / 1.2 - 1;
					const exactWave = (-312.5 + Math.sqrt(97656.25 + 2500 * Y)) / 2;
					
					// Get the 10-wave bracket this level belongs to
					estimatedWave = Math.ceil(Math.max(1, exactWave) / 10) * 10; 
					
					// Forward-calculate the exact Boss Cap for this bracket
					const baseLevel = (1 + estimatedWave / 2 + Math.pow(estimatedWave / 25, 2)) * 1.2;
					const cap = Math.ceil(baseLevel / 2) * 2 + 2;

					// If the level EXACTLY matches the cap, we know for a fact it's a boss!
					isBossWave = (L === cap);
				}

				this.add('-message', `[System] Level ${L} recognized as Wave Bracket ${estimatedWave}. Boss Encounter: ${isBossWave}`);

				// --- 2. ENDLESS TOKENS SETUP ---
				// Enemies gain tokens every 50 waves. 
				const tokenStacks = Math.floor(estimatedWave / 50);
				if (tokenStacks > 0) {
					pokemon.m.damageTokens = tokenStacks;
					pokemon.m.protectionTokens = tokenStacks;
					pokemon.m.endureTokens = tokenStacks;
					pokemon.m.recoveryTokens = tokenStacks;
					pokemon.m.fullHealTokens = tokenStacks;
					
					this.add('-message', `[Endless Mode] Enemy has ${tokenStacks}x Token Stacks applied!`);
				}

				// --- 3. ETERNATUS 250-WAVE LOOP ---
				// Only triggers if it's the exact Boss Wave AND a multiple of 250
				const isEternatusWave = isBossWave && estimatedWave > 0 && estimatedWave % 250 === 0;
				
				if (isEternatusWave || pokemon.species.id === 'eternatus') {
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
				// Endless bosses get 4 shields. Major Legendaries (BST >= 670) get 5.
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
			// Protection Token: Reduces damage taken by the P2 enemy (2.5% per stack)
			if (defender.side.id === 'p2' && defender.m.protectionTokens) {
				const tokens = Math.min(defender.m.protectionTokens, 999);
				const reductionMultiplier = Math.max(0.05, 1 - (tokens * 0.025)); 
				this.debug(`[Endless] Protection Token multiplier: ${reductionMultiplier}`);
				return this.chainModify(reductionMultiplier);
			}
			
			// Damage Token: Increases damage dealt by the P2 enemy (5% per stack)
			if (attacker.side.id === 'p2' && attacker.m.damageTokens) {
				const tokens = Math.min(attacker.m.damageTokens, 999);
				const damageMultiplier = 1 + (tokens * 0.05);
				this.debug(`[Endless] Damage Token multiplier: ${damageMultiplier}`);
				return this.chainModify(damageMultiplier);
			}
		},

		// --- ENDLESS TOKEN: ENDURE ---
		onDamage(damage, target, source, effect) {
			if (target.side.id === 'p2' && target.m.endureTokens && damage >= target.hp && effect && effect.effectType === 'Move') {
				if (effect.ohko) return damage;

				const tokens = Math.min(target.m.endureTokens, 50);
				const endureChance = tokens * 2; // 2% per stack

				if (this.randomChance(endureChance, 100)) {
					this.add('-message', `The wild ${target.name} endured the hit due to its Endure Tokens!`);
					return target.hp - 1;
				}
			}
			return damage;
		},

		// --- ENDLESS TOKEN: RECOVERY & FULL HEAL ---
		onResidualOrder: 5,
		onResidual(pokemon) {
			if (pokemon.side.id !== 'p2') return;

			// Recovery Token: Heals 2% max HP per stack at the end of the turn
			if (pokemon.m.recoveryTokens) {
				const tokens = Math.min(pokemon.m.recoveryTokens, 10);
				const healPercent = tokens * 0.02; // 2% per stack, up to 20%
				
				if (pokemon.hp < pokemon.maxhp) {
					this.heal(pokemon.maxhp * healPercent);
					this.add('-message', `The wild ${pokemon.name} restored its health using its Recovery Tokens!`);
				}
			}

			// Full Heal Token: 2.5% chance per stack to cure status
			if (pokemon.m.fullHealTokens && pokemon.status) {
				const tokens = Math.min(pokemon.m.fullHealTokens, 10);
				const cureChance = tokens * 2.5; // 2.5% per stack, up to 25%

				if (this.randomChance(cureChance, 100)) {
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
			// 'this' is the Battle object. We safely attach our tracker directly to it.
			if (!(this as any).p1Participants) {
				(this as any).p1Participants = new Set<string>();
			}
		},

		onSwitchIn(pokemon) {
			if (pokemon.side.id === 'p1') {
				if (!(this as any).p1Participants) {
					(this as any).p1Participants = new Set<string>();
				}
				// Add the base species ID to the participant tracker
				(this as any).p1Participants.add(pokemon.species.id);
			}
		},

		onFaint(pokemon) {
			// When an ENEMY faints, output the data we need for backend EXP math
			if (pokemon.side.id === 'p2') {
				const participants = Array.from((this as any).p1Participants || []).join(',');
				const species = pokemon.species.id;
				const level = pokemon.level;
				
				// Output a clean, easy-to-parse message to the battle log
				this.add('-message', `PR_EXP|${species}|${level}|${participants}`);
				
				// Clear the participants for the next opponent
				if ((this as any).p1Participants) {
					(this as any).p1Participants.clear();
				}
			}
		}
	},
};
