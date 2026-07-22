using System;
using System.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Platform.Infrastructure.Persistence;

public static class DatabaseMigrationHelper
{
    public static void EnsureDatabaseMigrated(ApplicationDbContext context, ILogger logger)
    {
        try
        {
            context.Database.EnsureCreated();

            if (context.Database.IsSqlite())
            {
                using var connection = context.Database.GetDbConnection();
                if (connection.State != ConnectionState.Open)
                {
                    connection.Open();
                }

                // Sync ProgrammingTasks table columns
                EnsureColumnExists(connection, "ProgrammingTasks", "EvaluationMode", "INTEGER NOT NULL DEFAULT 0", logger);
                EnsureColumnExists(connection, "ProgrammingTasks", "Language", "TEXT NOT NULL DEFAULT 'python'", logger);

                // Sync Submissions table columns
                EnsureColumnExists(connection, "Submissions", "ExecutionStatus", "TEXT NOT NULL DEFAULT 'PendingEvaluation'", logger);
                EnsureColumnExists(connection, "Submissions", "TestCaseResultsJson", "TEXT NOT NULL DEFAULT '[]'", logger);
                EnsureColumnExists(connection, "Submissions", "TeacherNotes", "TEXT NOT NULL DEFAULT ''", logger);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while ensuring SQLite database schema migration.");
        }
    }

    private static void EnsureColumnExists(IDbConnection connection, string tableName, string columnName, string columnDefinition, ILogger logger)
    {
        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = $"PRAGMA table_info(\"{tableName}\");";
            using var reader = command.ExecuteReader();

            bool exists = false;
            while (reader.Read())
            {
                var name = reader["name"]?.ToString();
                if (string.Equals(name, columnName, StringComparison.OrdinalIgnoreCase))
                {
                    exists = true;
                    break;
                }
            }
            reader.Close();

            if (!exists)
            {
                logger.LogInformation("Adding missing column '{ColumnName}' to table '{TableName}'...", columnName, tableName);
                using var alterCmd = connection.CreateCommand();
                alterCmd.CommandText = $"ALTER TABLE \"{tableName}\" ADD COLUMN \"{columnName}\" {columnDefinition};";
                alterCmd.ExecuteNonQuery();
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to verify or add column '{ColumnName}' to '{TableName}'.", columnName, tableName);
        }
    }
}
