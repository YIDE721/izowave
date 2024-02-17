import { Enemy } from '..';
import { DIFFICULTY } from '../../../../../../../const/difficulty';
import { EnemyTexture } from '../types';

import type { EnemyVariantData } from '../types';
import type { IWorld } from '~scene/world/types';

import { progressionQuadratic } from '~lib/progression';

export class EnemyTank extends Enemy {
  static SpawnWaveRange = [6];

  constructor(scene: IWorld, data: EnemyVariantData) {
    super(scene, {
      ...data,
      texture: EnemyTexture.TANK,
      multipliers: {
        health: 1.8,
        damage: 0.6,
        speed: 0.7,
        might: 1.5,
      },
    });

    const armour = progressionQuadratic({
      defaultValue: DIFFICULTY.ENEMY_ARMOUR * scene.game.getDifficultyMultiplier(),
      scale: DIFFICULTY.ENEMY_ARMOUR_GROWTH,
      level: scene.wave.number,
      retardationLevel: DIFFICULTY.ENEMY_ARMOUR_GROWTH_RETARDATION_LEVEL,
    });

    this.live.setMaxArmour(armour);
    this.live.setArmour(armour);

    this.addIndicator('armour', {
      color: 0x00d4ff,
      value: () => this.live.armour / this.live.maxArmour,
      destroyIf: (value: number) => value === 0,
    });
  }
}
