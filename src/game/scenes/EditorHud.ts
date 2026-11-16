import { Scene, Scenes, GameObjects, Time } from 'phaser';
import { addButton, addIconButton, ButtonIcon, PANEL_SIZE, TEXT_STYLE, widePanelWidth } from '../ui/Button';
import { TileIndex } from '../levels/Tiles';
import { AUTOTILE_SETS, ISOLATED_FRAME } from '../levels/autotile';
import { EditorTool } from '../editor/EditorLevel';
import { Editor, EDITOR_EVENTS, PALETTE } from './Editor';
import type { AnalysisProgress } from '../editor/EditorAnalysis';
import type { EditorSettings } from '../editor/EditorSettings';
import { PLATE_UP_FRAME } from '../plates';
import { DOOR_CLOSED } from '../doors';

const BAR_COLOR = 0x24303f;
const SELECTED_STROKE = 0xf2c230;
const MESSAGE_MS = 3000;
//  On the square panel, like the other icon buttons (see PANEL_SIZE)
const PALETTE_BUTTON_SIZE = PANEL_SIZE;
const PALETTE_STEP = 84;
const PROGRESS_WIDTH = 200;
const OPTIONS_WIDTH = 600;
const OPTION_ROW_HEIGHT = 90;
const CHECKBOX_SIZE = 36;

//  The on/off settings in the Options popup, in order
const OPTIONS: readonly { key: keyof EditorSettings, label: string, description: string }[] = [
    {
        key: 'freeSnowWalking',
        label: 'Free walking on snow',
        description: "Analysis doesn't count steps from snow to snow, except onto traps."
    }
];

const setOf = (tile: TileIndex) => AUTOTILE_SETS.findIndex(set => set.tiles.includes(tile));
const WALL_ICON: ButtonIcon = { key: AUTOTILE_SETS[setOf(TileIndex.Wall)].texture, frame: ISOLATED_FRAME };
const SNOW_ICON: ButtonIcon = { key: 'tiles', frame: TileIndex.Floor };

//  The picture on each palette button, drawn bottom layer first
const PALETTE_ICONS: Readonly<Record<EditorTool, readonly ButtonIcon[]>> = {
    wall: [WALL_ICON],
    snow: [SNOW_ICON],
    ice: [{ key: 'tiles', frame: TileIndex.Ice }],
    //  The wall fills the button's height at 2x; the hole, at 2x too, stands on its bottom edge
    //  as it does in play
    exit: [WALL_ICON, { key: 'goal', scale: 2, offsetY: 6 }],
    player: [{ key: 'player', frame: 'palette' }],
    boulder: [{ key: 'boulder' }],
    //  At a whole-number scale, so its pixels stay even
    plate: [{ key: 'plate-press', frame: PLATE_UP_FRAME, scale: 3 }],
    //  At 2x, so the gate fits within the snow tile
    door: [SNOW_ICON, { ...DOOR_CLOSED, scale: 2 }],
    trap: [{ key: 'trap', frame: 0 }],
    erase: [],
    'erase-entity': []
};

//  The level editor's palette, buttons and messages. Runs on top of the Editor scene with its
//  own camera, so it isn't panned or zoomed. Its bars and buttons are interactive, so clicks on
//  them don't reach the canvas below.
export class EditorHud extends Scene
{
    private editor: Editor;
    private paletteButtons = new Map<EditorTool, GameObjects.Rectangle>();
    private messageText: GameObjects.Text;
    private messageTimer: Time.TimerEvent | null = null;
    private analyzeButton: GameObjects.Rectangle;
    //  The analysis search's progress, under the top bar
    private progressTrack: GameObjects.Rectangle;
    private progressFill: GameObjects.Rectangle;
    private progressText: GameObjects.Text;
    //  The Options popup's objects while it's open, and a function that shows its checkboxes'
    //  current state
    private optionsPopup: GameObjects.GameObject[] | null = null;
    private showOptionValues: (() => void) | null = null;

    constructor ()
    {
        super('EditorHud');
    }

