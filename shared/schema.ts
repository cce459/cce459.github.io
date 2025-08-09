import { pgTable, serial, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 위키 페이지 테이블
export const pages = pgTable('pages', {
  id: serial('id').primaryKey(),
  title: text('title').notNull().unique(),
  content: text('content').notNull(),
  lastModified: timestamp('last_modified').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata').$type<{
    tags?: string[];
    categories?: string[];
    lastModifiedBy?: string;
  }>().default({}),
});

// 댓글 테이블
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').references(() => pages.id, { onDelete: 'cascade' }).notNull(),
  author: text('author').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 이미지 테이블
export const images = pgTable('images', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  data: text('data').notNull(), // Base64 encoded image data
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// Relations
export const pagesRelations = relations(pages, ({ many }) => ({
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  page: one(pages, {
    fields: [comments.pageId],
    references: [pages.id],
  }),
}));

// TypeScript types
export type Page = typeof pages.$inferSelect;
export type InsertPage = typeof pages.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;
export type Image = typeof images.$inferSelect;
export type InsertImage = typeof images.$inferInsert;