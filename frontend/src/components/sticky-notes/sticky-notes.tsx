import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { Button } from "@/components/ui/button";

import { api } from "../../../../backend/convex/_generated/api";
import type { Doc } from "../../../../backend/convex/_generated/dataModel";
import { StickyNoteCard } from "./sticky-note-card";
import { StickyNoteEditor } from "./sticky-note-editor";

type StickyNotesProps = {
  /** Allows the homepage to render a useful setup state without a Convex provider. */
  enabled: boolean;
};

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; note: Doc<"stickyNotes"> };

export function StickyNotes({ enabled }: StickyNotesProps) {
  if (!enabled) {
    return <StickyNotesUnavailable />;
  }

  return <ConnectedStickyNotes />;
}

function ConnectedStickyNotes() {
  const notes = useQuery(api.stickyNotes.list);
  const createNote = useMutation(api.stickyNotes.create);
  const updateNote = useMutation(api.stickyNotes.update);
  const removeNote = useMutation(api.stickyNotes.remove);
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setError(null);
    setEditor({ mode: "create" });
  };

  const openEdit = (note: Doc<"stickyNotes">) => {
    setError(null);
    setEditor({ mode: "edit", note });
  };

  const closeEditor = () => {
    if (isSaving) return;
    setError(null);
    setEditor({ mode: "closed" });
  };

  const saveNote = async ({ title, content }: { title: string; content: string }) => {
    setError(null);
    setIsSaving(true);

    try {
      if (editor.mode === "edit") {
        await updateNote({ id: editor.note._id, title, content });
      } else {
        await createNote({ title, content });
      }
      setEditor({ mode: "closed" });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this note");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (note: Doc<"stickyNotes">) => {
    if (!window.confirm(`Delete “${note.title}”?`)) return;

    try {
      await removeNote({ id: note._id });
      if (editor.mode === "edit" && editor.note._id === note._id) {
        setEditor({ mode: "closed" });
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this note");
    }
  };

  return (
    <section className="flex flex-col gap-6" aria-labelledby="sticky-notes-heading">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-display-xs" id="sticky-notes-heading">
          Notes
        </h2>
        {editor.mode === "closed" && (
          <Button size="sm" variant="ghost" onClick={openCreate}>
            <Plus />
            New note
          </Button>
        )}
      </header>

      {editor.mode !== "closed" && (
        <StickyNoteEditor
          error={error}
          isSaving={isSaving}
          note={editor.mode === "edit" ? editor.note : undefined}
          onCancel={closeEditor}
          onSave={saveNote}
        />
      )}

      {notes === undefined ? (
        <p className="font-hand text-base text-muted-foreground">Peeling notes off the wall…</p>
      ) : notes.length === 0 ? (
        <button
          className="-rotate-1 border border-dashed border-border/70 p-5 py-12 font-hand text-base text-muted-foreground transition-transform duration-200 ease-out-quart hover:rotate-0 hover:text-foreground"
          onClick={openCreate}
          type="button"
        >
          Nothing on the wall yet — stick something up
        </button>
      ) : (
        <div
          aria-label="Notes — swipe to see more"
          className="-mx-3 flex snap-x snap-mandatory gap-5 overflow-x-auto px-3 pt-3 pb-4 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pt-0 sm:pb-0 lg:grid-cols-3"
          role="region"
        >
          {notes.map((note) => (
            <div className="w-[88%] shrink-0 snap-start [&>article]:h-full sm:w-auto" key={note._id}>
              <StickyNoteCard note={note} onDelete={deleteNote} onEdit={openEdit} />
            </div>
          ))}
        </div>
      )}

      {error && editor.mode === "closed" && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function StickyNotesUnavailable() {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="sticky-notes-heading">
      <h2 className="font-display text-display-xs" id="sticky-notes-heading">
        Notes
      </h2>
      <p className="text-sm text-muted-foreground">
        Set <code className="numeric text-xs">VITE_CONVEX_URL</code> to start sticking notes up.
      </p>
    </section>
  );
}
