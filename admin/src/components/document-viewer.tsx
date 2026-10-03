import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DocumentViewerProps {
  title?: string;
  fileName?: string;
}

export function DocumentViewer({
  title = "Document preview",
  fileName = "document.pdf",
}: DocumentViewerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-card border border-dashed border-border bg-slate-50 p-8 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted" aria-hidden />
          <p className="text-sm font-medium text-foreground">{fileName}</p>
          <p className="mt-2 max-w-xs text-xs text-muted">
            Preview placeholder — connect storage/CDN in production to render PDFs and images.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