    create ()
    {
        this.editor = this.scene.get('Editor') as Editor;
        this.paletteButtons.clear();
        this.messageTimer = null;
        this.optionsPopup = null;
        this.showOptionValues = null;

        const { width, height } = this.scale;

        //  Top bar: Menu, Undo and Redo on the left; Import, Export and Play on the right
        //  A little taller than the buttons in it
        const barHeight = PANEL_SIZE + 8;
        this.add.rectangle(0, 0, width, barHeight, BAR_COLOR, 0.92).setOrigin(0).setInteractive();
        const top = barHeight / 2;
        //  Laid out left to right with even gaps. Text buttons are at least as wide as asked (see
        //  widePanelWidth); icon buttons are PANEL_SIZE square.
        const icon = { width: PANEL_SIZE, height: PANEL_SIZE, panel: true };
        const items: { width: number, add: (x: number) => void }[] = [
            { width: widePanelWidth(this, 130), add: x => addButton(this, x, top, 'Menu', () => this.editor.toMainMenu(), { width: 130 }) },
            { width: PANEL_SIZE, add: x => addIconButton(this, x, top, [{ key: 'icon-undo' }], () => this.editor.undo(), icon) },
            { width: PANEL_SIZE, add: x => addIconButton(this, x, top, [{ key: 'icon-redo' }], () => this.editor.redo(), icon) },
            { width: widePanelWidth(this, 160), add: x =>
            {
                this.analyzeButton = addButton(this, x, top, 'Analyze', () => this.editor.toggleAnalysis(), { width: 160 });
            } },
            { width: PANEL_SIZE, add: x => addIconButton(this, x, top, [{ key: 'icon-gear' }], () => this.openOptions(), icon) },
            { width: widePanelWidth(this, 140), add: x => addButton(this, x, top, 'Import', () => this.editor.importLevel(), { width: 140 }) },
            { width: widePanelWidth(this, 140), add: x => addButton(this, x, top, 'Export', () => this.editor.exportLevel(), { width: 140 }) },
            { width: widePanelWidth(this, 116), add: x => addButton(this, x, top, 'Play', () => this.editor.play(), { width: 116 }) }
        ];
        const gap = (width - items.reduce((sum, item) => sum + item.width, 0)) / (items.length + 1);
        let left = gap;
        for (const item of items)
        {
            item.add(left + item.width / 2);
            left += item.width + gap;
        }

        //  Bottom bar: the palette (keys 1-9)
        const paletteBarHeight = PALETTE_BUTTON_SIZE + 8;
        this.add.rectangle(0, height - paletteBarHeight, width, paletteBarHeight, BAR_COLOR, 0.92).setOrigin(0).setInteractive();
        const paletteSize = { width: PALETTE_BUTTON_SIZE, height: PALETTE_BUTTON_SIZE, panel: true };
        PALETTE.forEach((tool, i) =>
        {
            const x = width / 2 + (i - (PALETTE.length - 1) / 2) * PALETTE_STEP;
            const y = height - paletteBarHeight / 2;
            const button = addIconButton(this, x, y, PALETTE_ICONS[tool], () => this.editor.selectTool(tool), paletteSize);
            this.paletteButtons.set(tool, button);

            //  The tool's shortcut key, in the button's top-left corner
            const half = PALETTE_BUTTON_SIZE / 2;
            this.add.text(x - half + 6, y - half + 4, `${i + 1}`, { ...TEXT_STYLE, fontSize: 16, strokeThickness: 4 });
        });
        this.highlightTool(this.editor.tool);

        //  Progress bar and text, under the top bar
        const progressY = barHeight + 8;
        this.progressTrack = this.add.rectangle(16, progressY, PROGRESS_WIDTH, 12, 0x000000, 0.5)
            .setOrigin(0)
            .setStrokeStyle(2, 0x000000);
        this.progressFill = this.add.rectangle(16, progressY, PROGRESS_WIDTH, 12, SELECTED_STROKE).setOrigin(0);
        this.progressText = this.add.text(16 + PROGRESS_WIDTH + 12, progressY + 6, '', { ...TEXT_STYLE, fontSize: 16, strokeThickness: 4 })
            .setOrigin(0, 0.5);

        this.messageText = this.add.text(width / 2, barHeight + 52, '', { ...TEXT_STYLE, fontSize: 24, strokeThickness: 5 })
            .setOrigin(0.5);

        const onTool = (tool: EditorTool) => this.highlightTool(tool);
        const onMessage = (text: string) => this.showMessage(text);
        const onAnalysis = () => this.showAnalysis();
        const onSettings = () => this.showOptionValues?.();
        const listeners: [string, (...args: never[]) => void][] = [
            [EDITOR_EVENTS.TOOL, onTool],
            [EDITOR_EVENTS.MESSAGE, onMessage],
            [EDITOR_EVENTS.ANALYSIS, onAnalysis],
            [EDITOR_EVENTS.PROGRESS, onAnalysis],
            [EDITOR_EVENTS.SETTINGS, onSettings]
        ];
        listeners.forEach(([event, fn]) => this.editor.events.on(event, fn));
        this.events.once(Scenes.Events.SHUTDOWN, () =>
        {
            listeners.forEach(([event, fn]) => this.editor.events.off(event, fn));
        });
        this.input.keyboard?.on('keydown-ESC', () => this.closeOptions());
        this.showAnalysis();
    }

