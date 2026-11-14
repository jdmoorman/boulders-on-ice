import type { Scene } from 'phaser';
import { LevelParseError, parseLevel, splitLevels } from './LevelParser';
import { LevelInfo, removeImportedPack, setImportedPack } from './levelList';

//  Level packs loaded from files on the Level Select screen. Each is one file of levels separated
//  by blank lines (see splitLevels), named after the file. They're kept in localStorage so they
//  (and progress through them) survive a reload; storage can be unavailable, so every access is
//  guarded.
const STORAGE_KEY = 'bouldersAndIce.importedPacks';

//  Most levels an imported pack can have
export const MAX_IMPORTED_LEVELS = 5000;

interface StoredPack
{
    name: string;
    text: string;
}

//  Text cache keys are unique per import, so a re-imported pack never reuses a stale entry
let imports = 0;

//  Checks a pack's text: at least one level, at most MAX_IMPORTED_LEVELS, and every one playable.
//  Returns the number of levels; throws LevelParseError saying what's wrong.
export function checkPack (text: string): number
{
    const levels = splitLevels(text);
    if (levels.length === 0)
    {
        throw new LevelParseError('it has no levels');
    }
    if (levels.length > MAX_IMPORTED_LEVELS)
    {
        throw new LevelParseError(`it has ${levels.length} levels; the most a pack can have is ${MAX_IMPORTED_LEVELS}`);
    }
    levels.forEach((level, i) =>
    {
        try
        {
            parseLevel(level);
        }
        catch (error)
        {
            if (error instanceof LevelParseError)
            {
                throw new LevelParseError(`level ${i + 1}: ${error.message}`);
            }
            throw error;
        }
    });
    return levels.length;
}

//  Puts a checked pack in the level list (replacing an imported pack of the same name)
function addPack (scene: Scene, { name, text }: StoredPack): void
{
    const file = `imported/${++imports}/${name}`;
    scene.cache.text.add(file, text);
    const levels: LevelInfo[] = splitLevels(text).map((_level, index) => ({
        //  Progress is kept by key, so it carries over when a pack is imported again
        key: `imported/${name}/${index + 1}`,
        file,
        index
    }));
    setImportedPack({ name, levels, imported: true });
}

function loadStored (): StoredPack[]
{
    try
    {
        const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        if (Array.isArray(saved))
        {
            return saved.filter((p): p is StoredPack =>
                typeof p === 'object' && p !== null && typeof p.name === 'string' && typeof p.text === 'string');
        }
    }
    catch
    {
        //  Unreadable or unavailable
    }
    return [];
}

//  Adds the packs imported in earlier visits. Call once, from the Preloader's create().
export function loadImportedPacks (scene: Scene): void
{
    for (const pack of loadStored())
    {
        try
        {
            checkPack(pack.text);
            addPack(scene, pack);
        }
        catch
        {
            //  A stored pack that no longer checks out (the level format changed) is left out
        }
    }
}

//  Imports a pack from a file's text, named `name`. Throws LevelParseError if it can't be
//  played. Returns how many levels it has and whether it was saved for later visits.
export function importPack (scene: Scene, name: string, text: string): { count: number, saved: boolean }
{
    const count = checkPack(text);
    addPack(scene, { name, text });

    const stored = loadStored().filter(p => p.name !== name);
    stored.push({ name, text });
    let saved = true;
    try
    {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
    catch
    {
        saved = false;
    }
    return { count, saved };
}

//  Removes an imported pack from the game and from storage. Progress through its levels is kept,
//  so importing it again picks up where it was left.
export function removePack (scene: Scene, name: string): void
{
    const pack = removeImportedPack(name);
    if (pack?.levels[0])
    {
        scene.cache.text.remove(pack.levels[0].file);
    }
    try
    {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loadStored().filter(p => p.name !== name)));
    }
    catch
    {
        //  Not saved, so nothing to remove
    }
}
