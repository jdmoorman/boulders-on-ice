import { Scene } from 'phaser';
import { addButton, TEXT_STYLE } from '../ui/Button';
import { changeGameSettings, GameSettings, gameSettings } from '../gameSettings';

const SETTINGS_WIDTH = 600;
const SETTING_ROW_HEIGHT = 90;
const CHECKBOX_SIZE = 36;
const CHECK_COLOR = 0xf2c230;

//  The on/off settings in the Settings popup, in order
//  (Dev mode is switched on the main menu instead.)
const SETTINGS: readonly { key: keyof GameSettings, label: string, description: string }[] = [];

//  The Settings popup, opened from the gear button over the level (see GameHud). The Game scene
//  is paused while it's open, with a checkbox per setting. Clicking outside the panel, the Close
//  button or Escape closes it and carries on playing.
export class SettingsPopup extends Scene
{
    constructor ()
    {
        super('Settings');
    }

    create ()
    {
        const { width, height } = this.scale;
        const panelHeight = 160 + Math.max(1, SETTINGS.length) * SETTING_ROW_HEIGHT;
        const left = (width - SETTINGS_WIDTH) / 2;
        const top = (height - panelHeight) / 2;

        //  Covers the level and its buttons, so only the popup can be clicked
        this.add.rectangle(0, 0, width, height, 0x000000, 0.55)
            .setOrigin(0)
            .setInteractive()
            .on('pointerup', () => this.close());
        this.add.rectangle(left, top, SETTINGS_WIDTH, panelHeight, 0x24303f)
            .setOrigin(0)
            .setStrokeStyle(4, 0x9fd0f0)
            .setInteractive();
        this.add.text(width / 2, top + 40, 'Settings', { ...TEXT_STYLE, fontSize: 32 })
            .setOrigin(0.5);

        if (SETTINGS.length === 0)
        {
            this.add.text(width / 2, top + 90 + SETTING_ROW_HEIGHT / 2 - 18, 'No settings yet.',
                { ...TEXT_STYLE, fontSize: 22, strokeThickness: 5 })
                .setOrigin(0.5);
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
            this.add.text(textX, y + CHECKBOX_SIZE / 2, label, { ...TEXT_STYLE, fontSize: 24, strokeThickness: 5 })
                .setOrigin(0, 0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerup', toggle);
            this.add.text(textX, y + CHECKBOX_SIZE + 8, description,
                { ...TEXT_STYLE, fontSize: 16, strokeThickness: 4, align: 'left' });
        });

        addButton(this, width / 2, top + panelHeight - 44, 'Close', () => this.close(),
            { width: 160 });

        this.input.keyboard?.once('keydown-ESC', () => this.close());
    }

    private close ()
    {
        this.scene.resume('Game');
        this.scene.stop();
    }
}
