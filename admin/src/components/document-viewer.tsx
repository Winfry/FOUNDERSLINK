interface DocumentViewerProps {
  title?: string;
  fileName?: string;
  mimeType?: string;
  previewUrl?: string;
}

export function DocumentViewer({ fileName = "Document", mimeType, previewUrl }: DocumentViewerProps) {
  const isImage = mimeType?.startsWith("image/") ?? false;
  const canOpen = previewUrl?.startsWith("/api/") ?? false;

  if (isImage && previewUrl) {
    return (
      <div className="overflow-hidden rounded-card border border-border bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt={fileName} className="max-h-[480px] w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-background p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-navy">{fileName}</p>
        <p className="mt-0.5 text-xs text-muted">
          {canOpen ? "Opens in a new tab. Read it before you decide." : "This file has no preview in the dashboard."}
        </p>
      </div>
      {canOpen ? (
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center rounded-full border border-primary/30 bg-white px-5 text-sm font-medium text-primary hover:border-primary hover:bg-primary-light"
        >
          Open document →
        </a>
      ) : null}
    </div>
  );
}
