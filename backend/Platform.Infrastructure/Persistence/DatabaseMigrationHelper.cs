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

                // Sync Users table columns
                EnsureColumnExists(connection, "Users", "AvatarUrl", "TEXT NULL", logger);
                EnsureColumnExists(connection, "Users", "StudentId", "TEXT NULL", logger);
                EnsureColumnExists(connection, "Users", "EmailNotificationsEnabled", "INTEGER NOT NULL DEFAULT 1", logger);

                // Sync Courses table columns
                EnsureColumnExists(connection, "Courses", "IsArchived", "INTEGER NOT NULL DEFAULT 0", logger);

                // Sync Sessions table columns
                EnsureColumnExists(connection, "Sessions", "IsArchived", "INTEGER NOT NULL DEFAULT 0", logger);

                // Sync ProgrammingTasks table columns
                EnsureColumnExists(connection, "ProgrammingTasks", "EvaluationMode", "INTEGER NOT NULL DEFAULT 0", logger);
                EnsureColumnExists(connection, "ProgrammingTasks", "Language", "TEXT NOT NULL DEFAULT 'python'", logger);
                EnsureColumnExists(connection, "ProgrammingTasks", "AttachmentsJson", "TEXT NOT NULL DEFAULT '[]'", logger);
                EnsureColumnExists(connection, "ProgrammingTasks", "IsArchived", "INTEGER NOT NULL DEFAULT 0", logger);

                // Sync Submissions table columns
                EnsureColumnExists(connection, "Submissions", "ExecutionStatus", "TEXT NOT NULL DEFAULT 'PendingEvaluation'", logger);
                EnsureColumnExists(connection, "Submissions", "TestCaseResultsJson", "TEXT NOT NULL DEFAULT '[]'", logger);
                EnsureColumnExists(connection, "Submissions", "TeacherNotes", "TEXT NOT NULL DEFAULT ''", logger);
                EnsureColumnExists(connection, "Submissions", "TeacherFeedback", "TEXT NOT NULL DEFAULT ''", logger);
                EnsureColumnExists(connection, "Submissions", "ConsoleOutput", "TEXT NULL", logger);
                EnsureColumnExists(connection, "Submissions", "ExpectedOutput", "TEXT NULL", logger);
                EnsureColumnExists(connection, "Submissions", "SimilarityScore", "REAL NULL", logger);
                EnsureColumnExists(connection, "Submissions", "ComparisonReport", "TEXT NULL", logger);

                // Create ActivityLogs table if not exists
                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = @"
                        CREATE TABLE IF NOT EXISTS ActivityLogs (
                            Id TEXT PRIMARY KEY,
                            UserId TEXT NOT NULL,
                            Action TEXT NOT NULL,
                            Details TEXT NOT NULL,
                            CourseId TEXT NULL,
                            CourseName TEXT NULL,
                            TaskId TEXT NULL,
                            TaskTitle TEXT NULL,
                            Timestamp TEXT NOT NULL
                        );";
                    cmd.ExecuteNonQuery();
                }

                // Sync Notifications table columns
                EnsureColumnExists(connection, "Notifications", "TaskId", "TEXT NULL", logger);
                EnsureColumnExists(connection, "Notifications", "StudentId", "TEXT NULL", logger);
                EnsureColumnExists(connection, "Notifications", "SubmissionId", "TEXT NULL", logger);
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
