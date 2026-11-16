//  Gameplay tuning values. Tweak these to change how the game feels.
export const MOVEMENT = {
    //  Time (ms) to step one tile on foot
    walkMsPerTile: 200,
    //  Time (ms) per tile while sliding on ice
    slideMsPerTile: 150
};

//  Pressure plates
export const PLATES = {
    //  How long (ms) before the player or a boulder comes to rest on a plate it starts to press
    pressLeadMs: 100
};

//  Rune traps
export const TRAPS = {
    //  How long (ms) the open pit stays on screen after the player falls in, before the level
    //  starts over
    restartDelayMs: 500
};

//  Player sprite animation speed (frames per second). Standing is a single frame.
export const PLAYER_ANIMATION = {
    walkFps: 6
};

//  How the player sprite is drawn
export const PLAYER_SPRITE = {
    //  Screen pixels per sprite sheet pixel (4 = an 18x26 frame is drawn 72x104)
    pixelScale: 4,
    //  How far above the bottom edge of its tile the player's feet are drawn, in screen pixels
    feetAboveTileBottom: 4
};
