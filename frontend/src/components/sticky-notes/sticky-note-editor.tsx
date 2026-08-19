import { useEffect, useState, type FormEvent } from "react";
import { Dialog } from "radix-ui";

import type { Doc } from "../../../../backend/convex/_generated/dataModel";
import { paperFor, paperStyle } from "./paper";
import { Tape } from "./sticky-note-card";

type StickyNoteEditorProps = {
  note?: Doc<"stickyNotes">;
  isSaving: boolean;
  error: string | null;
  onSave: (values: { title: string; content: string }) => Promise<void>;
  onCancel: () => void;
};

/** A blank note off the top of the pad — same paper as the one you're editing. */
const blankStock = paperFor("blank");

export function StickyNoteEditor({
  note,
  isSaving,
  error,
  onSave,
  onCancel,
}: StickyNoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const { stock } = note ? paperFor(note._id) : blankStock;

  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
  }, [note]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave({ title, content });
  };

  const pen = "w-full bg-transparent font-hand outline-none placeholder:text-current/40";

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          onEscapeKeyDown={(event) => isSaving && event.preventDefault()}
          onInteractOutside={(event) => isSaving && event.preventDefault()}
        >
          <Dialog.Title className="sr-only">{note ? `Edit ${note.title}` : "Create a note"}</Dialog.Title>

          <form className="relative p-5 pt-8 shadow-2xl" style={paperStyle(stock)} onSubmit={handleSubmit}>
            <Tape />

            <label className="sr-only" htmlFor="sticky-note-title">
              Title
            </label>
            <input
              autoFocus
              className={`${pen} text-lg font-semibold leading-snug`}
              style={{ color: stock.ink }}
              id="sticky-note-title"
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Erin's flight"
              required
              value={title}
            />

            <label className="sr-only" htmlFor="sticky-note-content">
              Details
            </label>
            <textarea
              className={`${pen} mt-2 min-h-36 resize-y text-[0.9375rem] leading-relaxed`}
              id="sticky-note-content"
              maxLength={2_000}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Booking ref, flight number, the thing you'll forget…"
              required
              value={content}
            />

            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

            <div className="mt-3 flex items-center justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  className="text-sm text-current/60 transition-colors hover:text-current disabled:opacity-50"
                  disabled={isSaving}
                  type="button"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                className="rounded-full bg-black/80 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Sticking…" : note ? "Save" : "Stick it up"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
