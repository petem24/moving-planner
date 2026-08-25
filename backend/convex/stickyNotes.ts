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

    return await ctx.db
      .query("stickyNotes")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();
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

    return await ctx.db.insert("stickyNotes", {
      title: cleanText(args.title, "Title", MAX_TITLE_LENGTH),
      content: cleanText(args.content, "Note", MAX_CONTENT_LENGTH),
      color: args.color,
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

export const remove = mutation({
  args: {
    id: v.id("stickyNotes"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await ctx.db.delete(args.id);
  },
});
