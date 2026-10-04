use sqlx::{
    migrate::Migration as SqlxMigration, sqlite::SqliteConnectOptions, Connection, SqliteConnection,
};
use std::{path::Path, sync::OnceLock};
use tauri_plugin_sql::Migration;

// The early desktop build applied this exact v4 before desktop notifications
// were removed. Accept only its known checksum, without rewriting migration
// history or accepting arbitrary mismatches. Published v4 remains unchanged.
const LEGACY_V4_SQL: &str = r#"
                ALTER TABLE subscriptions ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'manual'
                    CHECK(payment_mode IN ('manual', 'automatic'));

                CREATE TABLE IF NOT EXISTS reminder_dispatches (
                    id TEXT PRIMARY KEY NOT NULL,
                    subscription_id TEXT NOT NULL,
                    occurrence_date TEXT NOT NULL,
                    reminder_days INTEGER NOT NULL,
                    channel TEXT NOT NULL CHECK(channel IN ('desktop', 'email')),
                    sent_at TEXT NOT NULL,
                    UNIQUE(subscription_id, occurrence_date, reminder_days, channel)
                );

                CREATE INDEX IF NOT EXISTS idx_reminder_dispatches_lookup
                    ON reminder_dispatches(subscription_id, occurrence_date, reminder_days, channel);
            "#;

// v0.5.0 Windows installers embedded v5 with CRLF line endings. New builds
// keep SQL files LF on every OS, but must still validate existing CRLF v5 DBs.
fn legacy_v5_sql() -> &'static str {
    static SQL: OnceLock<String> = OnceLock::new();
    SQL.get_or_init(|| {
        include_str!("../migrations/005_variable_amounts.sql")
            .replace("\r\n", "\n")
            .replace('\n', "\r\n")
    })
}

async fn select_compatible_migrations(
    connection: &mut SqliteConnection,
    migrations: &mut [Migration],
) -> Result<(), sqlx::Error> {
    let has_history: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations')",
    )
    .fetch_one(&mut *connection)
    .await?;
    if !has_history {
        return Ok(());
    }
    let applied: Vec<(i64, Vec<u8>)> = sqlx::query_as(
        "SELECT version, checksum FROM _sqlx_migrations WHERE version IN (4, 5) AND success = 1",
    )
    .fetch_all(&mut *connection)
    .await?;
    for (version, checksum) in applied {
        if let Some(migration) = migrations
            .iter_mut()
            .find(|migration| migration.version == version)
        {
            let sql = match version {
                4 => LEGACY_V4_SQL,
                5 => legacy_v5_sql(),
                _ => continue,
            };
            let legacy = SqlxMigration::new(
                version,
                migration.description.into(),
                sqlx::migrate::MigrationType::ReversibleUp,
                sql.into(),
                false,
            );
            if checksum.as_slice() == legacy.checksum.as_ref() {
                migration.sql = sql;
            }
        }
    }
    Ok(())
}

