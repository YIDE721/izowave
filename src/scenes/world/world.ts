import Phaser from 'phaser';

import { AUDIO_VOLUME, DIFFICULTY_KEY, DIFFICULTY_POWERS } from '~const/core';
import { ENEMIES } from '~const/enemies';
import { ENEMY_SPAWN_DISTANCE_FROM_BUILDING, ENEMY_SPAWN_DISTANCE_FROM_PLAYER, ENEMY_SPAWN_POSITIONS } from '~const/enemy';
import { INPUT_KEY } from '~const/keyboard';
import { LEVEL_BUILDING_PATH_COST, LEVEL_CORNER_PATH_COST, LEVEL_MAP_SIZE } from '~const/level';
import { NPC_PATH_RATE } from '~const/npc';
import { WORLD_DEPTH_EFFECT } from '~const/world';
import { Building } from '~entity/building';
import { Chest } from '~entity/chest';
import { NPC } from '~entity/npc';
import { Assistant } from '~entity/npc/variants/assistant';
import { Enemy } from '~entity/npc/variants/enemy';
import { Player } from '~entity/player';
import { ShotBall } from '~entity/shot/ball';
import { trackProgressionEvent } from '~lib/analytics';
import { getAssetsPack } from '~lib/assets';
import { setCheatsScheme } from '~lib/cheats';
import { shaders } from '~lib/shaders';
import { removeLoading, setLoadingStatus } from '~lib/state';
import { entries } from '~lib/system';
import { selectClosest } from '~lib/utils';
import { Screen } from '~scene/screen';
import { Builder } from '~scene/world/builder';
import { Level } from '~scene/world/level';
import { Tutorial } from '~scene/world/tutorial';
import { Wave } from '~scene/world/wave';
import { Difficulty } from '~type/core';
import { SceneKey } from '~type/scene';
import { TutorialStep } from '~type/tutorial';
import { WorldEvents } from '~type/world';
import { ParticlesList, ParticlesTexture, ParticlesType } from '~type/world/effects';
import { BuildingVariant } from '~type/world/entities/building';
import { EnemyVariant } from '~type/world/entities/npc/enemy';
import { PlayerStat } from '~type/world/entities/player';
import { SpawnTarget } from '~type/world/level';
import { WaveEvents } from '~type/world/wave';

export class World extends Phaser.Scene {
  /**
   * Group of all NPC.
   */
  private _npc: Phaser.GameObjects.Group;

  public get npc() { return this._npc; }

  private set npc(v) { this._npc = v; }

  /**
   * Group of all enemies.
   */
  private _enemies: Phaser.GameObjects.Group;

  public get enemies() { return this._enemies; }

  private set enemies(v) { this._enemies = v; }

  /**
   * Group of all buildings.
   */

  private _buildings: Phaser.GameObjects.Group;

  public get buildings() { return this._buildings; }

  private set buildings(v) { this._buildings = v; }

  /**
   * Group of all chests.
   */
  private _chests: Phaser.GameObjects.Group;

  public get chests() { return this._chests; }

  private set chests(v) { this._chests = v; }

  /**
   * Group of all shots.
   */
  private _shots: Phaser.GameObjects.Group;

  public get shots() { return this._shots; }

  private set shots(v) { this._shots = v; }

  /**
   * Screen scene.
   */
  private _screen: Screen;

  public get screen() { return this._screen; }

  private set screen(v) { this._screen = v; }

  /**
   * Particles manager.
   */
  private _particles: ParticlesList = {};

  public get particles() { return this._particles; }

  private set particles(v) { this._particles = v; }

  /**
   * Game difficulty type.
   */
  private _difficultyType: Difficulty;

  public get difficultyType() { return this._difficultyType; }

  private set difficultyType(v) { this._difficultyType = v; }

  /**
   * Game difficulty multiply.
   */
  private _difficulty: number;

  public get difficulty() { return this._difficulty; }

  private set difficulty(v) { this._difficulty = v; }

  /**
   * Player.
   */
  private _player: Player;

  public get player() { return this._player; }

  private set player(v) { this._player = v; }

  /**
   * Level.
   */
  private _level: Level;

  public get level() { return this._level; }

