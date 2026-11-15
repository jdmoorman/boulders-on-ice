import { GameObjects } from 'phaser';
import type { GridPoint } from './LevelParser';
import type { PathSegment } from '../movement/replay';
import { tileCenter } from './LevelLoader';

const PATH_COLOR = 0x1f5fa8;
const BOULDER_PATH_COLOR = 0xb85a10;

//  Draws a route: a white dot where the player starts, then each move as a line through the
//  centres of the tiles it crosses, blue for the player and orange for pushed boulders, with a
//  dot where it ends. Used by the editor's analysis and by dev mode in play.
export function drawRoute (g: GameObjects.Graphics, start: GridPoint | null, segments: readonly PathSegment[]): void
{
    if (start)
    {
        const { x, y } = tileCenter(start);
        g.fillStyle(0xffffff, 0.9).fillCircle(x, y, 10);
    }

    for (const segment of segments)
    {
        const color = segment.kind === 'player' ? PATH_COLOR : BOULDER_PATH_COLOR;
        const points = segment.cells.map(tileCenter);
        g.lineStyle(6, color, 0.9).beginPath();
        g.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(p => g.lineTo(p.x, p.y));
        g.strokePath();

        const end = points[points.length - 1];
        g.fillStyle(color, 1).fillCircle(end.x, end.y, 8);
    }
}
