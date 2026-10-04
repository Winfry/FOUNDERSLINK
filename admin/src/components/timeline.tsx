import type { TimelineEvent } from "@/types";
import { formatDayTime } from "@/components/labels";

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">Nothing has happened on this account yet. Decisions and status changes will be listed here.</p>;
  }
  return (
    <ol className="relative ml-1.5 border-l border-border pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative mb-5 last:mb-0">
          <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-primary" />
          <p className="text-sm font-semibold text-foreground">{event.title}</p>
          {event.description ? <p className="text-sm text-muted">{event.description}</p> : null}
          <p className="mt-0.5 text-xs font-semibold text-muted">
            {formatDayTime(event.at)}
            {event.actor ? ` · ${event.actor}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