  private set level(v) { this._level = v; }

  /**
   * Wave.
   */
  private _wave: Wave;

  public get wave() { return this._wave; }

  private set wave(v) { this._wave = v; }

  /**
   * Builder.
   */
  private _builder: Builder;

  public get builder() { return this._builder; }

  private set builder(v) { this._builder = v; }

  /**
   * Enemies positions for spawn.
   */
  private enemySpawnPositions: Phaser.Types.Math.Vector2Like[] = [];

  /**
   * Global game timer.
   */
  private timer: Phaser.Time.TimerEvent;

  /**
   * Game is started.
   */
  private isStarted: boolean = false;

  /**
   * Pause for finding enemy path to player.
   */
  private nextFindPathTimestamp: number = 0;

  /**
   * Tutorial.
   */
  public tutorial: Tutorial;

  /**
   * World constructor.
   */
  constructor() {
    super({
      key: SceneKey.WORLD,
      pack: getAssetsPack(),
    });

    if (IS_DEV_MODE) {
      window.WORLD = this;
    }

    setLoadingStatus('ASSETS LOADING');
  }

  /**
   * Create world and open menu.
   */
  public create() {
    if (!localStorage.getItem(DIFFICULTY_KEY)) {
      localStorage.setItem(DIFFICULTY_KEY, Difficulty.NORMAL);
    }

    this.registerOptimization();
    this.registerShaders();
    this.registerParticles();

    this.makeLevel();
    this.addEntityGroups();

    this.screen = <Screen> this.scene.get(SceneKey.SCREEN);
    this.enemySpawnPositions = this.level.readSpawnPositions(SpawnTarget.ENEMY);
    this.tutorial = new Tutorial();

    this.timer = this.time.addEvent({
      delay: Number.MAX_SAFE_INTEGER,
      paused: (this.tutorial.step !== TutorialStep.DONE),
    });

    this.sound.setVolume(AUDIO_VOLUME);
    this.scene.launch(SceneKey.MENU);

    removeLoading();
  }

  /**
   * Get current game time.
   */
  public getTimerNow(): number {
    return Math.floor(this.timer.getElapsed());
  }

  /**
   *
   */
  public unpauseProcess() {
    this.timer.paused = false;
  }

  /**
   * Call update events.
   */
  public update() {
    if (!this.isStarted) {
      return;
    }

    try {
      this.player.update();
    } catch (e) {
      console.error('Error on `Player` update:', e);
    }

    try {
      this.builder.update();
    } catch (e) {
      console.error('Error on `Builder` update:', e);
    }

    try {
      this.level.update();
    } catch (e) {
      console.error('Error on `Level` update:', e);
    }

    try {
      this.wave.update();
    } catch (e) {
      console.error('Error on `Wave` update:', e);
    }

    this.updateNPCPath();
  }

  /**
   * Get list of buildings with a specific variant.
   *
   * @param variant - Varaint
   */
  public selectBuildings(variant: BuildingVariant): Building[] {
    const buildings = (<Building[]> this.buildings.getChildren());

    return buildings.filter((building) => (building.variant === variant));
  }

  /**
   * Spawn enemy in random position.
   */
  public spawnEnemy(variant: EnemyVariant): Enemy {
    const buildings = this.buildings.getChildren();
    const allowedPositions = this.enemySpawnPositions.filter((position) => (
      Phaser.Math.Distance.BetweenPoints(position, this.player.positionAtMatrix) >= ENEMY_SPAWN_DISTANCE_FROM_PLAYER
      && buildings.every((building: Building) => (
        Phaser.Math.Distance.BetweenPoints(position, building.positionAtMatrix) >= ENEMY_SPAWN_DISTANCE_FROM_BUILDING
      ))
    ));

    if (allowedPositions.length === 0) {
      console.warn('Invalid enemy spawn positions');

      return null;
    }

    const positions = selectClosest(allowedPositions, this.player.positionAtMatrix, ENEMY_SPAWN_POSITIONS);
    const EnemyInstance = ENEMIES[variant];

    return new EnemyInstance(this, {
      positionAtMatrix: Phaser.Utils.Array.GetRandom(positions),
    });
  }