pub async fn compatible_migrations(
    path: &Path,
    mut migrations: Vec<Migration>,
) -> Result<Vec<Migration>, sqlx::Error> {
    if path.exists() {
        let mut connection = SqliteConnection::connect_with(
            &SqliteConnectOptions::new().filename(path).read_only(true),
        )
        .await?;
        let result = select_compatible_migrations(&mut connection, &mut migrations).await;
        connection.close().await?;
        result?;
    }
    Ok(migrations)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::migrate::{MigrateError, Migrator};
    use std::borrow::Cow;

    // Use SQLx's real checksum validation and transactional migration runner,
    // not just executing SQL statements in a mocked repository.
    fn migrator(migrations: Vec<Migration>) -> Migrator {
        Migrator {
            migrations: Cow::Owned(
                migrations
                    .into_iter()
                    .map(|migration| {
                        SqlxMigration::new(
                            migration.version,
                            migration.description.into(),
                            sqlx::migrate::MigrationType::ReversibleUp,
                            migration.sql.into(),
                            false,
                        )
                    })
                    .collect(),
            ),
            ..Migrator::DEFAULT
        }
    }

    async fn upgrade(legacy: bool) {
        let mut connection = SqliteConnection::connect("sqlite::memory:").await.unwrap();
        let mut original = crate::database_migrations();
        original.retain(|migration| migration.version <= 4);
        if legacy {
            original
                .iter_mut()
                .find(|migration| migration.version == 4)
                .unwrap()
                .sql = LEGACY_V4_SQL;
        }
        migrator(original).run(&mut connection).await.unwrap();
        sqlx::query("INSERT INTO subscriptions (id, name, type, category, frequency, amount) VALUES ('water', 'Su', 'bill', 'Utilities', 'monthly', 123.45)")
            .execute(&mut connection).await.unwrap();
        sqlx::query("INSERT INTO monthly_snapshots VALUES ('october', '2026-10', '2026-10-01', '2026-10-01')")
            .execute(&mut connection).await.unwrap();
        sqlx::query("INSERT INTO snapshot_items (id, snapshot_id, subscription_id, name, type, category, event_kind, occurrence_date, amount, status, created_at) VALUES ('paid', 'october', 'water', 'Su', 'bill', 'Utilities', 'payment', '2026-10-15', 123.45, 'done', '2026-10-01')")
            .execute(&mut connection).await.unwrap();
        let original_checksum: Vec<u8> =
            sqlx::query_scalar("SELECT checksum FROM _sqlx_migrations WHERE version = 4")
                .fetch_one(&mut connection)
                .await
                .unwrap();

        let mut upgraded = crate::database_migrations();
        select_compatible_migrations(&mut connection, &mut upgraded)
            .await
            .unwrap();
        migrator(upgraded).run(&mut connection).await.unwrap();
        let row: (String, String, f64, String, String) = sqlx::query_as(
            "SELECT id, amount_mode, amount, status, scheduled_date FROM snapshot_items WHERE snapshot_id = 'october'",
        ).fetch_one(&mut connection).await.unwrap();
        assert_eq!(
            row,
            (
                "paid".into(),
                "variable".into(),
                123.45,
                "done".into(),
                "2026-10-15".into()
            )
        );
        let checksum: Vec<u8> =
            sqlx::query_scalar("SELECT checksum FROM _sqlx_migrations WHERE version = 4")
                .fetch_one(&mut connection)
                .await
                .unwrap();
        assert_eq!(checksum, original_checksum);

        // Reopening/initializing again must neither rerun ALTERs nor lose data.
        let mut reopened = crate::database_migrations();
        select_compatible_migrations(&mut connection, &mut reopened)
            .await
            .unwrap();
        migrator(reopened).run(&mut connection).await.unwrap();
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM snapshot_items")
            .fetch_one(&mut connection)
            .await
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn upgrades_legacy_v4_and_preserves_october_history() {
        tauri::async_runtime::block_on(upgrade(true));
    }

    #[test]
    fn upgrades_published_v4_and_preserves_october_history() {
        tauri::async_runtime::block_on(upgrade(false));
    }

    #[test]
    fn initializes_fresh_database_and_upgrades_v3() {
        tauri::async_runtime::block_on(async {
            for version in [0, 3] {
                let mut connection = SqliteConnection::connect("sqlite::memory:").await.unwrap();
                if version > 0 {
                    let mut original = crate::database_migrations();
                    original.retain(|migration| migration.version <= version);
                    migrator(original).run(&mut connection).await.unwrap();
                }
                let mut upgraded = crate::database_migrations();
                select_compatible_migrations(&mut connection, &mut upgraded)
                    .await
                    .unwrap();
                migrator(upgraded).run(&mut connection).await.unwrap();
                let applied: i64 = sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations")
                    .fetch_one(&mut connection)
                    .await
                    .unwrap();
                assert_eq!(applied, 5);
                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM pragma_table_info('snapshot_items') WHERE name IN ('amount_mode', 'scheduled_date', 'amount_overridden', 'date_overridden')")
                    .fetch_one(&mut connection).await.unwrap();
                assert_eq!(count, 4);
            }
        });
    }

    #[test]
    fn reopens_published_v5_with_lf_or_crlf_without_changing_data_or_checksums() {
        tauri::async_runtime::block_on(async {
            for crlf in [false, true] {
                let mut connection = SqliteConnection::connect("sqlite::memory:").await.unwrap();
                let mut original = crate::database_migrations();
                if crlf {
                    original
                        .iter_mut()
                        .find(|migration| migration.version == 5)
                        .unwrap()
                        .sql = legacy_v5_sql();
                }
                migrator(original).run(&mut connection).await.unwrap();
                sqlx::query("INSERT INTO subscriptions (id, name, type, category, frequency, amount, amount_mode) VALUES ('rent', 'Kira', 'other', 'Housing', 'monthly', 15000, 'fixed')")
                    .execute(&mut connection).await.unwrap();
                let before: Vec<(i64, Vec<u8>)> = sqlx::query_as(
                    "SELECT version, checksum FROM _sqlx_migrations ORDER BY version",
                )
                .fetch_all(&mut connection)
                .await
                .unwrap();
                let mut reopened = crate::database_migrations();
                select_compatible_migrations(&mut connection, &mut reopened)
                    .await
                    .unwrap();
                migrator(reopened).run(&mut connection).await.unwrap();
                let after: Vec<(i64, Vec<u8>)> = sqlx::query_as(
                    "SELECT version, checksum FROM _sqlx_migrations ORDER BY version",
                )
                .fetch_all(&mut connection)
                .await
                .unwrap();
                assert_eq!(before, after);
                let amount: f64 =
                    sqlx::query_scalar("SELECT amount FROM subscriptions WHERE id = 'rent'")
                        .fetch_one(&mut connection)
                        .await
                        .unwrap();
                assert_eq!(amount, 15000.0);
            }
        });
    }

    #[test]
    fn rejects_unknown_migration_checksums() {
        tauri::async_runtime::block_on(async {
            let mut connection = SqliteConnection::connect("sqlite::memory:").await.unwrap();
            let mut original = crate::database_migrations();
            original.retain(|migration| migration.version <= 4);
            migrator(original).run(&mut connection).await.unwrap();
            sqlx::query("UPDATE _sqlx_migrations SET checksum = X'1234' WHERE version = 4")
                .execute(&mut connection)
                .await
                .unwrap();
            let mut upgraded = crate::database_migrations();
            select_compatible_migrations(&mut connection, &mut upgraded)
                .await
                .unwrap();
            assert!(matches!(
                migrator(upgraded).run(&mut connection).await,
                Err(MigrateError::VersionMismatch(4))
            ));
            let applied: i64 = sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations")
                .fetch_one(&mut connection)
                .await
                .unwrap();
            assert_eq!(applied, 4);
        });
    }
}
