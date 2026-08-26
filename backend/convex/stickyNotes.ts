import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./auth";

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 2_000;

const noteColor = v.union(
  v.literal("butter"),
  v.literal("mint"),
  v.literal("sky"),
  v.literal("blush"),
  v.literal("lavender"),
);

function cleanText(value: string, field: string, maxLength: number) {
  const cleaned = value.trim();

  if (!cleaned) {
    throw new Error(`${field} cannot be empty`);
  }

  if (cleaned.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer`);
  }

  return cleaned;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const notes = await ctx.db
      .query("stickyNotes")
      .collect();

    // Existing notes do not have a sortOrder yet. Their negative updatedAt
    // value preserves the previous newest-first order until they are moved.
    return notes.sort(
      (left, right) =>
        (left.sortOrder ?? -left.updatedAt) - (right.sortOrder ?? -right.updatedAt),
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    color: noteColor,
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const now = Date.now();
    const notes = await ctx.db.query("stickyNotes").collect();
    const nextSortOrder =
      notes.reduce(
        (minimum, note) => Math.min(minimum, note.sortOrder ?? -note.updatedAt),
        0,
      ) - 1;

    return await ctx.db.insert("stickyNotes", {
      title: cleanText(args.title, "Title", MAX_TITLE_LENGTH),
      content: cleanText(args.content, "Note", MAX_CONTENT_LENGTH),
      color: args.color,
      sortOrder: nextSortOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("stickyNotes"),
    title: v.string(),
    content: v.string(),
    color: noteColor,
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const note = await ctx.db.get("stickyNotes", args.id);

    if (!note) {
      throw new Error("Sticky note not found");
    }

    await ctx.db.patch(args.id, {
      title: cleanText(args.title, "Title", MAX_TITLE_LENGTH),
      content: cleanText(args.content, "Note", MAX_CONTENT_LENGTH),
      color: args.color,
      updatedAt: Date.now(),
    });
  },
});

export const reorder = mutation({
  args: {
    ids: v.array(v.id("stickyNotes")),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const notes = await ctx.db.query("stickyNotes").collect();
    const noteIds = new Set(notes.map((note) => note._id));
    const requestedIds = new Set(args.ids);

    if (
      requestedIds.size !== args.ids.length ||
      requestedIds.size !== notes.length ||
      args.ids.some((id) => !noteIds.has(id))
    ) {
      throw new Error("Unable to reorder sticky notes");
    }

    await Promise.all(
      args.ids.map((id, index) => ctx.db.patch(id, { sortOrder: index })),
    );
  },
});

export const remove = mutation({
  args: {
    id: v.id("stickyNotes"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await ctx.db.delete(args.id);
  },
});
