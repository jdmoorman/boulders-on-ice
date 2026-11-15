//  Gameplay settings, changed in the Settings popup (see SettingsPopup) and remembered in
//  localStorage across visits and reloads. Storage can be unavailable (private windows, blocked
//  site data), in which case the defaults are used and changes last until the page is closed.
export interface GameSettings
{
    //  Tools for working on the game itself
    devMode: boolean;
}

export const DEFAULT_GAME_SETTINGS: Readonly<GameSettings> = {
    devMode: false
};

const SETTINGS_KEY = 'bouldersAndIce.gameSettings';

let current: GameSettings | null = null;

//  The current settings (read from storage the first time)
export function gameSettings (): Readonly<GameSettings>
{
    if (!current)
    {
        current = { ...DEFAULT_GAME_SETTINGS };
        try
        {
            const saved: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
            if (saved && typeof saved === 'object')
            {
                //  Keep only known settings of the right type, so an old or edited value can't break anything
                for (const key of Object.keys(current) as (keyof GameSettings)[])
                {
                    const value = (saved as Record<string, unknown>)[key];
                    if (typeof value === typeof current[key])
                    {
                        current[key] = value as GameSettings[typeof key];
                    }
                }
            }
        }
        catch
        {
            //  Unreadable or unavailable; use the defaults
        }
    }
    return current;
}

//  Changes some settings and remembers them
export function changeGameSettings (changes: Partial<GameSettings>): void
{
    current = { ...gameSettings(), ...changes };
    try
    {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
    }
    catch
    {
        //  Can't save; the settings last until the page is closed
    }
}
