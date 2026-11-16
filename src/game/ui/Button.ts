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

//  Size of a text button made by addButton. Its height is always widePanelHeight.
export interface TextButtonSize
{
    //  At least this wide (see widePanelWidth)
    width?: number;
}

const LABEL_KEY = 'label';
const PANEL_KEY = 'panel';
//  Multiplied into the panel while the pointer is over it
const PANEL_HOVER_TINT = 0xb8d0e8;

//  The text label of a button made by addButton, e.g. to move or restyle it with the button
export function buttonLabel (button: GameObjects.Rectangle): GameObjects.Text
{
    return button.getData(LABEL_KEY) as GameObjects.Text;
}

//  The panel image behind a button made by addButton, e.g. to dim it with the button
export function buttonPanel (button: GameObjects.Rectangle): GameObjects.Container
{
    return button.getData(PANEL_KEY) as GameObjects.Container;
}

const FILL = 0x3d6fa8;
const FILL_HOVER = 0x5a8fcc;

//  The wide panel behind text buttons ('ui-wide-panel', loaded in the Preloader), drawn at
//  PANEL_SCALE. It can't be narrower than its image, but widens by repeating the 2px slice in
//  its middle. Its size is read from the loaded image, so the art can be resized.
const WIDE_PANEL_SLICE_WIDTH = 2;

function widePanelImage (scene: Scene): { width: number, height: number, sliceX: number }
{
    //  The whole image ('__BASE'): once the frames below are added, Phaser's default frame is the first of them
    const { width, height } = scene.textures.getFrame('ui-wide-panel', '__BASE');
    return { width, height, sliceX: width / 2 - WIDE_PANEL_SLICE_WIDTH / 2 };
}

//  The panel's width in its own pixels for a button at least `width` wide: the image's width
//  plus as many slices as needed
function widePanelPixels (scene: Scene, width: number): number
{
    const image = widePanelImage(scene);
    const extra = Math.max(0, Math.ceil((width / PANEL_SCALE - image.width) / WIDE_PANEL_SLICE_WIDTH));
    return image.width + extra * WIDE_PANEL_SLICE_WIDTH;
}

//  The width a text button asked to be at least `width` wide actually gets
export function widePanelWidth (scene: Scene, width: number): number
{
    return widePanelPixels(scene, width) * PANEL_SCALE;
}

//  The height of every text button
export function widePanelHeight (scene: Scene): number
{
    return widePanelImage(scene).height * PANEL_SCALE;
}

//  The wide panel at `pixels` wide (in its own pixels), centred on (x, y) at PANEL_SCALE: its
//  left and right ends, and the middle slice between them. The slice's two columns are the same,
//  so stretching it looks the same as repeating it.
function addWidePanel (scene: Scene, x: number, y: number, pixels: number): GameObjects.Container
{
    const texture = scene.textures.get('ui-wide-panel');
    const { width: w, height: h, sliceX } = widePanelImage(scene);
    const sliceW = WIDE_PANEL_SLICE_WIDTH;
    const rightW = w - sliceX - sliceW;
    if (!texture.has('left'))
    {
        texture.add('left', 0, 0, 0, sliceX, h);
        texture.add('slice', 0, sliceX, 0, sliceW, h);
        texture.add('right', 0, sliceX + sliceW, 0, rightW, h);
    }
    const half = pixels * PANEL_SCALE / 2;
    const parts = [
        scene.add.image(-half, 0, 'ui-wide-panel', 'left').setOrigin(0, 0.5).setScale(PANEL_SCALE),
        scene.add.image(0, 0, 'ui-wide-panel', 'slice')
            .setDisplaySize((pixels - sliceX - rightW) * PANEL_SCALE, h * PANEL_SCALE),
        scene.add.image(half, 0, 'ui-wide-panel', 'right').setOrigin(1, 0.5).setScale(PANEL_SCALE)
    ];
    return scene.add.container(x, y, parts).setSize(pixels * PANEL_SCALE, h * PANEL_SCALE);
}

//  Adds a clickable button with a centred label on the wide panel, at least `width` wide (see
//  widePanelWidth) and widePanelHeight tall, tinted while the pointer is over it. The
//  returned rectangle is the (invisible) clickable area; an outline set on it shows over the
//  panel.
export function addButton (
    scene: Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    { width = 200 }: TextButtonSize = {}
): GameObjects.Rectangle
{
    const panel = addWidePanel(scene, x, y, widePanelPixels(scene, width));
    const button = scene.add.rectangle(x, y, panel.width, panel.height, FILL, 0)
        .setInteractive({ useHandCursor: true });

    const text = scene.add.text(x, y, label, { ...TEXT_STYLE, fontSize: 28 }).setOrigin(0.5);
    //  Destroying the button takes its label and panel with it
    button.once(GameObjects.Events.DESTROY, () =>
    {
        text.destroy();
        panel.destroy();
    });
    button.setData(LABEL_KEY, text);
    button.setData(PANEL_KEY, panel);

    const parts = panel.list as GameObjects.Image[];
    button.on('pointerover', () => parts.forEach(part => part.setTint(PANEL_HOVER_TINT)));
    button.on('pointerout', () => parts.forEach(part => part.clearTint()));
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
