import { Scene, Input, Time, GameObjects } from 'phaser';
import { LEVEL_PACKS, LEVELS, LevelPack } from '../levels/levelList';
import { addButton, addIcon, addIconButton, buttonLabel, buttonPanel, ICON_INSET, TEXT_STYLE, UI_LIGHT_CSS, widePanelHeight } from '../ui/Button';
import { levelThumbnail } from '../levels/thumbnail';
import { isCompleted, isUnlocked } from '../progress';
import { checkPack, importPack, removePack } from '../levels/importedPacks';
import { LevelParseError, stripNonLevelLines } from '../levels/LevelParser';
import type { GameData } from './Game';

//  Pack list
const PACK_W = 640;
const PACK_STEP = 88;
const PACKS_TOP = 190;
const KEY_SCROLL = 80;
//  The red ✕ beside an imported pack, which removes it
const REMOVE_SIZE = 56;
const REMOVE_FILL = 0xb03a3a;
const REMOVE_FILL_HOVER = 0xd65050;

//  A pack's levels: pages of PER_ROW x ROWS
const PER_ROW = 5;
const ROWS = 4;
export const LEVELS_PER_PAGE = PER_ROW * ROWS;
const CELL_W = 152;
const CELL_H = 120;
const STEP_X = CELL_W + 24;
const STEP_Y = CELL_H + 16;
const GRID_TOP = 165;

const BAR_HEIGHT = 100;
const BAR_DEPTH = 10;
const BAR_BUTTON_GAP = 120;
const MESSAGE_MS = 4000;
//  Largest file the Import button reads
const MAX_IMPORT_BYTES = 1024 * 1024;
//  Thumbnails kept after leaving a page, oldest dropped first, so paging through a pack of
//  hundreds of levels doesn't keep a texture for every one
const KEPT_THUMBNAILS = 60;
const keptThumbnails: string[] = [];

export interface LevelSelectData
{
    //  Index into LEVEL_PACKS of the pack to show; the list of packs if not given
    pack?: number;
    //  Page of that pack, counting from 0; the page with its first unfinished level if not given
    page?: number;
    //  Shown when the screen opens
    message?: string;
}

//  Level select, in two views. The list of packs shows each pack with how many of its levels are
//  done, and has Import, which adds a pack from a file of levels (see importedPacks.ts). A pack
//  shows its levels LEVELS_PER_PAGE at a time as thumbnail buttons, with Prev and Next (or the left
//  and right arrow keys) to turn pages. Levels after the first in a pack are locked until the one
//  before them is completed (see progress.ts).
export class LevelSelect extends Scene
{
    private maxScroll = 0;
    private messageText: GameObjects.Text;
    private messageTimer: Time.TimerEvent | null = null;

    constructor ()
    {
        super('LevelSelect');
    }

    create (data: LevelSelectData = {})
    {
        this.messageTimer = null;
        this.maxScroll = 0;
        this.cameras.main.setScroll(0, 0);

        const pack = data.pack === undefined ? undefined : LEVEL_PACKS[data.pack];
        if (pack)
        {
            this.showPack(data.pack!, pack, data.page);
        }
        else
        {
            this.showPackList();
        }

        if (data.message)
        {
            this.showMessage(data.message);
        }
    }

    //  Every pack as a button, scrolling if there are more than fit, with Back and Import below
    private showPackList ()
    {
        const { width, height } = this.scale;
        const cx = width / 2;
        this.add.text(cx, 90, 'Select Level Pack', { ...TEXT_STYLE, fontSize: 60, strokeThickness: 8 }).setOrigin(0.5);

        LEVEL_PACKS.forEach((pack, i) =>
        {
            const y = PACKS_TOP + i * PACK_STEP;
            const button = addButton(this, cx, y, pack.name, () => this.scene.restart({ pack: i } satisfies LevelSelectData),
                { width: PACK_W });
            buttonLabel(button).setX(cx - PACK_W / 2 + 24).setOrigin(0, 0.5);
            const done = pack.levels.filter(level => isCompleted(level.key)).length;
            const all = done === pack.levels.length;
            this.add.text(cx + PACK_W / 2 - 24, y, `${all ? '✓ ' : ''}${done} / ${pack.levels.length}`,
                { ...TEXT_STYLE, fontSize: 30, color: all ? '#9fe08a' : UI_LIGHT_CSS })
                .setOrigin(1, 0.5);
            if (pack.imported)
            {
                this.addRemoveButton(cx + PACK_W / 2 + 16 + REMOVE_SIZE / 2, y, pack.name);
            }
        });

        const bottom = PACKS_TOP + (LEVEL_PACKS.length - 1) * PACK_STEP + widePanelHeight(this) / 2 + 40;
        this.maxScroll = Math.max(0, bottom - (height - BAR_HEIGHT));

        this.addBar([
            ['Back', () => this.scene.start('MainMenu')],
            ['Import', () => this.pickPack()]
        ]);

        this.input.on(Input.Events.POINTER_WHEEL,
            (_pointer: Input.Pointer, _over: unknown, _dx: number, dy: number) => this.scrollBy(dy));
        const keyboard = this.input.keyboard;
        if (keyboard)
        {
            keyboard.once('keydown-ESC', () => this.scene.start('MainMenu'));
            keyboard.on('keydown-UP', () => this.scrollBy(-KEY_SCROLL));
            keyboard.on('keydown-DOWN', () => this.scrollBy(KEY_SCROLL));
        }
    }

