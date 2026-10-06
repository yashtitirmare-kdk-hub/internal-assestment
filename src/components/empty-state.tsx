import { Inbox } from "lucide-react";

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
      <Inbox className="size-8 opacity-50" />
      {text}
    </div>
  );
}
