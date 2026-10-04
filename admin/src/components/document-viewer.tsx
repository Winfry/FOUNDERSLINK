import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DocumentViewerProps {
  title?: string;
  fileName?: string;
  mimeType?: string;
  previewUrl?: string;
}

export function DocumentViewer({
  title = "Document preview",
  fileName = "document.pdf",
  mimeType,
  previewUrl,
}: DocumentViewerProps) {
  const isImage = mimeType?.startsWith("image/") ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isImage && previewUrl ? (
          <div className="overflow-hidden rounded-md border border-border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={fileName} className="max-h-[480px] w-full object-contain" />
          </div>
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-md border border-dashed border-border bg-[#EAF1FE] p-8 text-center">
            <FileText className="mb-3 h-10 w-10 text-[#0454DB]" aria-hidden />
            <p className="text-sm font-medium text-foreground">{fileName}</p>
            {previewUrl?.startsWith("/api/") ? (
              <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-2 text-sm font-medium text-[#0454DB] hover:underline">
                Open document
              </a>
            ) : (
              <p className="mt-2 max-w-xs text-xs text-muted">
                PDF preview placeholder{previewUrl ? ` — ${previewUrl}` : ""}.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
