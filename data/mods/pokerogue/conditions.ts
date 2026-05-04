export const Conditions: {[k: string]: ConditionData} = {
	bossshield: {
		name: 'Boss Shield',
		noCopy: true,

		onStart(pokemon) {
			if (!pokemon.m.maxShields) pokemon.m.maxShields = 1;
			pokemon.m.brokenShields = 0;
			this.add('-start', pokemon, 'Boss Shield', '[silent]');
			this.add('-anim', pokemon, 'Reflect', pokemon);
			this.add('-message', ` BOSS SHIELDS: ${pokemon.m.maxShields}`);
		},

		onEnd(pokemon) {
			this.add('-end', pokemon, 'Boss Shield', '[silent]');
		},

		onTryHit(target, source, move) {
			// Bosses are immune to these specific moves
			if (['destinybond', 'perishsong', 'painsplit', 'endeavor'].includes(move.id)) {
				this.add('-immune', target, '[from] Boss Shield');
				this.add('-message', `Bosses are immune to ${move.name}!`);
				return null;
			}
		},

		onDamage(damage, target, source, effect) {
			// Ensure passive damage (burn, poison, salt cure) doesn't accidentally kill Phase 1 Eternatus
			if (effect && effect.effectType !== 'Move') {
				if (target.species.id === 'eternatus' && damage >= target.hp) {
					target.m.readyToTransform = true;
					return target.hp - 1; 
				}
				return damage;
			}
			
			if (!target.m.maxShields) return damage;

			const remainingShields = target.m.maxShields - (target.m.brokenShields || 0);
			
			let totalDamageDealt = 0;
			let remainingDamage = damage;
			let currentHP = target.hp;
			let brokenThisHit = 0;

			// If shields are left, calculate exponential damage drop-off
			if (remainingShields > 0) {
				while (remainingDamage > 0 && currentHP > 0) {
					let shieldsLeft = target.m.maxShields - (target.m.brokenShields || 0) - brokenThisHit;
					let nextThreshold = 0;
					
					if (shieldsLeft > 0) {
						nextThreshold = Math.ceil((target.maxhp * shieldsLeft) / (target.m.maxShields + 1));
					}

					let hpInCurrentSegment = currentHP - nextThreshold;

					if (hpInCurrentSegment <= 0 && shieldsLeft > 0) {
						hpInCurrentSegment = Math.ceil(target.maxhp / (target.m.maxShields + 1));
						nextThreshold = currentHP - hpInCurrentSegment;
					}

					if (remainingDamage < hpInCurrentSegment) {
						totalDamageDealt += remainingDamage;
						currentHP -= remainingDamage;
						remainingDamage = 0; 
					} else {
						totalDamageDealt += hpInCurrentSegment;
						currentHP = nextThreshold;
						remainingDamage -= hpInCurrentSegment;
						
						if (shieldsLeft > 0) {
							brokenThisHit++;
							remainingDamage = remainingDamage / 2; 
						} else {
							remainingDamage = 0; 
						}
					}
				}
			} else {
				// No shields left, just apply the rest of the damage
				totalDamageDealt = damage;
			}

			if (brokenThisHit > 0) {
				target.m.brokenThisHit = brokenThisHit;
			}
      
			// Prevents massive damage from one-shotting the boss and skipping Phase 2.
			// It caps the total damage at HP - 1 and flags it for transformation.
			if (target.species.id === 'eternatus' && totalDamageDealt >= target.hp) {
				totalDamageDealt = target.hp - 1;
				target.m.readyToTransform = true;
			}

			return totalDamageDealt;
		},

		onAfterMoveSecondary(target, source, move) {
      // handles stat boosts from breaking shields
			if (target.m.brokenThisHit) {
				const brokenCount = target.m.brokenThisHit;
				target.m.brokenShields = (target.m.brokenShields || 0) + brokenCount;
				const remaining = target.m.maxShields - target.m.brokenShields;
				
				this.add('-message', `A shield broke! BOSS SHIELDS: ${Math.max(0, remaining)}`);

				// Grant 1 random stat boost PER broken shield
				const stats = ['atk', 'def', 'spa', 'spd', 'spe'] as const;
				for (let i = 0; i < brokenCount; i++) {
					const stat = this.sample(stats);
					this.boost({ [stat]: 1 }, target, target, null, true);
				}

				if (target.item) {
					const item = target.getItem();
					if (item.isBerry) {
						target.eatItem(true);
					}
				}

				target.m.brokenThisHit = 0;
			}
		},

		onUpdate(pokemon) {
			// Triggers dynamically only when Phase 1 HP is fully depleted and it survived via our override
			if (pokemon.m.readyToTransform && pokemon.species.id === 'eternatus') {
				pokemon.m.readyToTransform = false;

				this.add('-message', `Eternatus's health was fully depleted!`);
				this.add('-message', `Eternatus is absorbing massive amounts of energy...`);
				
				// Transform into Eternamax
				pokemon.formeChange('Eternatus-Eternamax', this.effect, true);
				
				// Fully heal and clear Phase 1 stat changes
				this.heal(pokemon.maxhp, pokemon, pokemon);
				pokemon.clearBoosts();
				this.add('-clearboost', pokemon);
				
				// Hardcode Phase 2 Moveset (Eternamax)
				const phase2Moves = ['eternabeam', 'sludgebomb', 'flamethrower', 'recover'];
				pokemon.moveSlots = [];
				pokemon.baseMoveSlots = [];
				for (const moveid of phase2Moves) {
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

				pokemon.setItem('sitrusberry');

				// Grant Phase 2 Shields (Eternamax gets 5)
				pokemon.m.maxShields = 5;
				pokemon.m.brokenShields = 0;
				
				this.add('-message', `Eternatus transformed into Eternamax Eternatus!`);
				this.add('-message', ` PHASE 2 BOSS SHIELDS: ${pokemon.m.maxShields}`);
				
			} else if (pokemon.hp <= 0 && pokemon.species.id !== 'eternatus') {
				// Standard boss dying cleanup
				pokemon.removeVolatile('bossshield');
			}
		},
	},
};