    //  A red ✕ that removes an imported pack, after asking
    private addRemoveButton (x: number, y: number, name: string)
    {
        const button = this.add.rectangle(x, y, REMOVE_SIZE, REMOVE_SIZE, REMOVE_FILL)
            .setStrokeStyle(3, 0x000000)
            .setInteractive({ useHandCursor: true });
        this.add.text(x, y, '✕', { ...TEXT_STYLE, fontSize: 38 }).setOrigin(0.5);
        button.on('pointerover', () => button.setFillStyle(REMOVE_FILL_HOVER));
        button.on('pointerout', () => button.setFillStyle(REMOVE_FILL));
        button.on('pointerup', () =>
        {
            if (!window.confirm(`Remove the level pack "${name}"? You can import it again later, and your progress through it is kept.`))
            {
                return;
            }
            removePack(this, name);
            this.scene.restart({ message: `Removed ${name}.` } satisfies LevelSelectData);
        });
    }

    //  One page of a pack's levels, with Back to the pack list and Prev and Next between pages
    private showPack (packIndex: number, pack: LevelPack, page?: number)
    {
        const { width } = this.scale;
        const cx = width / 2;
        const pages = Math.max(1, Math.ceil(pack.levels.length / LEVELS_PER_PAGE));
        //  Open on the page with the first unfinished level
        const firstUnfinished = Math.max(0, pack.levels.findIndex(level => !isCompleted(level.key)));
        const current = Math.min(pages - 1, Math.max(0, page ?? Math.floor(firstUnfinished / LEVELS_PER_PAGE)));
        const goTo = (p: number) =>
        {
            if (p >= 0 && p < pages && p !== current)
            {
                this.scene.restart({ pack: packIndex, page: p } satisfies LevelSelectData);
            }
        };

        this.add.text(cx, 60, pack.name, { ...TEXT_STYLE, fontSize: 56, strokeThickness: 8 }).setOrigin(0.5);

        const first = current * LEVELS_PER_PAGE;
        const onPage = pack.levels.slice(first, first + LEVELS_PER_PAGE);
        const thumbnails = onPage.map(level => levelThumbnail(this, level, CELL_W - ICON_INSET * 2, CELL_H - ICON_INSET * 2));
        keepThumbnails(this, thumbnails);

        const rows = Math.ceil(onPage.length / PER_ROW);
        onPage.forEach((level, i) =>
        {
            const row = Math.floor(i / PER_ROW);
            const col = i % PER_ROW;
            //  Center each row on its own number of buttons, so a short last row is centered too
            const inRow = row < rows - 1 ? PER_ROW : onPage.length - row * PER_ROW;
            const x = cx + (col - (inRow - 1) / 2) * STEP_X;
            const y = GRID_TOP + row * STEP_Y;
            const levelIndex = LEVELS.findIndex(l => l.key === level.key);

            const button = addIconButton(this, x, y, [{ key: thumbnails[i], scale: 1 }],
                () => this.scene.start('Game', { levelIndex, from: 'LevelSelect' } satisfies GameData),
                { width: CELL_W, height: CELL_H });
            //  Level number in the corner, over the thumbnail
            this.add.text(x - CELL_W / 2 + 6, y - CELL_H / 2 + 2, String(first + i + 1),
                { ...TEXT_STYLE, fontSize: 22, strokeThickness: 4 });

            //  Locked until the previous level in the pack is completed: dimmed, with a padlock
            if (!isUnlocked(levelIndex))
            {
                button.disableInteractive();
                this.add.rectangle(x, y, CELL_W, CELL_H, 0x000000, 0.55);
                addIcon(this, x, y, 'icon-lock', undefined, 3);
            }
        });

        const toPackList = () => this.scene.restart({} satisfies LevelSelectData);
        this.addBar([
            ['Back', toPackList],
            ...(pages > 1 ? [
                ['Prev', () => goTo(current - 1), current > 0] as const,
                [`${current + 1} / ${pages}`, null] as const,
                ['Next', () => goTo(current + 1), current < pages - 1] as const
            ] : [])
        ]);

        const keyboard = this.input.keyboard;
        if (keyboard)
        {
            keyboard.once('keydown-ESC', toPackList);
            keyboard.on('keydown-LEFT', () => goTo(current - 1));
            keyboard.on('keydown-RIGHT', () => goTo(current + 1));
        }
    }

