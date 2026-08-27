use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Database migrations
    let migrations = vec![
        Migration {
            version: 1,
            description: "Create subscriptions table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL CHECK(type IN ('subscription', 'credit_card', 'bill', 'other')),
                    category TEXT NOT NULL,
                    frequency TEXT NOT NULL CHECK(frequency IN ('monthly', 'weekly', 'yearly', 'custom')),
                    day_of_month INTEGER,
                    amount REAL,
                    currency TEXT DEFAULT 'TRY',
                    payment_method TEXT,
                    reminders TEXT DEFAULT '[]',
                    is_active INTEGER DEFAULT 1,
                    notes TEXT,
                    statement_day INTEGER,
                    due_day INTEGER,
                    start_date TEXT,
                    end_date TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "Add sort_order column",
            sql: "ALTER TABLE subscriptions ADD COLUMN sort_order INTEGER DEFAULT 0;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "Add recurrence mode and monthly snapshots",
            sql: r#"
                ALTER TABLE subscriptions ADD COLUMN recurrence_type TEXT NOT NULL DEFAULT 'recurring'
                    CHECK(recurrence_type IN ('recurring', 'one_time'));

                CREATE TABLE IF NOT EXISTS monthly_snapshots (
                    id TEXT PRIMARY KEY NOT NULL,
                    month TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS snapshot_items (
                    id TEXT PRIMARY KEY NOT NULL,
                    snapshot_id TEXT NOT NULL,
                    subscription_id TEXT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    category TEXT NOT NULL,
                    event_kind TEXT NOT NULL,
                    occurrence_date TEXT NOT NULL,
                    amount REAL,
                    currency TEXT NOT NULL DEFAULT 'TRY',
                    notes TEXT,
                    status TEXT NOT NULL DEFAULT 'planned',
                    sort_order INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(snapshot_id) REFERENCES monthly_snapshots(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_snapshot_items_snapshot
                    ON snapshot_items(snapshot_id, occurrence_date, sort_order);
                CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_month
                    ON monthly_snapshots(month);
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:subscriptions.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
