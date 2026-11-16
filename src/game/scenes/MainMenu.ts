import { GameObjects, Scene } from 'phaser';
import { addButton, TEXT_STYLE } from '../ui/Button';
import { changeGameSettings, gameSettings } from '../gameSettings';

const CHECKBOX_SIZE = 28;
const CHECK_COLOR = 0xf2c230;
//  Gap between the dev mode checkbox and the screen's bottom-left corner
const CORNER_MARGIN = 20;
import { firstUncompletedLevel } from '../progress';
import { loadLevelInProgress } from '../levelInProgress';
import { LEVELS } from '../levels/levelList';
import type { GameData } from './Game';

export class MainMenu extends Scene
{
    private comingSoonText: GameObjects.Text | null = null;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.comingSoonText = null;
        //  Same title style and position as Level Select
        this.add.text(512, 90, 'Main Menu', { ...TEXT_STYLE, fontSize: 60, strokeThickness: 8 }).setOrigin(0.5);

        //  Wide enough for "Achievements"
        const size = { width: 300 };
        //  Play picks the level in progress back up where it was left, or else starts the
        //  earliest level not yet completed. Pass the data in full: Phaser reuses a scene's
        //  previous start data otherwise
        addButton(this, 512, 220, 'Play', () => this.scene.start('Game', playData()), size);
        addButton(this, 512, 304, 'Levels', () => this.scene.start('LevelSelect'), size);
        addButton(this, 512, 388, 'Editor', () => this.scene.start('Editor'), size);
        //  Placeholder: it only says it isn't done yet
        addButton(this, 512, 472, 'Achievements', () => this.comingSoon('Achievements'), size);

        this.addDevModeToggle();
    }

    //  For the placeholder button: a note near the bottom of the screen that fades away
    private comingSoon (name: string)
    {
        this.comingSoonText?.destroy();
        const text = this.add.text(512, 710, `${name} isn't done yet.`, { ...TEXT_STYLE, fontSize: 28, strokeThickness: 5 })
            .setOrigin(0.5);
        this.comingSoonText = text;
        this.tweens.add({ targets: text, alpha: 0, delay: 1200, duration: 400, onComplete: () => text.destroy() });
    }

    //  A small checkbox in the bottom-left corner that turns dev mode on and off (see
    //  gameSettings.ts): every level unlocked, N finishes a level, and holding H shows the solution route
    private addDevModeToggle ()
    {
        const x = CORNER_MARGIN;
        const y = this.scale.height - CORNER_MARGIN - CHECKBOX_SIZE;
        const box = this.add.rectangle(x, y, CHECKBOX_SIZE, CHECKBOX_SIZE, 0x000000, 0.5)
            .setOrigin(0)
            .setStrokeStyle(3, 0x000000)
            .setInteractive({ useHandCursor: true });
        const check = this.add.rectangle(x + CHECKBOX_SIZE / 2, y + CHECKBOX_SIZE / 2,
            CHECKBOX_SIZE - 12, CHECKBOX_SIZE - 12, CHECK_COLOR)
            .setVisible(gameSettings().devMode);
        const label = this.add.text(x + CHECKBOX_SIZE + 12, y + CHECKBOX_SIZE / 2, 'Dev mode',
            { ...TEXT_STYLE, fontSize: 24, strokeThickness: 5 })
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true });
        const toggle = () =>
        {
            changeGameSettings({ devMode: !gameSettings().devMode });
            check.setVisible(gameSettings().devMode);
        };
        box.on('pointerup', toggle);
        label.on('pointerup', toggle);
    }
}

//  What Play starts: the saved level in progress if it's still in the game, else the first
//  uncompleted level
function playData (): GameData
{
    const saved = loadLevelInProgress();
    const levelIndex = saved ? LEVELS.findIndex(level => level.key === saved.levelKey) : -1;
    return levelIndex >= 0
        ? { levelIndex, resume: true, from: 'MainMenu' }
        : { levelIndex: firstUncompletedLevel(), resume: false, from: 'MainMenu' };
}
