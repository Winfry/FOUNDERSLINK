import { ExternalLink, FileText } from "lucide-react";

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
      <div className="overflow-hidden rounded-btn border border-border bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt={fileName} className="max-h-[480px] w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-btn border border-border bg-surface p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-primary-light text-primary">
        <FileText className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{fileName}</p>
        <p className="text-xs font-semibold text-muted">
          {canOpen ? "Opens in a new tab. Read it before you decide." : "This file has no preview in the dashboard."}
        </p>
      </div>
      {canOpen ? (
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center gap-2 rounded-btn border border-border bg-white px-4 text-sm font-bold text-primary hover:border-primary hover:bg-primary-light"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Open document
        </a>
      ) : null}
    </div>
  );
}
