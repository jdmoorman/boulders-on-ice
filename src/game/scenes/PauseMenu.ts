import { Scene, GameObjects } from 'phaser';
import { addButton, TEXT_STYLE } from '../ui/Button';
import { GameData, leaveGame } from './Game';
import { changeGameSettings, GameSettings, gameSettings } from '../gameSettings';

const SETTINGS_WIDTH = 600;
const SETTING_ROW_HEIGHT = 90;
const CHECKBOX_SIZE = 36;
const CHECK_COLOR = 0xf2c230;

//  The on/off settings in the Settings popup, in order
//  (Dev mode is switched on the main menu instead.)
const SETTINGS: readonly { key: keyof GameSettings, label: string, description: string }[] = [];

export interface PauseMenuData
{
    levelIndex: number;
    //  Set when playtesting from the editor (see GameData)
    levelText?: string;
}

//  Overlay shown on top of the paused Game scene.
export class PauseMenu extends Scene
{
    private levelIndex = 0;
    private levelText: string | undefined;
    //  The Settings popup's objects while it's open
    private settingsPopup: GameObjects.GameObject[] | null = null;

    constructor ()
    {
        super('PauseMenu');
    }

    init (data: PauseMenuData)
    {
        this.levelIndex = data.levelIndex;
        this.levelText = data.levelText;
        this.settingsPopup = null;
    }

    create ()
    {
        const { width, height } = this.scale;
        const cx = width / 2;
        const cy = height / 2;

        //  Dim the frozen level behind the menu
        this.add.rectangle(cx, cy, width, height, 0x000000, 0.5);

        this.add.rectangle(cx, cy, 400, 460, 0x24303f)
            .setStrokeStyle(4, 0x9fd0f0);

        this.add.text(cx, cy - 170, 'Paused', { ...TEXT_STYLE, fontSize: 44 })
            .setOrigin(0.5);

        const buttons: [string, () => void][] = [
            ['Resume', () => this.resumeGame()],
            ['Restart', () => this.restart()],
            ['Settings', () => this.openSettings()],
            this.levelText ? ['Editor', () => this.toEditor()] : ['Main Menu', () => this.toMainMenu()]
        ];
        buttons.forEach(([label, onClick], i) =>
        {
            addButton(this, cx, cy - 80 + i * 80, label, onClick, { width: 260 });
        });

        const keyboard = this.input.keyboard;
        if (keyboard)
        {
            //  Escape closes the Settings popup if it's open, and otherwise resumes, like P
            keyboard.on('keydown-ESC', () => this.settingsPopup ? this.closeSettings() : this.resumeGame());
            keyboard.on('keydown-P', () => this.settingsPopup || this.resumeGame());
        }
    }

    private resumeGame ()
    {
        this.scene.resume('Game');
        this.scene.stop();
    }

    //  scene.start from this scene stops the overlay and restarts Game fresh
    private restart ()
    {
        const data: GameData = this.levelText ? { levelText: this.levelText } : { levelIndex: this.levelIndex };
        this.scene.start('Game', data);
    }

    //  Opens the Settings popup over the menu, with a checkbox per setting. Clicking outside the
    //  panel, the Close button or Escape closes it.
    private openSettings ()
    {
        if (this.settingsPopup)
        {
            return;
        }
        const { width, height } = this.scale;
        const panelHeight = 160 + Math.max(1, SETTINGS.length) * SETTING_ROW_HEIGHT;
        const left = (width - SETTINGS_WIDTH) / 2;
        const top = (height - panelHeight) / 2;
        const objects: GameObjects.GameObject[] = [];

        //  Covers the menu, so only the popup can be clicked
        objects.push(this.add.rectangle(0, 0, width, height, 0x000000, 0.55)
            .setOrigin(0)
            .setInteractive()
            .on('pointerup', () => this.closeSettings()));
        objects.push(this.add.rectangle(left, top, SETTINGS_WIDTH, panelHeight, 0x24303f)
            .setOrigin(0)
            .setStrokeStyle(4, 0x9fd0f0)
            .setInteractive());
        objects.push(this.add.text(width / 2, top + 40, 'Settings', { ...TEXT_STYLE, fontSize: 32 })
            .setOrigin(0.5));

        if (SETTINGS.length === 0)
        {
            objects.push(this.add.text(width / 2, top + 90 + SETTING_ROW_HEIGHT / 2 - 18, 'No settings yet.',
                { ...TEXT_STYLE, fontSize: 22, strokeThickness: 5 })
                .setOrigin(0.5));
        }
        SETTINGS.forEach(({ key, label, description }, i) =>
        {
            const y = top + 90 + i * SETTING_ROW_HEIGHT;
            const box = this.add.rectangle(left + 32, y, CHECKBOX_SIZE, CHECKBOX_SIZE, 0x000000, 0.5)
                .setOrigin(0)
                .setStrokeStyle(3, 0x000000)
                .setInteractive({ useHandCursor: true });
            const check = this.add.rectangle(left + 32 + CHECKBOX_SIZE / 2, y + CHECKBOX_SIZE / 2,
                CHECKBOX_SIZE - 14, CHECKBOX_SIZE - 14, CHECK_COLOR)
                .setVisible(gameSettings()[key]);
            const toggle = () =>
            {
                changeGameSettings({ [key]: !gameSettings()[key] });
                check.setVisible(gameSettings()[key]);
            };
            box.on('pointerup', toggle);
            const textX = left + 32 + CHECKBOX_SIZE + 20;
            const title = this.add.text(textX, y + CHECKBOX_SIZE / 2, label, { ...TEXT_STYLE, fontSize: 24, strokeThickness: 5 })
                .setOrigin(0, 0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerup', toggle);
            const note = this.add.text(textX, y + CHECKBOX_SIZE + 8, description,
                { ...TEXT_STYLE, fontSize: 16, strokeThickness: 4, align: 'left' });
            objects.push(box, check, title, note);
        });

        objects.push(addButton(this, width / 2, top + panelHeight - 44, 'Close', () => this.closeSettings(),
            { width: 160, height: 52 }));
        this.settingsPopup = objects;
    }

    private closeSettings ()
    {
        if (!this.settingsPopup)
        {
            return;
        }
        this.settingsPopup.forEach(object => object.destroy());
        this.settingsPopup = null;
    }

    private toEditor ()
    {
        leaveGame(this, 'Editor');
    }

    private toMainMenu ()
    {
        leaveGame(this, 'MainMenu');
    }
}
