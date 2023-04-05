import { DIFFICULTY } from '~const/world/difficulty';
import { BUILDING_RESOURCES_LEFT_ALERT } from '~const/world/entities/building';
import { Building } from '~entity/building';
import { World } from '~scene/world';
import { Particles } from '~scene/world/effects';
import { InterfaceColor } from '~type/interface';
import { NoticeType } from '~type/screen';
import { ParticlesType } from '~type/world/effects';
import {
  BuildingAudio, BuildingParam, BuildingEvents, BuildingTexture, BuildingVariant, BuildingVariantData, BuildingIcon,
} from '~type/world/entities/building';

export class BuildingGenerator extends Building {
  static Name = 'Generator';

  static Description = 'Resource generation for builds and upgrades';

  static Params: BuildingParam[] = [
    { label: 'HEALTH', value: DIFFICULTY.BUILDING_GENERATOR_HEALTH, icon: BuildingIcon.HEALTH },
    { label: 'RESOURCES', value: DIFFICULTY.BUILDING_GENERATOR_RESOURCES, icon: BuildingIcon.RESOURCES },
  ];

  static Texture = BuildingTexture.GENERATOR;

  static Cost = DIFFICULTY.BUILDING_GENERATOR_COST;

  static Health = DIFFICULTY.BUILDING_GENERATOR_HEALTH;

  static Limit = DIFFICULTY.BUILDING_GENERATOR_LIMIT;

  /**
   * Resources amount left.
   */
  private amountLeft: number = DIFFICULTY.BUILDING_GENERATOR_RESOURCES;

  /**
   * Building variant constructor.
   */
  constructor(scene: World, data: BuildingVariantData) {
    super(scene, {
      ...data,
      variant: BuildingVariant.GENERATOR,
      health: BuildingGenerator.Health,
      texture: BuildingGenerator.Texture,
      actions: {
        pause: DIFFICULTY.BUILDING_GENERATOR_GENERATE_PAUSE,
      },
    });

    this.on(BuildingEvents.UPGRADE, this.upgradeAmount, this);
  }

  /**
   * Add amount left to building info.
   */
  public getInfo() {
    return [
      ...super.getInfo(), {
        label: 'RESOURCES',
        icon: BuildingIcon.RESOURCES,
        color: (this.amountLeft < BUILDING_RESOURCES_LEFT_ALERT)
          ? InterfaceColor.WARN
          : undefined,
        value: this.amountLeft,
      },
    ];
  }

  /**
   * Generate resource and check amount left.
   */
  public update() {
    super.update();

    if (!this.isAllowAction()) {
      return;
    }

    this.generateResource();

    if (this.amountLeft === 0) {
      this.scene.sound.play(BuildingAudio.OVER);
      this.scene.game.screen.notice(NoticeType.WARN, `${this.getMeta().Name} RESOURCES ARE OVER`);

      this.destroy();
    } else {
      this.pauseActions();

      if (this.amountLeft === BUILDING_RESOURCES_LEFT_ALERT) {
        this.alert = true;
      }
    }
  }

  /**
   * Generate resource and give to player.
   */
  private generateResource() {
    this.scene.player.giveResources(1);
    this.amountLeft--;

    if (this.visible) {
      new Particles(this, {
        type: ParticlesType.BIT,
        duration: 300,
        params: {
          x: this.x,
          y: this.y + 10 - (this.upgradeLevel * 2.5),
          lifespan: { min: 100, max: 200 },
          scale: { start: 1.0, end: 0.5 },
          speed: 70,
          maxParticles: 6,
          tint: 0x2dffb2,
        },
      });
    }
  }

  /**
   * Update amount left by upgrade level.
   */
  private upgradeAmount() {
    this.amountLeft += DIFFICULTY.BUILDING_GENERATOR_RESOURCES_UPGRADE * (this.upgradeLevel - 1);
    this.alert = false;
  }
}
