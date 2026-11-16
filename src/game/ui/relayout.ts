import { Scale, Scene, Scenes } from 'phaser';

//  How long the window has to stay one size before a scene is laid out again, so dragging the
//  window's edge doesn't rebuild it every frame
const SETTLE_MS = 150;

//  The game resizes to fill the window. A screen laid out once in create(), from the screen's
//  size (menus, popups, the editor's bars), is laid out again for a new size by restarting it
//  with the data it was started with. `beforeRestart` undoes anything it did outside itself.
//  Scenes whose cameras simply show more or less of the world (the level, the editor's map)
//  don't need this.
export function relayoutOnResize (scene: Scene, beforeRestart?: () => void): void
{
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () =>
    {
        clearTimeout(timer);
        //  A timeout rather than the scene clock, which stops while the scene is paused
        timer = setTimeout(() =>
        {
            beforeRestart?.();
            scene.scene.restart();
        }, SETTLE_MS);
    };
    scene.scale.on(Scale.Events.RESIZE, onResize);
    scene.events.once(Scenes.Events.SHUTDOWN, () =>
    {
        scene.scale.off(Scale.Events.RESIZE, onResize);
        clearTimeout(timer);
    });
}
