import { Scene } from 'phaser';
import { addButton, TEXT_STYLE } from '../ui/Button';
import { leaveGame } from './Game';

export interface PauseMenuData
{
    levelIndex: number;
    //  Set when playtesting from the editor (see GameData)
    levelText?: string;
}

//  Overlay shown on top of the paused Game scene. Settings and restarting are buttons over the
//  level itself (see GameHud).
export class PauseMenu extends Scene
{
    private levelText: string | undefined;

    constructor ()
    {
        super('PauseMenu');
    }

    init (data: PauseMenuData)
    {
        this.levelText = data.levelText;
    }

    create ()
    {
        const { width, height } = this.scale;
        const cx = width / 2;
        const cy = height / 2;

        //  Dim the frozen level behind the menu
        this.add.rectangle(cx, cy, width, height, 0x000000, 0.5);

        this.add.rectangle(cx, cy, 400, 300, 0x24303f)
            .setStrokeStyle(4, 0x9fd0f0);

        this.add.text(cx, cy - 90, 'Paused', { ...TEXT_STYLE, fontSize: 44 })
            .setOrigin(0.5);

        const buttons: [string, () => void][] = [
            ['Resume', () => this.resumeGame()],
            this.levelText ? ['Editor', () => this.toEditor()] : ['Main Menu', () => this.toMainMenu()]
        ];
        buttons.forEach(([label, onClick], i) =>
        {
            addButton(this, cx, cy + i * 80, label, onClick, { width: 260 });
        });

        const keyboard = this.input.keyboard;
        if (keyboard)
        {
            keyboard.once('keydown-ESC', () => this.resumeGame());
            keyboard.once('keydown-P', () => this.resumeGame());
        }
    }

    private resumeGame ()
    {
        this.scene.resume('Game');
        this.scene.stop();
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
