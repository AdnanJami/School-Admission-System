namespace SchoolAdmission.Api.Helpers;

public static class HoldStatusHelper
{
    // A hold that is still marked Held but past its expiry is reported as Expired,
    // even if no background job has updated the row yet.
    public static HoldStatus GetEffectiveStatus(Hold hold, DateTime now) =>
        hold.Status == HoldStatus.Held && hold.ExpiresAt <= now
            ? HoldStatus.Expired
            : hold.Status;

    public static string ToApiString(HoldStatus status) =>
        status.ToString().ToUpperInvariant();
}