    //  Opens the Options popup over everything, with a checkbox per setting. Clicking outside the
    //  panel, the Close button or Escape closes it. The editor ignores input while it's open.
    private openOptions ()
    {
        if (this.optionsPopup)
        {
            return;
        }
        this.editor.inputLocked = true;
        const { width, height } = this.scale;
        const panelHeight = 160 + OPTIONS.length * OPTION_ROW_HEIGHT;
        const left = (width - OPTIONS_WIDTH) / 2;
        const top = (height - panelHeight) / 2;
        const objects: GameObjects.GameObject[] = [];

        //  Covers the editor and the HUD, so only the popup can be clicked
        objects.push(this.add.rectangle(0, 0, width, height, 0x000000, 0.55)
            .setOrigin(0)
            .setInteractive()
            .on('pointerup', () => this.closeOptions()));
        objects.push(this.add.rectangle(left, top, OPTIONS_WIDTH, panelHeight, BAR_COLOR)
            .setOrigin(0)
            .setStrokeStyle(3, 0x000000)
            .setInteractive());
        objects.push(this.add.text(width / 2, top + 40, 'Editor Options', { ...TEXT_STYLE, fontSize: 32 })
            .setOrigin(0.5));

        const updates = OPTIONS.map(({ key, label, description }, i) =>
        {
            const y = top + 90 + i * OPTION_ROW_HEIGHT;
            const toggle = () => this.editor.changeSettings({ [key]: !this.editor.editorSettings[key] });

            const box = this.add.rectangle(left + 32, y, CHECKBOX_SIZE, CHECKBOX_SIZE, 0x000000, 0.5)
                .setOrigin(0)
                .setStrokeStyle(3, 0x000000)
                .setInteractive({ useHandCursor: true })
                .on('pointerup', toggle);
            const check = this.add.rectangle(left + 32 + CHECKBOX_SIZE / 2, y + CHECKBOX_SIZE / 2,
                CHECKBOX_SIZE - 14, CHECKBOX_SIZE - 14, SELECTED_STROKE);
            const textX = left + 32 + CHECKBOX_SIZE + 20;
            const title = this.add.text(textX, y + CHECKBOX_SIZE / 2, label, { ...TEXT_STYLE, fontSize: 24, strokeThickness: 5 })
                .setOrigin(0, 0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerup', toggle);
            const note = this.add.text(textX, y + CHECKBOX_SIZE + 8, description,
                { ...TEXT_STYLE, fontSize: 16, strokeThickness: 4, align: 'left' });
            objects.push(box, check, title, note);

            return () => check.setVisible(this.editor.editorSettings[key]);
        });
        this.showOptionValues = () => updates.forEach(update => update());
        this.showOptionValues();

        objects.push(addButton(this, width / 2, top + panelHeight - 44, 'Close', () => this.closeOptions(),
            { width: 160 }));
        this.optionsPopup = objects;
    }

    private closeOptions ()
    {
        if (!this.optionsPopup)
        {
            return;
        }
        this.optionsPopup.forEach(object => object.destroy());
        this.optionsPopup = null;
        this.showOptionValues = null;
        this.editor.inputLocked = false;
    }

    //  Shows whether analysis mode is on and how the search is going. The progress shows while
    //  the search runs, and always in analysis mode.
    private showAnalysis ()
    {
        const analyzing = this.editor.isAnalyzing;
        const progress = this.editor.analysisProgress;

        //  Outlined in gold while analysing; otherwise just the panel
        if (analyzing)
        {
            this.analyzeButton.setStrokeStyle(5, SELECTED_STROKE);
        }
        else
        {
            this.analyzeButton.setStrokeStyle();
        }

        const showText = analyzing || (progress?.running ?? false);
        const showBar = showText && progress !== null;
        this.progressTrack.setVisible(showBar);
        this.progressFill.setVisible(showBar);
        this.progressText.setVisible(showText).setText(progressDescription(progress));

        if (progress)
        {
            //  The total number of positions can't be known in advance, so the bar shows tiles
            //  found out of the tiles that could possibly be reached
            const fraction = !progress.running ? 1 : progress.possible > 0 ? progress.found / progress.possible : 0;
            this.progressFill.setSize(PROGRESS_WIDTH * fraction, 12);
        }
    }

    private highlightTool (selected: EditorTool)
    {
        for (const [tool, button] of this.paletteButtons)
        {
            if (tool === selected)
            {
                button.setStrokeStyle(5, SELECTED_STROKE);
            }
            else
            {
                //  No outline: the panel has its own border
                button.setStrokeStyle();
            }
        }
    }

    private showMessage (text: string)
    {
        this.messageText.setText(text).setVisible(true);
        this.messageTimer?.remove();
        this.messageTimer = this.time.delayedCall(MESSAGE_MS, () => this.messageText.setVisible(false));
    }
}

function progressDescription (progress: AnalysisProgress | null): string
{
    if (!progress)
    {
        return 'Place a player to analyze.';
    }
    const { found, possible, states, depth } = progress;
    if (progress.running)
    {
        return `Analyzing... ${found}/${possible} tiles · ${states.toLocaleString()} positions · depth ${depth}`;
    }
    if (!progress.complete)
    {
        return `Stopped at ${states.toLocaleString()} positions; some tiles may be missing.`;
    }
    return `Analysis done: ${found} ${found === 1 ? 'tile' : 'tiles'} reachable.`;
}
