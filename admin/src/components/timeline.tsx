import type { TimelineEvent } from "@/types";
import { formatDate } from "@/lib/utils";

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">No activity yet.</p>;
  }
  return (
    <ol className="relative border-l border-border pl-6">
      {events.map((event) => (
        <li key={event.id} className="mb-6 last:mb-0">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-primary" />
          <p className="text-sm font-medium text-foreground">{event.title}</p>
          {event.description ? (
            <p className="text-sm text-muted">{event.description}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted">
            {formatDate(event.at)}
            {event.actor ? ` · ${event.actor}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
