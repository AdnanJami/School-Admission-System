namespace SchoolAdmission.Api.Helpers;

public static class StudentIdHeader
{
    public const string HeaderName = "X-Student-Id";
    public const string ErrorMessage =
    "X-Student-Id header is required and must be exactly 17 digits.";

    // Returns true only if the header is present once and is exactly 17 digits (0-9).
    public static bool TryGet(HttpRequest request, out string studentId)
    {
        studentId = string.Empty;

        var values = request.Headers[HeaderName];
        if (values.Count != 1)
        {
            return false;
        }

        var value = values[0];
        if (value is null || value.Length != 17 || !value.All(char.IsAsciiDigit))
        {
            return false;
        }

        studentId = value;
        return true;
    }
}