import { Scene, Textures } from 'phaser';
import { createPlayerAnimations, PLAYER_FRAME_WIDTH, PLAYER_FRAME_HEIGHT } from '../playerAnimations';
import { generateTextures } from '../textures';
import { UI_LIGHT } from '../ui/Button';
import { LEVELS } from '../levels/levelList';
import { loadImportedPacks } from '../levels/importedPacks';
import { createPlateAnimations, loadPlates } from '../plates';
import { createDoorAnimations, loadDoors } from '../doors';
import { createTrapAnimations, loadTraps } from '../traps';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, UI_LIGHT);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, UI_LIGHT);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.spritesheet('player', 'player/openmon/set1-sheet3.png', {
            frameWidth: PLAYER_FRAME_WIDTH,
            frameHeight: PLAYER_FRAME_HEIGHT
        });
        this.load.image('boulder', 'boulders/rock.png');
        this.load.image('goal', 'exit/ranitaya_wall_hole.png');
        this.load.image('wallAutotile', 'walls/ranitaya_autotile_wall.png');
        this.load.image('floor', 'floor/ranitaya_floor.png');
        this.load.image('ice', 'ice/buch_ice_muted.png');
        //  Button icons (undo and redo are drawn in textures.ts)
        this.load.image('icon-pencil', 'ui/icons/pencil.png');
        this.load.image('icon-home', 'ui/icons/ranitaya_home.png');
        this.load.image('icon-gear', 'ui/icons/ranitaya_settings.png');
        this.load.image('icon-restart', 'ui/icons/ranitaya_reset.png');
        this.load.image('icon-lock', 'ui/icons/ranitaya_lock.png');
        //  The game's undo; the editor's undo and redo are drawn (see textures.ts)
        this.load.image('icon-game-undo', 'ui/icons/ranitaya_undo.png');
        this.load.image('ui-panel', 'ui/ranitaya_square_panel.png');
        this.load.image('ui-wide-panel', 'ui/ranitaya_wide_panel.png');
        loadPlates(this);
        loadDoors(this);
        loadTraps(this);

        //  Each level file once, under its path (a file can hold several levels)
        for (const file of new Set(LEVELS.map(level => level.file)))
        {
            this.load.text(file, file);
        }
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.
        //  Keep the scaled-up pixel art sharp (only these textures; others still smooth)
        for (const key of ['player', 'boulder', 'goal', 'floor', 'plate-press', 'plate-unpress', 'door-open', 'door-close', 'trap',
            'icon-pencil', 'icon-home', 'icon-gear', 'icon-restart', 'icon-lock', 'icon-game-undo', 'ui-panel', 'ui-wide-panel'])
        {
            this.textures.get(key).setFilter(Textures.FilterMode.NEAREST);
        }
        createPlayerAnimations(this);
        createPlateAnimations(this);
        createDoorAnimations(this);
        createTrapAnimations(this);

        generateTextures(this);
        loadImportedPacks(this);

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
