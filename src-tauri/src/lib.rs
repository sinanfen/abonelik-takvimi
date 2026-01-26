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

