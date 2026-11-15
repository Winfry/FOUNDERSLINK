import type { TimelineEvent } from "@/types";
import { formatDayTime } from "@/components/labels";

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">Nothing has happened on this account yet. Decisions and status changes will be listed here.</p>;
  }
  return (
    <ol className="divide-y divide-border">
      {events.map((event) => (
        <li key={event.id} className="py-3 first:pt-0 last:pb-0">
          <p className="text-sm font-medium text-navy">{event.title}</p>
          {event.description ? <p className="mt-0.5 text-sm text-muted">{event.description}</p> : null}
          <p className="mt-1 text-xs text-[#9A93A5]">
            {formatDayTime(event.at)}
            {event.actor ? ` · ${event.actor}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
