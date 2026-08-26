import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  Ref,
  TouchEventHandler,
} from "react";

import type { Doc } from "../../../../backend/convex/_generated/dataModel";
import { paperFor, paperStyle } from "./paper";

type StickyNoteCardProps = {
  note: Doc<"stickyNotes">;
  isDragging?: boolean;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement> & {
    ref?: Ref<HTMLButtonElement>;
  };
  onTouchStart?: TouchEventHandler<HTMLElement>;
  showDragHandle?: boolean;
  onEdit: (note: Doc<"stickyNotes">) => void;
  onDelete: (note: Doc<"stickyNotes">) => void;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/** Buttons that live on paper: ink-coloured, not theme-coloured. */
const paperButton =
  "grid size-7 place-items-center rounded-full text-current/60 transition-colors hover:bg-black/8 hover:text-current focus-visible:bg-black/8 focus-visible:outline-none [&_svg]:size-3.5";

export function StickyNoteCard({
  note,
  isDragging = false,
  dragHandleProps,
  onTouchStart,
  showDragHandle = true,
  onEdit,
  onDelete,
}: StickyNoteCardProps) {
  const { stock, tilt } = paperFor(note._id, note.color);

  return (
    <article
      className={`group relative flex h-full min-h-44 rotate-(--tilt) flex-col p-5 pt-8 shadow-lg transition-[box-shadow,transform] duration-200 ease-out-quart hover:rotate-0 hover:scale-[1.015] ${isDragging ? "rotate-0 scale-[1.025] shadow-xl" : ""}`}
      onTouchStart={onTouchStart}
      style={paperStyle(stock, tilt)}
    >
      <Tape />

      {showDragHandle && (
        <button
          {...dragHandleProps}
          aria-label={`Drag ${note.title} to reorder`}
          className="absolute top-2 left-2 z-10 hidden size-6 touch-none cursor-grab place-items-center rounded-md text-current/35 transition-colors hover:bg-black/6 hover:text-current/70 active:cursor-grabbing sm:grid"
          data-drag-handle
          type="button"
        >
          <GripVertical className="size-3.5" strokeWidth={1.8} />
        </button>
      )}

      <h3 className="font-hand text-lg font-semibold leading-snug" style={{ color: stock.ink }}>
        {note.title}
      </h3>

      <p className="mt-2 flex-1 font-hand text-[0.9375rem] leading-relaxed whitespace-pre-wrap break-words">
        {note.content}
      </p>

      <footer className="mt-4 flex items-end justify-between gap-2">
        <span className="numeric text-[0.7rem] text-current/50">
          {dateFormat.format(note.updatedAt)}
        </span>

        {/* Out of the way until you reach for the note. */}
        <div className="flex gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <button
            aria-label={`Edit ${note.title}`}
            className={paperButton}
            type="button"
            onClick={() => onEdit(note)}
          >
            <Pencil />
          </button>
          <button
            aria-label={`Delete ${note.title}`}
            className={paperButton}
            type="button"
            onClick={() => onDelete(note)}
          >
            <Trash2 />
          </button>
        </div>
      </footer>
    </article>
  );
}

/** A strip of masking tape holding the note to the wall. */
export function Tape() {
  return (
    <span
      aria-hidden
      className="absolute -top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 -rotate-2 bg-[oklch(0.97_0.02_95_/_0.45)] shadow-xs ring-1 ring-black/5"
    />
  );
}
