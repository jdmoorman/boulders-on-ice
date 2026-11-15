import { Scene } from 'phaser';
import { addIconButton } from '../ui/Button';
import { gameSettings } from '../gameSettings';
import type { Game } from './Game';

//  Buttons over the level while it's played, in their own scene so they stay put while the
//  camera follows the player. The Game scene launches it and stops it on leaving.
export const HUD_BUTTON_SIZE = 64;
export const HUD_MARGIN = 16;
const HUD_GAP = 12;

export class GameHud extends Scene
{
    constructor ()
    {
        super('GameHud');
    }

    create ()
    {
        const game = this.scene.get('Game') as Game;
        //  Not while the level is paused (Settings is over it)
        const whenPlaying = (action: () => void) => () =>
        {
            if (!this.scene.isPaused('Game'))
            {
                action();
            }
        };

        //  Top left, in a row: leave (like Esc, back to the screen the level was started from; a
        //  pencil when that's the editor), Settings, restart (like R), and in dev mode, outside
        //  playtests, copy the level into the editor
        const buttons: [string, () => void][] = [
            [game.levelText ? 'icon-edit' : 'icon-home', () => game.goBack()],
            ['icon-gear', () => game.openSettings()],
            ['icon-restart', () => game.restartLevel()],
            ...(gameSettings().devMode && !game.levelText ? [['icon-edit', () => game.copyToEditor()] as [string, () => void]] : [])
        ];
        buttons.forEach(([icon, action], i) =>
        {
            const x = HUD_MARGIN + HUD_BUTTON_SIZE / 2 + i * (HUD_BUTTON_SIZE + HUD_GAP);
            addIconButton(this, x, HUD_MARGIN + HUD_BUTTON_SIZE / 2, [{ key: icon }], whenPlaying(action),
                { width: HUD_BUTTON_SIZE, height: HUD_BUTTON_SIZE });
        });
    }
}
