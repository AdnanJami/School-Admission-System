export function NeedStudent({ what }: { what: string }) {
  return (
    <div className="banner banner-info" role="status">
      Enter the student&apos;s 17-digit birth registration number at the top of the page to {what}.
    </div>
  )
}
