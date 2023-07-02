import Phaser from 'phaser';

import { DIFFICULTY } from '~const/world/difficulty';
import { TILE_META } from '~const/world/level';
import { registerAudioAssets, registerSpriteAssets } from '~lib/assets';
import { progression } from '~lib/utils';
import { Level } from '~scene/world/level';
import { IWorld } from '~type/world';
import {
  CrystalTexture, CrystalData, CrystalAudio, ICrystal,
} from '~type/world/entities/crystal';
import { TileType } from '~type/world/level';
import { ITile } from '~type/world/level/tile-matrix';

export class Crystal extends Phaser.GameObjects.Image implements ICrystal, ITile {
  readonly scene: IWorld;

  readonly tileType: TileType = TileType.CRYSTAL;

  constructor(scene: IWorld, {
    positionAtMatrix, variant = 0,
  }: CrystalData) {
    const tilePosition = { ...positionAtMatrix, z: 1 };
    const positionAtWorld = Level.ToWorldPosition(tilePosition);

    super(scene, positionAtWorld.x, positionAtWorld.y, CrystalTexture.CRYSTAL, variant);
    scene.add.existing(this);
    scene.entityGroups.crystals.add(this);

    const isVisibleTile = this.scene.level.isVisibleTile({ ...positionAtMatrix, z: 0 });

    this.setVisible(isVisibleTile);

    this.setDepth(Level.GetTileDepth(positionAtWorld.y, tilePosition.z));
    this.setOrigin(0.5, TILE_META.origin);
    this.scene.level.putTile(this, tilePosition);
  }

  public pickup() {
    const resources = progression(
      Phaser.Math.Between(
        DIFFICULTY.CRYSTAL_RESOURCES - Math.floor(DIFFICULTY.CRYSTAL_RESOURCES * 0.5),
        DIFFICULTY.CRYSTAL_RESOURCES + Math.floor(DIFFICULTY.CRYSTAL_RESOURCES * 0.5),
      ),
      DIFFICULTY.CRYSTAL_RESOURCES_GROWTH,
      this.scene.wave.number,
    );

    this.scene.player.giveResources(resources);

    this.scene.sound.play(CrystalAudio.PICKUP);

    this.destroy();
  }
}

registerAudioAssets(CrystalAudio);
registerSpriteAssets(CrystalTexture, {
  width: 40,
  height: 40,
});
