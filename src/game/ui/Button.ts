import { Scene, GameObjects } from 'phaser';

//  The light colour of the pixel-art icons, for text and drawings in the UI
export const UI_LIGHT = 0xc7cfcc;
export const UI_LIGHT_CSS = '#c7cfcc';

export const TEXT_STYLE = {
    fontFamily: 'Arial Black', color: UI_LIGHT_CSS,
    stroke: '#000000', strokeThickness: 6,
    align: 'center'
};

export interface ButtonSize
{
    width?: number;
    height?: number;
}

export interface IconButtonOptions extends ButtonSize
{
    //  Draw the button as the pixel-art panel ('ui-panel', loaded in the Preloader) instead of a
    //  flat rectangle. Size the button with PANEL_SIZE (see there) to keep the pixels even.
    panel?: boolean;
}

const LABEL_KEY = 'label';
//  Multiplied into the panel while the pointer is over it
const PANEL_HOVER_TINT = 0xb8d0e8;

//  The text label of a button made by addButton, e.g. to move or restyle it with the button
export function buttonLabel (button: GameObjects.Rectangle): GameObjects.Text
{
    return button.getData(LABEL_KEY) as GameObjects.Text;
}

const FILL = 0x3d6fa8;
const FILL_HOVER = 0x5a8fcc;

//  Adds a clickable rectangle button with a centered label and a hover highlight.
export function addButton (
    scene: Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    { width = 200, height = 64 }: ButtonSize = {}
): GameObjects.Rectangle
{
    const button = scene.add.rectangle(x, y, width, height, FILL)
        .setStrokeStyle(3, 0x000000)
        .setInteractive({ useHandCursor: true });

    const text = scene.add.text(x, y, label, { ...TEXT_STYLE, fontSize: 28 }).setOrigin(0.5);
    //  Destroying the button takes its label with it
    button.once(GameObjects.Events.DESTROY, () => text.destroy());
    button.setData(LABEL_KEY, text);

    button.on('pointerover', () => button.setFillStyle(FILL_HOVER));
    button.on('pointerout', () => button.setFillStyle(FILL));
    button.on('pointerup', onClick);

    return button;
}

//  One layer of an icon button's picture: a texture and, optionally, a frame of it
export interface ButtonIcon
{
    key: string;
    frame?: string | number;
    //  Draw at this scale instead of scaling to fit the button
    scale?: number;
    //  Move the picture down by this many pixels from the button's centre (up if negative)
    offsetY?: number;
}

export const ICON_INSET = 8;
//  The panel image's size, with room for a 16px icon in the middle. A panel button
//  PANEL_SCALE times that draws the panel and a 16px icon at the same whole-number scale.
const PANEL_PIXELS = 24;
const PANEL_ICON_PIXELS = 16;
const PANEL_SCALE = 3;
export const PANEL_SIZE = PANEL_PIXELS * PANEL_SCALE;
//  The margin around the icon, as a fraction of the panel
const PANEL_BORDER = (PANEL_PIXELS - PANEL_ICON_PIXELS) / 2 / PANEL_PIXELS;

//  Adds a clickable rectangle button showing images instead of a label. The icons are drawn in
//  order, each scaled to fit inside the button without stretching.
export function addIconButton (
    scene: Scene,
    x: number,
    y: number,
    icons: readonly ButtonIcon[],
    onClick: () => void,
    { width = 64, height = 64, panel = false }: IconButtonOptions = {}
): GameObjects.Rectangle
{
    //  With a panel, the rectangle is only the (invisible) clickable area
    const panelImage = panel ? scene.add.image(x, y, 'ui-panel').setDisplaySize(width, height) : null;
    const button = scene.add.rectangle(x, y, width, height, FILL, panel ? 0 : 1)
        .setInteractive({ useHandCursor: true });
    if (!panel)
    {
        button.setStrokeStyle(3, 0x000000);
    }

    const images = icons.map(({ key, frame, scale, offsetY = 0 }) =>
    {
        const image = scene.add.image(x, y + offsetY, key, frame);
        const insetX = panel ? width * PANEL_BORDER : ICON_INSET;
        const insetY = panel ? height * PANEL_BORDER : ICON_INSET;
        const fit = Math.min((width - insetX * 2) / image.width, (height - insetY * 2) / image.height);
        return image.setScale(scale ?? fit);
    });
    button.once(GameObjects.Events.DESTROY, () =>
    {
        images.forEach(image => image.destroy());
        panelImage?.destroy();
    });

    if (panelImage)
    {
        button.on('pointerover', () => panelImage.setTint(PANEL_HOVER_TINT));
        button.on('pointerout', () => panelImage.clearTint());
    }
    else
    {
        button.on('pointerover', () => button.setFillStyle(FILL_HOVER));
        button.on('pointerout', () => button.setFillStyle(FILL));
    }
    button.on('pointerup', onClick);

    return button;
}