  /**
   * Update navigation points costs.
   */
  public refreshNavigationMeta() {
    this.level.navigator.resetPointsCost();

    for (let y = 0; y < this.level.size; y++) {
      for (let x = 0; x < this.level.size; x++) {
        if (this.level.navigator.matrix[y][x] === 1) {
          for (let s = x - 1; s <= x + 1; s++) {
            if (s !== x && this.level.navigator.matrix[y]?.[s] === 0) {
              this.level.navigator.setPointCost(s, y, LEVEL_CORNER_PATH_COST);
            }
          }
          for (let s = y - 1; s <= y + 1; s++) {
            if (s !== y && this.level.navigator.matrix[s]?.[x] === 0) {
              this.level.navigator.setPointCost(x, s, LEVEL_CORNER_PATH_COST);
            }
          }
        }
      }
    }

    this.buildings.children.iterate((building: Building) => {
      this.level.navigator.setPointCost(
        building.positionAtMatrix.x,
        building.positionAtMatrix.y,
        LEVEL_BUILDING_PATH_COST,
      );

      for (let y = building.positionAtMatrix.y - 1; y <= building.positionAtMatrix.y + 1; y++) {
        for (let x = building.positionAtMatrix.x - 1; x <= building.positionAtMatrix.x + 1; x++) {
          if (this.level.getTile({ x, y, z: 0 }) && this.level.isFreePoint({ x, y, z: 1 })) {
            this.level.navigator.setPointCost(x, y, LEVEL_CORNER_PATH_COST);
          }
        }
      }

      return true;
    });
  }

  /**
   * Spawn player and start game.
   */
  public startGame() {
    this.scene.stop(SceneKey.MENU);

    this.difficultyType = <Difficulty> localStorage.getItem(DIFFICULTY_KEY);
    this.difficulty = DIFFICULTY_POWERS[this.difficultyType];

    setCheatsScheme(this.getCheats());

    this.wave = new Wave(this);
    this.builder = new Builder(this);

    this.addPlayer();
    this.addChests();

    this.level.hideTiles();
    this.addEntityColliders();

    const camera = this.cameras.main;

    camera.resetFX();
    camera.startFollow(this.player);
    camera.setZoom(1.3);
    camera.zoomTo(1.0, 100);

    this.scene.launch(this.screen);
    this.input.keyboard.on(INPUT_KEY.PAUSE, () => {
      if (this.player.live.isDead()) {
        window.location.reload();
      } else {
        this.toggleGamePause(true);
      }
    });

    this.isStarted = true;

    if (!IS_DEV_MODE) {
      window.onbeforeunload = function confirm() {
        return 'Leave game? No saves!';
      };
    }
  }

  /**
   * Finish game.
   *
   * @param stat - Current stat
   * @param record - Best stat
   */
  public finishGame(stat: PlayerStat, record: PlayerStat) {
    this.events.emit(WorldEvents.GAMEOVER, stat, record);

    this.isStarted = false;

    if (!IS_DEV_MODE) {
      delete window.onbeforeunload;
    }

    trackProgressionEvent({
      world: this,
      success: false,
    });
  }

  /**
   * Toggle game pause.
   *
   * @param state - Pause state
   */
  public toggleGamePause(state: boolean) {
    if (state) {
      this.timer.paused = true;

      this.scene.pause();
      this.scene.launch(SceneKey.MENU, {
        pauseMode: true,
      });
    } else {
      this.timer.paused = false;

      this.scene.stop(SceneKey.MENU);
      this.scene.resume();
    }
  }

  /**
   * Find NPC path to target.
   */
  private updateNPCPath() {
    const now = Date.now(); // this.getTimerNow();

    if (this.nextFindPathTimestamp > now) {
      return;
    }

    this.npc.children.iterate((npc: NPC) => {
      try {
        npc.updatePath();
      } catch (e) {
        console.error('Error on update NPC path:', e);
      }

      return true;
    });

    this.level.navigator.processing();

    this.nextFindPathTimestamp = now + NPC_PATH_RATE;
  }

