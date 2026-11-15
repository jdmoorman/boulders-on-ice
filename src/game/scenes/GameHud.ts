import { Scene } from 'phaser';
import { addIconButton } from '../ui/Button';
import type { Game } from './Game';

//  Buttons over the level while it's played, in their own scene so they stay put while the
//  camera follows the player. The Game scene launches it and stops it on leaving.
export const HUD_BUTTON_SIZE = 64;
export const HUD_MARGIN = 16;

export class GameHud extends Scene
{
    constructor ()
    {
        super('GameHud');
    }

    create ()
    {
        const game = this.scene.get('Game') as Game;
        const half = HUD_BUTTON_SIZE / 2;

        //  Restart, top left: the same as pressing R
        addIconButton(this, HUD_MARGIN + half, HUD_MARGIN + half, [{ key: 'icon-restart' }], () =>
        {
            //  Not while the pause menu is over the level
            if (!this.scene.isPaused('Game'))
            {
                game.restartLevel();
            }
        }, { width: HUD_BUTTON_SIZE, height: HUD_BUTTON_SIZE });
    }
}
