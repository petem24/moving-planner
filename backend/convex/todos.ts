import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./auth";

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2_000;

const priority = v.union(v.literal("low"), v.literal("medium"), v.literal("high"));
const status = v.union(v.literal("incomplete"), v.literal("complete"));

function cleanText(value: string, field: string, maxLength: number, required = true) {
  const cleaned = value.trim();

  if (required && !cleaned) {
    throw new Error(`${field} cannot be empty`);
  }

  if (cleaned.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer`);
  }

  return cleaned;
}

function cleanDueDate(value: string | undefined) {
  if (!value) return undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Due date must be a valid date");
  }

  return value;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    return await ctx.db
      .query("todos")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority,
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const now = Date.now();

    return await ctx.db.insert("todos", {
      title: cleanText(args.title, "Title", MAX_TITLE_LENGTH),
      description: cleanText(args.description ?? "", "Description", MAX_DESCRIPTION_LENGTH, false) || undefined,
      priority: args.priority,
      status: "incomplete",
      dueDate: cleanDueDate(args.dueDate),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("todos"),
    title: v.string(),
    description: v.optional(v.string()),
    priority,
    status,
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const todo = await ctx.db.get("todos", args.id);

    if (!todo) {
      throw new Error("Todo not found");
    }

    await ctx.db.patch(args.id, {
      title: cleanText(args.title, "Title", MAX_TITLE_LENGTH),
      description: cleanText(args.description ?? "", "Description", MAX_DESCRIPTION_LENGTH, false) || undefined,
      priority: args.priority,
      status: args.status,
      dueDate: cleanDueDate(args.dueDate),
      updatedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("todos"),
    status,
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const todo = await ctx.db.get("todos", args.id);

    if (!todo) {
      throw new Error("Todo not found");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await ctx.db.delete(args.id);
  },
});
