using Microsoft.EntityFrameworkCore;

namespace SchoolAdmission.Api;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<SchoolClass> Classes { get; set; }
    public DbSet<Hold> Holds { get; set; }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
    modelBuilder.Entity<Hold>()
        .Property(h => h.Status)
        .HasConversion<string>();          

    modelBuilder.Entity<SchoolClass>()
        .HasIndex(c => c.Name)
        .IsUnique();

    modelBuilder.Entity<Hold>()
        .HasIndex(h => new { h.ClassId, h.StudentId })
        .IsUnique()
        .HasFilter("\"Status\" IN ('Held','Confirmed')");

    modelBuilder.Entity<Hold>().HasIndex(h => new { h.ClassId, h.Status });
    modelBuilder.Entity<Hold>().HasIndex(h => h.StudentId);
    }
}