  /**
   * Create entity groups.
   */
  private addEntityGroups() {
    this.chests = this.add.group({
      classType: Chest,
    });

    this.buildings = this.add.group({
      classType: Building,
      runChildUpdate: true,
    });

    this.shots = this.add.group({
      runChildUpdate: true,
    });

    this.npc = this.add.group({
      classType: NPC,
      runChildUpdate: true,
    });

    this.enemies = this.add.group({
      classType: Enemy,
    });
  }

  /**
   * Add colliders to entities.
   */
  private addEntityColliders() {
    this.physics.add.collider(this.shots, this.enemies, (shot: ShotBall, enemy: Enemy) => {
      shot.hit(enemy);
    });

    this.physics.add.collider(this.enemies, this.player, (enemy: Enemy, player: Player) => {
      enemy.attack(player);
    });

    this.physics.add.collider(this.enemies, this.npc, (enemy: Enemy, npc: NPC) => {
      if (npc instanceof Assistant) {
        enemy.attack(npc);
      }
    });
  }

  /**
   * Create level and configure camera.
   */
  private makeLevel() {
    this.level = new Level(this);

    const camera = this.cameras.main;
    const from = Level.ToWorldPosition({
      x: 0,
      y: this.level.size - 1,
      z: 0,
    });
    const to = Level.ToWorldPosition({
      x: this.level.size - 1,
      y: 0,
      z: 0,
    });

    camera.setZoom(1.8);
    camera.pan(from.x + (this.sys.canvas.width / 2), from.y, 0);
    setTimeout(() => {
      camera.pan(to.x - (this.sys.canvas.width / 2), to.y, 2 * 60 * 1000);
    }, 0);
  }

  /**
   * Spawn player on world.
   */
  private addPlayer() {
    const positions = this.level.readSpawnPositions(SpawnTarget.PLAYER);

    this.player = new Player(this, Phaser.Utils.Array.GetRandom(positions));
  }

  /**
   * Spawn chests on world.
   */
  private addChests() {
    const positions = this.level.readSpawnPositions(SpawnTarget.CHEST);

    const create = () => new Chest(this, {
      positionAtMatrix: Phaser.Utils.Array.GetRandom(positions),
      variant: Phaser.Math.Between(0, 14),
    });

    // Creating default chests
    const maxCount = Math.ceil(Math.floor(LEVEL_MAP_SIZE / 10) / this.difficulty);

    for (let i = 0; i < maxCount; i++) {
      create();
    }

    // Creating missing chests
    this.wave.on(WaveEvents.COMPLETE, () => {
      const newCount = maxCount - this.chests.getTotalUsed();

      for (let i = 0; i < newCount; i++) {
        const chest = create();
        const isVisibleTile = this.level.isVisibleTile({ ...chest.positionAtMatrix, z: 0 });

        chest.setVisible(isVisibleTile);
      }
    });
  }

  /**
   * Cheatcodes.
   */
  private getCheats() {
    return {
      HEALPLS: () => {
        this.player.live.heal();
      },
      RICHBITCH: () => {
        this.player.giveResources(9999);
      },
      BOOSTME: () => {
        this.player.giveExperience(9999);
      },
      GODHAND: () => {
        this.enemies.children.iterate((enemy: Enemy) => {
          enemy.live.kill();

          return true;
        });
      },
      FUTURE: () => {
        this.wave.number += Phaser.Math.Between(3, 7);
        this.wave.setTimeleft();
      },
    };
  }

  /**
   *
   */
  private registerParticles() {
    for (const effect of Object.values(ParticlesType)) {
      this.particles[effect] = this.add.particles(ParticlesTexture[effect]);
      this.particles[effect].setDepth(WORLD_DEPTH_EFFECT);
    }
  }

  /**
   *
   */
  private registerShaders() {
    const renderer = <Phaser.Renderer.WebGL.WebGLRenderer> this.game.renderer;

    for (const [name, Shader] of entries(shaders)) {
      renderer.pipelines.add(name, new Shader(this.game));
    }
  }

  /**
   *
   */
  private registerOptimization() {
    const ref = this.scene.systems.displayList;

    ref.depthSort = () => {
      if (ref.sortChildrenFlag) {
        ref.list.sort(ref.sortByDepth);
        ref.sortChildrenFlag = false;
      }
    };
  }
}
