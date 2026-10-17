using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServiceTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateWorkdayModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "overtime_hours",
                table: "work_days",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "overtime_hours",
                table: "work_days");
        }
    }
}