    //  The fixed bottom bar: buttons (or, with no action, a plain label) spread evenly across it,
    //  and a message line above them. A button whose third entry is false is shown dimmed and does
    //  nothing. The bar blocks clicks to anything scrolled beneath it.
    private addBar (items: readonly (readonly [string, (() => void) | null, boolean?])[])
    {
        const { width, height } = this.scale;
        const cx = width / 2;
        this.add.rectangle(0, height - BAR_HEIGHT, width, BAR_HEIGHT, 0x000000, 0.45)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(BAR_DEPTH)
            .setInteractive();

        const y = height - BAR_HEIGHT / 2 + 8;
        const step = BAR_BUTTON_GAP * 2;
        items.forEach(([label, action, enabled = true], i) =>
        {
            const x = cx + (i - (items.length - 1) / 2) * step;
            const objects: GameObjects.GameObject[] = [];
            if (action)
            {
                const button = addButton(this, x, y, label, action, { width: 180 });
                if (!enabled)
                {
                    button.disableInteractive().setAlpha(0.4);
                    buttonLabel(button).setAlpha(0.4);
                    buttonPanel(button).setAlpha(0.4);
                }
                objects.push(buttonPanel(button), button, buttonLabel(button));
            }
            else
            {
                objects.push(this.add.text(x, y, label, { ...TEXT_STYLE, fontSize: 36 }).setOrigin(0.5));
            }
            for (const object of objects as (GameObjects.GameObject & GameObjects.Components.ScrollFactor & GameObjects.Components.Depth)[])
            {
                object.setScrollFactor(0).setDepth(BAR_DEPTH + 1);
            }
        });

        this.messageText = this.add.text(cx, height - BAR_HEIGHT - 4, '', { ...TEXT_STYLE, fontSize: 24 })
            .setOrigin(0.5, 1)
            .setWordWrapWidth(width - 40)
            .setScrollFactor(0)
            .setDepth(BAR_DEPTH + 1);
    }

    //  Lets the user pick a file of levels to add as a pack
    private pickPack ()
    {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.sok,text/plain';
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

    //  Strips any text that isn't level rows, checks the file's levels, asks what to call the pack (suggesting the file's name), adds it,
    //  then opens it
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
            text = stripNonLevelLines(await file.text());
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

        try
        {
            //  Check first, so a file that can't be played doesn't get as far as asking for a name
            checkPack(text);
            const name = this.askPackName(file.name.replace(/\.(txt|sok)$/i, ''));
            if (name === null)
            {
                return;
            }
            const { count, saved } = importPack(this, name, text);
            const levels = count === 1 ? '1 level' : `${count} levels`;
            this.scene.restart({
                pack: LEVEL_PACKS.findIndex(p => p.imported && p.name === name),
                message: saved ? `Imported ${name}: ${levels}.` : `Imported ${name} (${levels}), but it couldn't be saved for next time.`
            } satisfies LevelSelectData);
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

    //  Asks for a pack name until one is given that's new or may replace the imported pack of that
    //  name; null if the user cancels
    private askPackName (suggested: string): string | null
    {
        let name: string | null = suggested;
        while (true)
        {
            name = window.prompt('Name for the imported level pack:', name)?.trim() ?? null;
            if (name === null)
            {
                return null;
            }
            if (name === '')
            {
                name = suggested;
                continue;
            }
            const taken = LEVEL_PACKS.find(p => p.name === name);
            if (!taken)
            {
                return name;
            }
            if (taken.imported && window.confirm(`There's already an imported pack called "${name}". Replace it?`))
            {
                return name;
            }
            if (!taken.imported)
            {
                window.alert(`"${name}" is the name of a built-in pack. Please choose another.`);
            }
        }
    }

    //  Shows a message above the bottom bar for a few seconds
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
    }
}

//  Notes the thumbnails a page uses and frees the least recently used beyond KEPT_THUMBNAILS.
//  Runs as a page opens, when the previous page's images are already gone.
function keepThumbnails (scene: Scene, keys: readonly string[]): void
{
    for (const key of keys)
    {
        const i = keptThumbnails.indexOf(key);
        if (i >= 0)
        {
            keptThumbnails.splice(i, 1);
        }
        keptThumbnails.push(key);
    }
    while (keptThumbnails.length > Math.max(KEPT_THUMBNAILS, keys.length))
    {
        scene.textures.remove(keptThumbnails.shift()!);
    }
}
