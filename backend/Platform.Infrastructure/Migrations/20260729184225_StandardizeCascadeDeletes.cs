using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Platform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class StandardizeCascadeDeletes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ActivityLogs_ProgrammingTasks_TaskId",
                table: "ActivityLogs");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_TaskId",
                table: "Notifications",
                column: "TaskId");

            migrationBuilder.AddForeignKey(
                name: "FK_ActivityLogs_ProgrammingTasks_TaskId",
                table: "ActivityLogs",
                column: "TaskId",
                principalTable: "ProgrammingTasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_ProgrammingTasks_TaskId",
                table: "Notifications",
                column: "TaskId",
                principalTable: "ProgrammingTasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ActivityLogs_ProgrammingTasks_TaskId",
                table: "ActivityLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_ProgrammingTasks_TaskId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_TaskId",
                table: "Notifications");

            migrationBuilder.AddForeignKey(
                name: "FK_ActivityLogs_ProgrammingTasks_TaskId",
                table: "ActivityLogs",
                column: "TaskId",
                principalTable: "ProgrammingTasks",
                principalColumn: "Id");
        }
    }
}
