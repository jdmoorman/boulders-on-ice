import { Scene } from 'phaser';
import { addIconButton } from '../ui/Button';
import { leaveGame } from './Game';
import type { Game } from './Game';

//  Buttons over the level while it's played, in their own scene so they stay put while the
//  camera follows the player. The Game scene launches it and stops it on leaving.
export const HUD_BUTTON_SIZE = 64;
export const HUD_MARGIN = 16;
const HUD_GAP = 12;
const BUTTON_COUNT = 3;
//  Where the row of buttons ends, for anything placed beside it
export const HUD_RIGHT = HUD_MARGIN + BUTTON_COUNT * HUD_BUTTON_SIZE + (BUTTON_COUNT - 1) * HUD_GAP;

export class GameHud extends Scene
{
    constructor ()
    {
        super('GameHud');
    }

    create ()
    {
        const game = this.scene.get('Game') as Game;
        //  Not while the level is paused (the pause menu or Settings is over it)
        const whenPlaying = (action: () => void) => () =>
        {
            if (!this.scene.isPaused('Game'))
            {
                action();
            }
        };

        //  Top left, in a row: restart (like R), Settings, and leave: to the main menu, or back to
        //  the editor when playtesting
        const buttons: [string, () => void][] = [
            ['icon-restart', () => game.restartLevel()],
            ['icon-gear', () => game.openSettings()],
            game.levelText
                ? ['icon-edit', () => leaveGame(this, 'Editor')]
                : ['icon-home', () => leaveGame(this, 'MainMenu')]
        ];
        buttons.forEach(([icon, action], i) =>
        {
            const x = HUD_MARGIN + HUD_BUTTON_SIZE / 2 + i * (HUD_BUTTON_SIZE + HUD_GAP);
            addIconButton(this, x, HUD_MARGIN + HUD_BUTTON_SIZE / 2, [{ key: icon }], whenPlaying(action),
                { width: HUD_BUTTON_SIZE, height: HUD_BUTTON_SIZE });
        });
    }
}
