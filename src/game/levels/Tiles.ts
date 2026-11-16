//  Tile indices into the generated 'tiles' texture strip (see textures.ts).
//  The order here must match the order the tiles are drawn in. Autotile frames follow
//  these in the strip (see autotile.ts); level data only ever holds these values.
export enum TileIndex
{
    Void = -1,  //  Phaser treats -1 as "no tile"
    Floor = 0,
    Ice = 1,
    Wall = 2
}

//  Number of plain tiles at the start of the 'tiles' strip, before the autotile frames
export const PLAIN_TILE_COUNT = TileIndex.Wall + 1;

export const TILE_SIZE = 64;

//  Things that stand on a snow or ice tile, except the goal: the exit, a hole in a south-facing
//  wall (one with no wall below), entered only from the tile below. A plate is a pressure plate,
//  pressed while the player or a boulder rests on it; a door is open while every plate is pressed;
//  a trap arms the first time the player steps on it and restarts the level the second time.
export type EntityKind = 'player' | 'boulder' | 'goal' | 'plate' | 'door' | 'trap';

export interface LegendEntry
{
    tile: TileIndex;
    //  What stands on the tile: at most one thing, or the player or a boulder on a plate or trap
    entities?: readonly EntityKind[];
}

//  ASCII level legend. For entities, lowercase means the entity stands on floor
//  and uppercase means it stands on ice. The exit is a wall. Plates and traps stand only on
//  snow, and the player or a boulder can start on one.
export const LEGEND: Readonly<Record<string, LegendEntry>> = {
    ' ': { tile: TileIndex.Void },
    '#': { tile: TileIndex.Wall },
    '.': { tile: TileIndex.Floor },
    '_': { tile: TileIndex.Ice },
    'p': { tile: TileIndex.Floor, entities: ['player'] },
    'P': { tile: TileIndex.Ice, entities: ['player'] },
    'b': { tile: TileIndex.Floor, entities: ['boulder'] },
    'B': { tile: TileIndex.Ice, entities: ['boulder'] },
    'x': { tile: TileIndex.Wall, entities: ['goal'] },
    'o': { tile: TileIndex.Floor, entities: ['plate'] },
    'd': { tile: TileIndex.Floor, entities: ['door'] },
    'D': { tile: TileIndex.Ice, entities: ['door'] },
    //  Traps only stand on snow, so the player always stops on one rather than sliding over it
    't': { tile: TileIndex.Floor, entities: ['trap'] },
    //  Sokoban's boulder and player on a target
    '*': { tile: TileIndex.Floor, entities: ['plate', 'boulder'] },
    '+': { tile: TileIndex.Floor, entities: ['plate', 'player'] },
    '&': { tile: TileIndex.Floor, entities: ['trap', 'boulder'] },
    '!': { tile: TileIndex.Floor, entities: ['trap', 'player'] }
};

//  The legend of Boxoban levels (github.com/google-deepmind/boxoban-levels), a Sokoban format:
//  boxes become boulders and their targets pressure plates, all on snow. Boxoban has no ice and
//  no exit. A level is read with this legend when it has a '$' or '@', which ours never uses.
export const BOXOBAN_LEGEND: Readonly<Record<string, LegendEntry>> = {
    '#': { tile: TileIndex.Wall },
    ' ': { tile: TileIndex.Floor },
    '.': { tile: TileIndex.Floor, entities: ['plate'] },
    '$': { tile: TileIndex.Floor, entities: ['boulder'] },
    '@': { tile: TileIndex.Floor, entities: ['player'] },
    '*': { tile: TileIndex.Floor, entities: ['plate', 'boulder'] },
    '+': { tile: TileIndex.Floor, entities: ['plate', 'player'] }
};
