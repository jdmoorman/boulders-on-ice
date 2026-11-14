import { Scene, Input, Time, GameObjects } from 'phaser';
import { LEVEL_PACKS, LEVELS, LevelInfo } from '../levels/levelList';
import { importPack } from '../levels/importedPacks';
import { LevelParseError } from '../levels/LevelParser';
import { addButton, addIconButton, buttonLabel, ICON_INSET, TEXT_STYLE } from '../ui/Button';
import { levelThumbnail } from '../levels/thumbnail';
import { isUnlocked } from '../progress';

const PER_ROW = 5;
const CELL_W = 152;
const CELL_H = 120;
const GAP = 24;
const STEP_X = CELL_W + GAP;
const STEP_Y = CELL_H + GAP;
const BAR_HEIGHT = 120;
const BAR_DEPTH = 10;
const KEY_SCROLL = 80;
const BAR_BUTTON_GAP = 120;
//  Thumbnails are drawn for levels within this many screen heights of the view, and dropped
//  (texture and all) once they're more than THUMB_DROP_SCREENS away, so a pack of hundreds of
//  levels only ever has a few screens' worth
const THUMB_DRAW_SCREENS = 1;
const THUMB_DROP_SCREENS = 3;
//  Draw order within the scrolling grid: buttons, then thumbnails, then the lock over them
const THUMB_DEPTH = 1;
const LOCK_DEPTH = 2;

//  A level button and its thumbnail, if drawn
interface Cell
{
    level: LevelInfo;
    x: number;
    y: number;
    thumbnail: { image: GameObjects.Image, key: string } | null;
}
const MESSAGE_MS = 4000;
//  Largest file the Import button reads
const MAX_IMPORT_BYTES = 1024 * 1024;

export interface LevelSelectData
{
    //  Shown in the bottom bar when the screen opens
    message?: string;
    //  Start scrolled to the bottom, where an imported pack has just been added
    scrollToEnd?: boolean;
}

//  Every level pack, each with a heading and a grid of level buttons showing a thumbnail of the
//  level, on one screen. Import adds a pack from a file of levels (see importedPacks.ts).
//  Scrolls with the mouse wheel or arrow keys when it's taller than the screen; the Back
//  button stays fixed at the bottom. Levels after the first in a pack are locked until the one
//  before them is completed (see progress.ts).
export class LevelSelect extends Scene
{
    private maxScroll = 0;
    private cells: Cell[] = [];
    private messageText: GameObjects.Text;
    private messageTimer: Time.TimerEvent | null = null;

    constructor ()
    {
        super('LevelSelect');
    }

    create (data: LevelSelectData = {})
    {
        this.messageTimer = null;
        this.cells = [];
        const { width, height } = this.scale;
        const cx = width / 2;
        const camera = this.cameras.main;
        camera.setScroll(0, 0);

        this.add.text(cx, 90, 'Select Level', { ...TEXT_STYLE, fontSize: 48, strokeThickness: 8 })
            .setOrigin(0.5);

        let y = 180;
        for (const pack of LEVEL_PACKS)
        {
            this.add.text(cx, y, pack.name, { ...TEXT_STYLE, fontSize: 36 }).setOrigin(0.5);
            const gridTop = y + 50 + CELL_H / 2;
            const rows = Math.ceil(pack.levels.length / PER_ROW);

            pack.levels.forEach((level, i) =>
            {
                const row = Math.floor(i / PER_ROW);
                const col = i % PER_ROW;
                //  Center each row on its own number of buttons, so a short last row is centered too
                const inRow = row < rows - 1 ? PER_ROW : pack.levels.length - row * PER_ROW;
                const x = cx + (col - (inRow - 1) / 2) * STEP_X;
                const by = gridTop + row * STEP_Y;
                const levelIndex = LEVELS.findIndex(l => l.key === level.key);

                //  The thumbnail is drawn when it scrolls near the view (see updateThumbnails)
                const button = addIconButton(this, x, by, [],
                    () => this.scene.start('Game', { levelIndex }), { width: CELL_W, height: CELL_H });
                this.cells.push({ level, x, y: by, thumbnail: null });

                //  Locked until the previous level in the pack is completed: dimmed, with a padlock
                if (!isUnlocked(levelIndex))
                {
                    button.disableInteractive();
                    this.add.rectangle(x, by, CELL_W, CELL_H, 0x000000, 0.55).setDepth(LOCK_DEPTH);
                    this.add.image(x, by, 'icon-lock').setDepth(LOCK_DEPTH);
                }
            });

            y = gridTop + (rows - 1) * STEP_Y + CELL_H / 2 + 60;
        }

        //  Fixed bottom bar with Back; it blocks clicks to level buttons scrolled beneath it
        this.add.rectangle(0, height - BAR_HEIGHT, width, BAR_HEIGHT, 0x000000, 0.45)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(BAR_DEPTH)
            .setInteractive();
        const barY = height - BAR_HEIGHT / 2 + 12;
        const back = addButton(this, cx - BAR_BUTTON_GAP, barY, 'Back', () => this.back());
        const importButton = addButton(this, cx + BAR_BUTTON_GAP, barY, 'Import', () => this.pickPack());
        for (const object of [back, buttonLabel(back), importButton, buttonLabel(importButton)])
        {
            object.setScrollFactor(0).setDepth(BAR_DEPTH + 1);
        }
        this.messageText = this.add.text(cx, height - BAR_HEIGHT + 22, '', { ...TEXT_STYLE, fontSize: 20 })
            .setOrigin(0.5)
            .setWordWrapWidth(width - 40)
            .setScrollFactor(0)
            .setDepth(BAR_DEPTH + 1);

        this.maxScroll = Math.max(0, y - (height - BAR_HEIGHT));
        if (data.scrollToEnd)
        {
            camera.scrollY = this.maxScroll;
        }
        if (data.message)
        {
            this.showMessage(data.message);
        }
        this.updateThumbnails();

        this.input.on(Input.Events.POINTER_WHEEL,
            (_pointer: Input.Pointer, _over: unknown, _dx: number, dy: number) => this.scrollBy(dy));

        const keyboard = this.input.keyboard;
        if (keyboard)
        {
            keyboard.once('keydown-ESC', () => this.back());
            keyboard.on('keydown-UP', () => this.scrollBy(-KEY_SCROLL));
            keyboard.on('keydown-DOWN', () => this.scrollBy(KEY_SCROLL));
        }
    }

