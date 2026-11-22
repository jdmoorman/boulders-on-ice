import type { Scene } from 'phaser';
import { LevelParseError, splitLevels } from './LevelParser';

export interface LevelInfo
{
    //  Identifies the level, e.g. in saved progress
    key: string;
    //  Path relative to the assets folder. A file can hold several levels separated by blank lines
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
//  file in the levels folder and add an entry to its pack here.
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
            { key: 'level-traps-3', file: 'levels/traps/level3.txt' },
            { key: 'level-traps-4', file: 'levels/traps/level4.txt' },
            { key: 'level-traps-5', file: 'levels/traps/level5.txt' },
            { key: 'level-traps-6', file: 'levels/traps/level6.txt' },
            { key: 'level-traps-7', file: 'levels/traps/level7.txt' },
            { key: 'level-traps-8', file: 'levels/traps/level8.txt' },
            { key: 'level-traps-9', file: 'levels/traps/level9.txt' },
            { key: 'level-traps-10', file: 'levels/traps/level10.txt' },
            { key: 'level-traps-11', file: 'levels/traps/level11.txt' },
            { key: 'level-traps-12', file: 'levels/traps/level12.txt' },
            { key: 'level-traps-13', file: 'levels/traps/level13.txt' },
            { key: 'level-traps-14', file: 'levels/traps/level14.txt' },
            { key: 'level-traps-15', file: 'levels/traps/level15.txt' },
            { key: 'level-traps-16', file: 'levels/traps/level16.txt' },
            { key: 'level-traps-17', file: 'levels/traps/level17.txt' },
            { key: 'level-traps-18', file: 'levels/traps/level18.txt' },
            { key: 'level-traps-19', file: 'levels/traps/level19.txt' },
            { key: 'level-traps-20', file: 'levels/traps/level20.txt' },
        ]
    },
    {
        name: 'Unreasonably Hard Traps',
        levels: [
            { key: 'level-traps2-1', file: 'levels/traps2/level1.txt' },
            { key: 'level-traps2-2', file: 'levels/traps2/level2.txt' },
            { key: 'level-traps2-3', file: 'levels/traps2/level3.txt' },
            { key: 'level-traps2-4', file: 'levels/traps2/level4.txt' },
            { key: 'level-traps2-5', file: 'levels/traps2/level5.txt' },
            { key: 'level-traps2-6', file: 'levels/traps2/level6.txt' },
            { key: 'level-traps2-7', file: 'levels/traps2/level7.txt' },
            { key: 'level-traps2-8', file: 'levels/traps2/level8.txt' },
            { key: 'level-traps2-9', file: 'levels/traps2/level9.txt' },
            { key: 'level-traps2-10', file: 'levels/traps2/level10.txt' },
            { key: 'level-traps2-11', file: 'levels/traps2/level11.txt' },
            { key: 'level-traps2-12', file: 'levels/traps2/level12.txt' },
            { key: 'level-traps2-13', file: 'levels/traps2/level13.txt' },
            { key: 'level-traps2-14', file: 'levels/traps2/level14.txt' },
            { key: 'level-traps2-15', file: 'levels/traps2/level15.txt' },
            { key: 'level-traps2-16', file: 'levels/traps2/level16.txt' },
            { key: 'level-traps2-17', file: 'levels/traps2/level17.txt' },
            { key: 'level-traps2-18', file: 'levels/traps2/level18.txt' },
            { key: 'level-traps2-19', file: 'levels/traps2/level19.txt' },
            { key: 'level-traps2-20', file: 'levels/traps2/level20.txt' },
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
