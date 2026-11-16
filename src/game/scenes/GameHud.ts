import { Scene } from 'phaser';
import { addIconButton, PANEL_SIZE } from '../ui/Button';
import { gameSettings } from '../gameSettings';
import type { Game } from './Game';

//  Buttons over the level while it's played, in their own scene so they stay put while the
//  camera follows the player. The Game scene launches it and stops it on leaving.
export const HUD_BUTTON_SIZE = PANEL_SIZE;
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
        //  pencil when that's the editor), Settings, restart (like R), undo (like Z or U), and in dev mode, outside
        //  playtests, copy the level into the editor
        //  Undo works on press rather than on click, so it can be held (null here; see below)
        const buttons: [string, (() => void) | null][] = [
            [game.levelText ? 'icon-pencil' : 'icon-home', () => game.goBack()],
            ['icon-gear', () => game.openSettings()],
            ['icon-restart', () => game.restartLevel()],
            ['icon-undo', null],
            ...(gameSettings().devMode && !game.levelText ? [['icon-pencil', () => game.copyToEditor()] as [string, () => void]] : [])
        ];
        buttons.forEach(([icon, action], i) =>
        {
            const x = HUD_MARGIN + HUD_BUTTON_SIZE / 2 + i * (HUD_BUTTON_SIZE + HUD_GAP);
            const button = addIconButton(this, x, HUD_MARGIN + HUD_BUTTON_SIZE / 2, [{ key: icon }], whenPlaying(action ?? (() => {})),
                { width: HUD_BUTTON_SIZE, height: HUD_BUTTON_SIZE, panel: true });
            if (!action)
            {
                //  Pressing undoes, and holding keeps undoing until the pointer is released or
                //  leaves the button
                button.on('pointerdown', whenPlaying(() => game.holdUndo()));
                button.on('pointerout', () => game.releaseUndo());
            }
        });
        //  Released anywhere, including after the level restarted under a held button (each undo
        //  of a restart rebuilds this HUD)
        this.input.on('pointerup', () => game.releaseUndo());
    }
}
