import type { GridPoint, LevelData } from '../levels/LevelParser';
import { resolveMove, startArmedTraps } from './Movement';
import { LETTER_DIRECTIONS } from '../editor/analysisShared';

//  Part of a route, for drawing: cells the player or a pushed boulder passes through, in order
export interface PathSegment
{
    kind: 'player' | 'boulder';
    cells: GridPoint[];
}

//  The route for a sequence of moves (letters, see DIRECTION_LETTERS) from a level's position,
//  replayed with the game's rules. armedTraps: indices into level.traps of traps already armed.
//  Stopping on a trap arms it, and a boulder stopping on an armed one falls in and leaves it
//  unarmed (the player stopping on one would end the route).
export function replayMoves (level: LevelData, moves: string, armedTraps: readonly number[] = startArmedTraps(level)): PathSegment[]
{
    const data: LevelData = { ...level, boulders: level.boulders.map(b => ({ ...b })) };
    let player = data.player;
    const segments: PathSegment[] = [];
    const armed = data.traps.map((_t, i) => armedTraps.includes(i));
    const trapAt = (p: GridPoint) => data.traps.findIndex(t => t.x === p.x && t.y === p.y);

    for (const letter of moves)
    {
        const result = resolveMove(data, player, LETTER_DIRECTIONS[letter], armed.every(a => a));
        switch (result.kind)
        {
            case 'walk':
            {
                segments.push({ kind: 'player', cells: [player, ...result.path] });
                player = result.path[result.path.length - 1];
                const trap = trapAt(player);
                if (trap >= 0)
                {
                    armed[trap] = true;
                }
                break;
            }

            case 'exit':
                segments.push({ kind: 'player', cells: [player, ...result.path, result.exit] });
                player = result.exit;
                break;

            case 'push':
            {
                const boulder = data.boulders[result.boulderIndex];
                segments.push({ kind: 'boulder', cells: [boulder, ...result.path] });
                const end = result.path[result.path.length - 1];
                const trap = trapAt(end);
                if (trap >= 0 && armed[trap])
                {
                    data.boulders.splice(result.boulderIndex, 1);
                    armed[trap] = false;
                }
                else
                {
                    data.boulders[result.boulderIndex] = end;
                    if (trap >= 0)
                    {
                        armed[trap] = true;
                    }
                }
                break;
            }
        }
    }
    return segments;
}
