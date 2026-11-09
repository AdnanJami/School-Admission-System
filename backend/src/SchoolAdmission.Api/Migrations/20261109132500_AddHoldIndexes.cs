using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolAdmission.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHoldIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Holds_ClassId_Status",
                table: "Holds",
                columns: new[] { "ClassId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Holds_ClassId_StudentId",
                table: "Holds",
                columns: new[] { "ClassId", "StudentId" },
                unique: true,
                filter: "\"Status\" IN ('Held','Confirmed')");

            migrationBuilder.CreateIndex(
                name: "IX_Holds_StudentId",
                table: "Holds",
                column: "StudentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Holds_ClassId_Status",
                table: "Holds");

            migrationBuilder.DropIndex(
                name: "IX_Holds_ClassId_StudentId",
                table: "Holds");

            migrationBuilder.DropIndex(
                name: "IX_Holds_StudentId",
                table: "Holds");
        }
    }
}
