import { DIFFICULTY } from '~const/difficulty';
import { World } from '~scene/world';
import { ScreenIcon } from '~type/screen';
import { NoticeType } from '~type/screen/notice';
import {
  BuildingAudio,
  BuildingDescriptionItem, BuildingEvents, BuildingTexture, BuildingVariant,
} from '~type/world/entities/building';

import { Building } from '../building';

export class BuildingAmmunition extends Building {
  static Name = 'Ammunition';

  static Description = [
    { text: 'Reloading towers ammo, that are in radius of this building', type: 'text' },
    { text: 'Health: 300', icon: ScreenIcon.HEALTH },
    { text: 'Radius: 160', icon: ScreenIcon.RADIUS },
    { text: `Ammo: ${DIFFICULTY.AMMUNITION_AMMO}`, icon: ScreenIcon.AMMO },
  ];

  static Texture = BuildingTexture.AMMUNITION;

  static Cost = { bronze: 20, silver: 20, gold: 5 };

  static UpgradeCost = { bronze: 30, silver: 30, gold: 40 };

  static Health = 300;

  static Limit = DIFFICULTY.AMMUNITION_LIMIT;

  /**
   * Ammo amount left.
   */
  private _amountLeft: number = DIFFICULTY.AMMUNITION_AMMO;

  public get amountLeft() { return this._amountLeft; }

  private set amountLeft(v) { this._amountLeft = v; }

  /**
   * Building variant constructor.
   */
  constructor(scene: World, positionAtMatrix: Phaser.Types.Math.Vector2Like) {
    super(scene, {
      positionAtMatrix,
      variant: BuildingVariant.AMMUNITION,
      health: BuildingAmmunition.Health,
      texture: BuildingAmmunition.Texture,
      upgradeCost: BuildingAmmunition.UpgradeCost,
      actions: {
        radius: 160, // Reload towers radius
      },
    });

    this.on(BuildingEvents.UPGRADE, this.upgradeAmount, this);
  }

  /**
   * Add amount left to building info.
   */
  public getInfo(): BuildingDescriptionItem[] {
    const nextLeft = this.isAllowUpgrade()
      ? this.amountLeft + (DIFFICULTY.AMMUNITION_AMMO_UPGRADE * this.upgradeLevel)
      : null;

    return [
      ...super.getInfo(), {
        text: `Left: ${this.amountLeft}`,
        post: nextLeft,
        icon: ScreenIcon.AMMO,
      },
    ];
  }

  /**
   * Use ammo.
   */
  public use(amount: number): number {
    if (this.amountLeft <= amount) {
      const left = this.amountLeft;

      this.scene.sound.play(BuildingAudio.OVER);
      this.scene.screen.message(NoticeType.WARN, `${this.getName()} ARE OVER`);

      this.destroy();

      return left;
    }

    this.amountLeft -= amount;

    return amount;
  }

  /**
   * Update amount left.
   */
  private upgradeAmount() {
    this.amountLeft += DIFFICULTY.AMMUNITION_AMMO_UPGRADE * (this.upgradeLevel - 1);
  }
}
