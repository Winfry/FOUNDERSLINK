import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth/config";
import { parseSession } from "@/lib/auth/types";

// Passes a deal document from the backend to the signed-in admin. The
// backend only gives files to an admin's session, which lives in a
// cookie the browser cannot read, so the dashboard fetches it for her.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = parseSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session?.token) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const file = await fetch(`${API_URL}/admin/deal-documents/${encodeURIComponent(params.id)}/file`, {
    headers: { authorization: `Bearer ${session.token}` },
    cache: "no-store",
  });
  if (!file.ok) return NextResponse.json({ error: "This file is not available" }, { status: file.status });

  return new NextResponse(file.body, {
    headers: {
      "content-type": file.headers.get("content-type") ?? "application/octet-stream",
      // Shown in the browser's own viewer, and never guessed to be anything else.
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
    },
  });
}
