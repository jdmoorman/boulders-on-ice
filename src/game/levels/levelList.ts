import type { Scene } from 'phaser';
import { LevelParseError, splitLevels } from './LevelParser';

export interface LevelInfo
{
    //  Identifies the level, e.g. in saved progress
    key: string;
    //  Path relative to public/assets. A file can hold several levels separated by blank lines
    //  (see splitLevels); the Preloader loads each file once, into the text cache under its path.
    file: string;
    //  Which level in the file, counting from 0 (default 0)
    index?: number;
}

export interface LevelPack
{
    name: string;
    levels: readonly LevelInfo[];
    //  Loaded from a file on the Level Select screen (see importedPacks.ts), not built in
    imported?: boolean;
}

//  All level packs, in order, each with its levels in play order. To add a level, put its .txt
//  file in public/assets/levels and add an entry to its pack here.
const packs: LevelPack[] = [
    {
        name: 'Boulders',
        levels: [
            { key: 'level-boulders-1', file: 'levels/boulders/level1.txt' },
            { key: 'level-boulders-2', file: 'levels/boulders/level2.txt' },
            { key: 'level-boulders-3', file: 'levels/boulders/level3.txt' }
        ]
    },
    {
        name: 'Ice',
        levels: [
            { key: 'level-ice-1', file: 'levels/ice/level1.txt' },
            { key: 'level-ice-2', file: 'levels/ice/level2.txt' },
            { key: 'level-ice-3', file: 'levels/ice/level3.txt' }
        ]
    },
    {
        name: 'Plates',
        levels: [
            { key: 'level-plates-1', file: 'levels/plates/level1.txt' },
            { key: 'level-plates-2', file: 'levels/plates/level2.txt' },
            { key: 'level-plates-3', file: 'levels/plates/level3.txt' },
            { key: 'level-plates-4', file: 'levels/plates/level4.txt' }
        ]
    },
    {
        name: 'Traps',
        levels: [
            { key: 'level-traps-1', file: 'levels/traps/level1.txt' },
            { key: 'level-traps-2', file: 'levels/traps/level2.txt' },
            { key: 'level-traps-3', file: 'levels/traps/level3.txt' }
        ]
    },
    {
        name: 'Test',
        levels: [
            { key: 'level-test-demo', file: 'levels/test/demo.txt' },
            { key: 'level-test-autotile', file: 'levels/test/autotile-test.txt' },
            { key: 'stub1', file: 'levels/test/stub.txt' },
            { key: 'stub2', file: 'levels/test/stub.txt' },
            { key: 'stub3', file: 'levels/test/stub.txt' },
            { key: 'stub4', file: 'levels/test/stub.txt' },
            { key: 'stub5', file: 'levels/test/stub.txt' },
            { key: 'stub6', file: 'levels/test/stub.txt' },
            { key: 'stub7', file: 'levels/test/stub.txt' },
        ]
    }
];

export const LEVEL_PACKS: readonly LevelPack[] = packs;

type ListedLevel = LevelInfo & { pack: LevelPack, number: number };
const levels: ListedLevel[] = [];

//  Every level, pack by pack. A level's index here is how scenes refer to it. Imported packs come
//  after the built-in ones, so adding one doesn't move any other level.
export const LEVELS: readonly ListedLevel[] = levels;

function listLevels ()
{
    levels.length = 0;
    levels.push(...packs.flatMap(pack => pack.levels.map((level, i) => ({ ...level, pack, number: i + 1 }))));
}
listLevels();

//  Takes the imported pack of this name out of the list; returns it, or undefined if there's none
export function removeImportedPack (name: string): LevelPack | undefined
{
    const i = packs.findIndex(p => p.imported && p.name === name);
    if (i < 0)
    {
        return undefined;
    }
    const [pack] = packs.splice(i, 1);
    listLevels();
    return pack;
}

//  Adds an imported pack after the others, or replaces the imported pack of the same name
export function setImportedPack (pack: LevelPack): void
{
    const i = packs.findIndex(p => p.imported && p.name === pack.name);
    if (i >= 0)
    {
        packs[i] = pack;
    }
    else
    {
        packs.push(pack);
    }
    listLevels();
}

//  Whether a level is the last in its pack, so there's no Next level after it
export function isLastInPack (index: number): boolean
{
    return LEVELS[index + 1]?.pack !== LEVELS[index].pack;
}

//  Each loaded file's levels, split once (some files hold hundreds)
const splitFiles = new Map<string, string[]>();

//  The text of a level, from its file in the text cache
export function levelText (scene: Scene, level: LevelInfo): string
{
    let levels = splitFiles.get(level.file);
    if (!levels)
    {
        levels = splitLevels(scene.cache.text.get(level.file) ?? '');
        splitFiles.set(level.file, levels);
    }
    const index = level.index ?? 0;
    const text = levels[index];
    if (text === undefined)
    {
        throw new LevelParseError(`${level.file} has ${levels.length} level(s), so no level at index ${index}`);
    }
    return text;
}
