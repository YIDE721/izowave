import { INTERFACE_TEXT_COLOR, INTERFACE_FONT } from '~const/interface';
import { useAdaptation, Component, scaleText } from '~lib/ui';
import { formatTime } from '~lib/utils';
import { Wave } from '~scene/world/wave';
import { NoticeType } from '~type/screen/notice';
import { WaveAudio, WaveEvents } from '~type/world/wave';

type Props = {
  wave: Wave
};

export const ComponentWave = Component<Props>(function (container, {
  wave,
}) {
  useAdaptation(container, (width: number) => {
    container.setSize(
      0, // Math.max(90, width * 0.08),
      Math.max(23, width * 0.02),
    );
  });

  /**
   * Number
   */

  const number = this.add.text(0, 0, '', {
    resolution: window.devicePixelRatio,
    fontFamily: INTERFACE_FONT.PIXEL,
    shadow: {
      fill: true,
    },
  });

  useAdaptation(number, () => {
    const { fontSize } = scaleText(number, {
      by: container.height,
      scale: 0.6,
      shadow: true,
    });

    const paddingX = container.height * 0.4;
    const paddingY = (container.height - fontSize) / 2;

    number.setFixedSize(0, container.height);
    number.setPadding(paddingX, paddingY, paddingX, 0);
  });

  container.add(number);

  /**
   * Counter label
   */

  const counterLabel = this.add.text(0, 0, '', {
    resolution: window.devicePixelRatio,
    fontFamily: INTERFACE_FONT.PIXEL,
    shadow: {
      fill: true,
    },
  });

  counterLabel.setAlpha(0.5);
  const counterLabelAdaptive = useAdaptation(counterLabel, () => {
    const offsetX = container.height * 0.3;
    const offsetY = container.height * 0.09;

    counterLabel.setPosition(
      number.x + number.width + offsetX,
      offsetY,
    );
    scaleText(counterLabel, {
      by: container.height,
      scale: 0.3,
      shadow: true,
    });
  });

  container.add(counterLabel);

  /**
   * Counter value
   */

  const counterValue = this.add.text(0, 0, '', {
    resolution: window.devicePixelRatio,
    fontFamily: INTERFACE_FONT.PIXEL,
    shadow: {
      fill: true,
    },
  });

  counterValue.setOrigin(0.0, 1.0);
  const counterValueAdaptive = useAdaptation(counterValue, () => {
    const offsetX = container.height * 0.3;
    const offsetY = container.height * 0.09;

    const { shadowSize } = scaleText(counterValue, {
      by: container.height,
      scale: 0.5,
      shadow: true,
    });

    counterValue.setPosition(
      number.x + number.width + offsetX,
      container.height + shadowSize - offsetY,
    );
  });

  container.add(counterValue);

  /**
   * Updating
   */

  const onNumberUpdate = () => {
    if (wave.isGoing) {
      number.setText(String(wave.number));
      number.setBackgroundColor(INTERFACE_TEXT_COLOR.ERROR_DARK);
      counterLabel.setText('ENEMIES LEFT');
    } else {
      number.setText(String(wave.number + 1));
      number.setBackgroundColor(INTERFACE_TEXT_COLOR.INFO_DARK);
      counterLabel.setText('TIME LEFT');
    }

    counterLabelAdaptive();
    counterValueAdaptive();
  };

  onNumberUpdate();

  wave.on(WaveEvents.UPDATE, onNumberUpdate);

  wave.on(WaveEvents.START, () => {
    this.message(NoticeType.INFO, `WAVE ${wave.number} STARTED`);
  });

  wave.on(WaveEvents.COMPLETE, () => {
    this.message(NoticeType.INFO, `WAVE ${wave.number} COMPLETED`);
  });

  return {
    update: () => {
      if (wave.isGoing) {
        const killedCount = wave.spawnedCount - wave.scene.enemies.getTotalUsed();

        counterValue.setText(String(wave.maxSpawnedCount - killedCount));
        counterValue.setColor('#fff');
      } else {
        const timeleft = Math.ceil(wave.getTimeleft() / 1000);

        counterValue.setText(formatTime(timeleft));

        if (timeleft <= 5 && counterValue.style.color !== INTERFACE_TEXT_COLOR.ERROR) {
          this.sound.play(WaveAudio.TICK);

          let repeats = timeleft;
          const tick = setInterval(() => {
            repeats--;
            if (repeats === 0) {
              clearInterval(tick);
            } else {
              this.sound.play(WaveAudio.TICK);
            }
          }, 1000);

          counterValue.setColor(INTERFACE_TEXT_COLOR.ERROR);
          this.tweens.add({
            targets: counterValue,
            scale: 0.9,
            duration: 500,
            ease: 'Linear',
            yoyo: true,
            repeat: 5,
          });
        }
      }
    },
  };
});
