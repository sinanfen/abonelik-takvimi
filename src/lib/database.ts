import Database from '@tauri-apps/plugin-sql';

let connection: Promise<Database> | null = null;
let closing: Promise<void> | null = null;

export async function getDatabase(): Promise<Database> {
    if (closing) await closing;
    // Cache the pending load, not just its result. All startup queries must
    // wait for the same initialization, including React StrictMode mounts.
    // Keep a rejected load cached: the SQL plugin consumes migrations once,
    // so a silent retry could otherwise open an unmigrated database.
    connection ??= Database.load('sqlite:subscriptions.db');
    return connection;
}

export async function closeDatabase(): Promise<void> {
    if (closing) return closing;
    const opening = connection;
    if (!opening) return;
    closing = (async () => {
        const db = await opening;
        await db.close();
        connection = null;
    })().finally(() => {
        closing = null;
    });
    return closing;
}
