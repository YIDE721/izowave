import Phaser from 'phaser';
import { useGame } from 'phaser-react-ui';
import React, { useMemo } from 'react';

import { phrase } from '~lib/lang';
import { Button } from '~scene/system/interface/button';
import { GameDifficulty, IGame } from '~type/game';
import { LevelPlanet } from '~type/world/level';

import { Param } from './param';
import { Wrapper, Params } from './styles';

export const NewGame: React.FC = () => {
  const game = useGame<IGame>();

  const planets = useMemo(() => (
    Object.keys(LevelPlanet) as LevelPlanet[]
  ), []);
  const difficulties = useMemo(() => (
    Object.keys(GameDifficulty) as GameDifficulty[]
  ), []);

  const onChangePlanet = (planet: LevelPlanet) => {
    game.world.scene.restart({ planet });

    game.world.events.once(Phaser.Scenes.Events.CREATE, () => {
      game.world.camera.focusOnLevel();
    });
  };

  const onChangeDifficulty = (difficulty: GameDifficulty) => {
    game.difficulty = difficulty;
  };

  const onClickStart = () => {
    game.startNewGame();
  };

  return (
    <Wrapper>
      <Params>
        <Param
          label="PLANET"
          values={planets}
          defaultValue={game.world.level.planet}
          onChange={onChangePlanet}
        />
        <Param
          label="DIFFICULTY"
          values={difficulties}
          defaultValue={game.difficulty}
          onChange={onChangeDifficulty}
        />
      </Params>
      <Button onClick={onClickStart} view='primary' size="medium">
        {phrase('START')}
      </Button>
    </Wrapper>
  );
};
