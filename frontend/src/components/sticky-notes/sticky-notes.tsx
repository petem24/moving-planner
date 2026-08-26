import {
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type TouchEventHandler,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { Button } from "@/components/ui/button";

import { api } from "../../../../backend/convex/_generated/api";
import type { Doc } from "../../../../backend/convex/_generated/dataModel";
import type { PaperColor } from "./paper";
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

type StickyNote = Doc<"stickyNotes">;
type StickyNoteId = StickyNote["_id"];

export function StickyNotes({ enabled }: StickyNotesProps) {
  if (!enabled) return <StickyNotesUnavailable />;
  return <ConnectedStickyNotes />;
}

function ConnectedStickyNotes() {
  const notes = useQuery(api.stickyNotes.list);
  const createNote = useMutation(api.stickyNotes.create);
  const updateNote = useMutation(api.stickyNotes.update);
  const removeNote = useMutation(api.stickyNotes.remove);
  const reorderNotes = useMutation(api.stickyNotes.reorder);
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<StickyNoteId | null>(null);
  const [optimisticOrder, setOptimisticOrder] = useState<StickyNoteId[] | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 450, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const orderedNotes = useMemo(() => {
    if (!notes || !optimisticOrder) return notes;

    const notesById = new Map(notes.map((note) => [note._id, note]));
    const reordered = optimisticOrder.map((id) => notesById.get(id));

    return reordered.every((note): note is StickyNote => note !== undefined) &&
      reordered.length === notes.length
      ? reordered
      : notes;
  }, [notes, optimisticOrder]);

  const activeNote = useMemo(
    () => orderedNotes?.find((note) => note._id === activeId),
    [activeId, orderedNotes],
  );

  // Keep the local order visible while Convex applies the mutation, then hand
  // control back to the matching server response.
  useEffect(() => {
    if (!notes || !optimisticOrder) return;

    const serverIds = notes.map((note) => note._id);
    const sameNotes =
      serverIds.length === optimisticOrder.length &&
      optimisticOrder.every((id) => serverIds.includes(id));

    if (!sameNotes || serverIds.every((id, index) => id === optimisticOrder[index])) {
      setOptimisticOrder(null);
    }
  }, [notes, optimisticOrder]);

  const openCreate = () => {
    setError(null);
    setEditor({ mode: "create" });
  };

  const openEdit = (note: StickyNote) => {
    setError(null);
    setEditor({ mode: "edit", note });
  };

  const closeEditor = () => {
    if (isSaving) return;
    setError(null);
    setEditor({ mode: "closed" });
  };

  const saveNote = async ({
    title,
    content,
    color,
  }: {
    title: string;
    content: string;
    color: PaperColor;
  }) => {
    setError(null);
    setIsSaving(true);

    try {
      if (editor.mode === "edit") {
        await updateNote({ id: editor.note._id, title, content, color });
      } else {
        await createNote({ title, content, color });
      }
      setEditor({ mode: "closed" });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this note");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (note: StickyNote) => {
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

  const persistOrder = async (nextOrder: StickyNoteId[]) => {
    setError(null);

    try {
      await reorderNotes({ ids: nextOrder });
    } catch (reorderError) {
      setOptimisticOrder(null);
      setError(
        reorderError instanceof Error ? reorderError.message : "Unable to reorder sticky notes",
      );
    }
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as StickyNoteId);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!orderedNotes || !over || active.id === over.id) return;

    const previousIndex = orderedNotes.findIndex((note) => note._id === active.id);
    const nextIndex = orderedNotes.findIndex((note) => note._id === over.id);
    if (previousIndex < 0 || nextIndex < 0) return;

    const nextNotes = arrayMove(orderedNotes, previousIndex, nextIndex);
    const nextOrder = nextNotes.map((note) => note._id);
    setOptimisticOrder(nextOrder);
    void persistOrder(nextOrder);
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
        <DndContext
          collisionDetection={closestCenter}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <SortableContext
            items={orderedNotes?.map((note) => note._id) ?? []}
            strategy={rectSortingStrategy}
          >
            <div
              aria-label="Notes"
              className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2"
              role="region"
            >
              {orderedNotes?.map((note) => (
                <SortableStickyNote
                  key={note._id}
                  note={note}
                  onDelete={deleteNote}
                  onEdit={openEdit}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay
            adjustScale={false}
            dropAnimation={{
              duration: 180,
              easing: "cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {activeNote ? (
              <div aria-hidden className="pointer-events-none h-full w-full">
                <StickyNoteCard
                  isDragging
                  note={activeNote}
                  onDelete={deleteNote}
                  onEdit={openEdit}
                  showDragHandle={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {error && editor.mode === "closed" && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function SortableStickyNote({
  note,
  onEdit,
  onDelete,
}: {
  note: StickyNote;
  onEdit: (note: StickyNote) => void;
  onDelete: (note: StickyNote) => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: note._id,
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style: CSSProperties = {
    opacity: isDragging ? 0.24 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: isDragging ? "transform" : undefined,
  };

  const handleListeners = listeners as ButtonHTMLAttributes<HTMLButtonElement> | undefined;
  const touchListener = listeners?.onTouchStart as TouchEventHandler<HTMLElement> | undefined;
  const handleTouchStart: TouchEventHandler<HTMLElement> = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("button, a, input, textarea, select")) return;
    touchListener?.(event);
  };

  return (
    <div className="min-w-0" ref={setNodeRef} style={style}>
      <StickyNoteCard
        dragHandleProps={{
          ...attributes,
          ...handleListeners,
          ref: setActivatorNodeRef,
        }}
        isDragging={isDragging}
        note={note}
        onDelete={onDelete}
        onEdit={onEdit}
        onTouchStart={handleTouchStart}
      />
    </div>
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
