import type { AnalysisMessage, AnalysisRequest } from './editor/analysisShared';
import { parseLevel } from './levels/LevelParser';
import { startArmedTraps } from './movement/Movement';

//  The fewest steps (arrow-key presses that move the player or push a boulder) that solve a level
//  from its start, found in the background with the editor's analysis search. Kept per level text
//  for the session, so replaying a level doesn't search again. Only one search runs at a time:
//  starting another stops an unfinished one.

//  null when the level has no solution, or the search gave up before finding one
const found = new Map<string, Promise<number | null>>();
let running: { text: string, worker: Worker, settle: (steps: number | null) => void } | null = null;

export function bestSteps (text: string): Promise<number | null>
{
    const known = found.get(text);
    if (known)
    {
        return known;
    }
    if (running)
    {
        //  Abandoned, so it's searched again if that level is played again
        running.worker.terminate();
        found.delete(running.text);
        running.settle(null);
        running = null;
    }

    const level = parseLevel(text);
    const promise = new Promise<number | null>(resolve =>
    {
        const worker = new Worker(new URL('./editor/analysis.worker.ts', import.meta.url), { type: 'module' });
        const search = { text, worker, settle: resolve };
        const finish = (steps: number | null) =>
        {
            worker.terminate();
            if (running === search)
            {
                running = null;
            }
            resolve(steps);
        };
        worker.addEventListener('message', (event: MessageEvent<AnalysisMessage>) =>
        {
            if (event.data.done)
            {
                //  Every move costs one when walking on snow isn't free, so this is the step count
                finish(event.data.solution?.length ?? null);
            }
        });
        worker.addEventListener('error', event =>
        {
            console.error('Fewest-steps search failed:', event.message);
            found.delete(text);
            finish(null);
        });
        const request: AnalysisRequest = { level, freeSnowWalking: false, solve: true, armedTraps: startArmedTraps(level) };
        worker.postMessage(request);
        running = search;
    });
    found.set(text, promise);
    return promise;
}