    //  Lets the user pick a file of levels to add as a pack
    private pickPack ()
    {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,text/plain';
        input.addEventListener('change', () =>
        {
            const file = input.files?.[0];
            if (file)
            {
                this.importFile(file);
            }
        });
        input.click();
    }

    //  Adds the file's levels as a pack named after it, then redraws the screen to show it
    private async importFile (file: File)
    {
        if (file.size > MAX_IMPORT_BYTES)
        {
            this.showMessage(`${file.name} is too large to be a level pack.`);
            return;
        }

        let text: string;
        try
        {
            text = await file.text();
        }
        catch
        {
            this.showMessage(`Couldn't read ${file.name}.`);
            return;
        }
        if (!this.scene.isActive())
        {
            return;
        }

        const name = file.name.replace(/\.txt$/i, '');
        try
        {
            const { count, saved } = importPack(this, name, text);
            const levels = count === 1 ? '1 level' : `${count} levels`;
            const data: LevelSelectData = {
                message: saved ? `Imported ${name}: ${levels}.` : `Imported ${name} (${levels}), but it couldn't be saved for next time.`,
                scrollToEnd: true
            };
            this.scene.restart(data);
        }
        catch (error)
        {
            if (!(error instanceof LevelParseError))
            {
                throw error;
            }
            this.showMessage(`Couldn't import ${file.name}: ${error.message}.`);
        }
    }

    //  Shows a message in the bottom bar for a few seconds
    private showMessage (text: string)
    {
        this.messageText.setText(text);
        this.messageTimer?.remove();
        this.messageTimer = this.time.delayedCall(MESSAGE_MS, () => this.messageText.setText(''));
    }

    private scrollBy (dy: number)
    {
        const camera = this.cameras.main;
        camera.scrollY = Math.min(this.maxScroll, Math.max(0, camera.scrollY + dy));
        this.updateThumbnails();
    }

    //  Draws the thumbnails of levels near the view and drops those far from it
    private updateThumbnails ()
    {
        const top = this.cameras.main.scrollY;
        const { height } = this.scale;
        const distance = (cell: Cell) =>
            Math.max(0, top - (cell.y + CELL_H / 2), (cell.y - CELL_H / 2) - (top + height));

        for (const cell of this.cells)
        {
            const d = distance(cell);
            if (!cell.thumbnail && d <= height * THUMB_DRAW_SCREENS)
            {
                const key = levelThumbnail(this, cell.level, CELL_W - ICON_INSET * 2, CELL_H - ICON_INSET * 2);
                cell.thumbnail = { image: this.add.image(cell.x, cell.y, key).setDepth(THUMB_DEPTH), key };
            }
            else if (cell.thumbnail && d > height * THUMB_DROP_SCREENS)
            {
                cell.thumbnail.image.destroy();
                this.textures.remove(cell.thumbnail.key);
                cell.thumbnail = null;
            }
        }
    }

    private back ()
    {
        this.scene.start('MainMenu');
    }
}
