import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "recipes.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      imageUrl TEXT,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      prepTime INTEGER,
      cookTime INTEGER,
      servings INTEGER,
      sourceUrl TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipe_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      categoryId INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(recipeId, categoryId)
    );

    CREATE TABLE IF NOT EXISTS cooking_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      notes TEXT,
      modifications TEXT,
      cookedAt TEXT DEFAULT (datetime('now')),
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS share_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      recipeId INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      mealType TEXT NOT NULL CHECK(mealType IN ('breakfast', 'lunch', 'dinner', 'snack')),
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(date, mealType)
    );
  `);
}

// ==================== RECIPE QUERIES ====================

export function createRecipe(data: {
  title: string;
  description?: string;
  imageUrl?: string;
  ingredients: string;
  instructions: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  sourceUrl?: string;
}): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO recipes (title, description, imageUrl, ingredients, instructions, prepTime, cookTime, servings, sourceUrl)
    VALUES (@title, @description, @imageUrl, @ingredients, @instructions, @prepTime, @cookTime, @servings, @sourceUrl)
  `);
  const result = stmt.run({
    title: data.title,
    description: data.description || null,
    imageUrl: data.imageUrl || null,
    ingredients: data.ingredients,
    instructions: data.instructions,
    prepTime: data.prepTime || null,
    cookTime: data.cookTime || null,
    servings: data.servings || null,
    sourceUrl: data.sourceUrl || null,
  });
  return Number(result.lastInsertRowid);
}

export function getRecipeById(id: number) {
  const db = getDb();
  return db.prepare("SELECT * FROM recipes WHERE id = ?").get(id) as any | undefined;
}

export function getRecipes(search?: string, categoryIds?: number[]) {
  const db = getDb();
  let sql = "SELECT * FROM recipes";
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push("(title LIKE ? OR ingredients LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (categoryIds && categoryIds.length > 0) {
    const placeholders = categoryIds.map(() => "?").join(",");
    conditions.push(`id IN (SELECT recipeId FROM recipe_categories WHERE categoryId IN (${placeholders}))`);
    params.push(...categoryIds);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY createdAt DESC";
  return db.prepare(sql).all(...params) as any[];
}

export function updateRecipe(id: number, data: Partial<{
  title: string;
  description: string;
  imageUrl: string;
  ingredients: string;
  instructions: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  sourceUrl: string;
}>) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return;

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE recipes SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteRecipe(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
}

// ==================== CATEGORY QUERIES ====================

export function createCategory(name: string): number {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM categories WHERE name = ? COLLATE NOCASE").get(name) as any;
  if (existing) return existing.id;
  const result = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
  return Number(result.lastInsertRowid);
}

export function getCategories() {
  const db = getDb();
  return db.prepare("SELECT * FROM categories ORDER BY name").all() as any[];
}

export function deleteCategory(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM recipe_categories WHERE categoryId = ?").run(id);
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
}

// ==================== RECIPE-CATEGORY QUERIES ====================

export function setRecipeCategories(recipeId: number, categoryIds: number[]) {
  const db = getDb();
  db.prepare("DELETE FROM recipe_categories WHERE recipeId = ?").run(recipeId);
  const stmt = db.prepare("INSERT OR IGNORE INTO recipe_categories (recipeId, categoryId) VALUES (?, ?)");
  for (const catId of categoryIds) {
    stmt.run(recipeId, catId);
  }
}

export function getRecipeCategories(recipeId: number) {
  const db = getDb();
  return db.prepare(`
    SELECT c.id, c.name FROM categories c
    INNER JOIN recipe_categories rc ON rc.categoryId = c.id
    WHERE rc.recipeId = ?
  `).all(recipeId) as { id: number; name: string }[];
}

export function getRecipeCategoriesMap(recipeIds: number[]) {
  if (recipeIds.length === 0) return new Map<number, { id: number; name: string }[]>();
  const db = getDb();
  const placeholders = recipeIds.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT rc.recipeId, c.id, c.name FROM recipe_categories rc
    INNER JOIN categories c ON rc.categoryId = c.id
    WHERE rc.recipeId IN (${placeholders})
  `).all(...recipeIds) as { recipeId: number; id: number; name: string }[];

  const map = new Map<number, { id: number; name: string }[]>();
  for (const row of rows) {
    if (!map.has(row.recipeId)) map.set(row.recipeId, []);
    map.get(row.recipeId)!.push({ id: row.id, name: row.name });
  }
  return map;
}

// ==================== COOKING NOTES QUERIES ====================

export function createCookingNote(data: {
  recipeId: number;
  rating?: number;
  notes?: string;
  modifications?: string;
  cookedAt?: string;
}): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO cooking_notes (recipeId, rating, notes, modifications, cookedAt)
    VALUES (@recipeId, @rating, @notes, @modifications, @cookedAt)
  `).run({
    recipeId: data.recipeId,
    rating: data.rating || null,
    notes: data.notes || null,
    modifications: data.modifications || null,
    cookedAt: data.cookedAt || new Date().toISOString(),
  });
  return Number(result.lastInsertRowid);
}

export function getCookingNotesByRecipe(recipeId: number) {
  const db = getDb();
  return db.prepare("SELECT * FROM cooking_notes WHERE recipeId = ? ORDER BY cookedAt DESC").all(recipeId) as any[];
}

export function updateCookingNote(id: number, data: Partial<{
  rating: number;
  notes: string;
  modifications: string;
  cookedAt: string;
}>) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return;
  fields.push("updatedAt = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE cooking_notes SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteCookingNote(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM cooking_notes WHERE id = ?").run(id);
}

export function getRecipeCookingNotesCount(recipeIds: number[]) {
  if (recipeIds.length === 0) return new Map<number, number>();
  const db = getDb();
  const placeholders = recipeIds.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT recipeId, COUNT(*) as count FROM cooking_notes
    WHERE recipeId IN (${placeholders})
    GROUP BY recipeId
  `).all(...recipeIds) as { recipeId: number; count: number }[];

  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(row.recipeId, row.count);
  }
  return map;
}

export function getRecipeAverageRating(recipeId: number) {
  const db = getDb();
  const result = db.prepare(`
    SELECT AVG(rating) as avg, COUNT(*) as count FROM cooking_notes
    WHERE recipeId = ? AND rating IS NOT NULL
  `).get(recipeId) as { avg: number | null; count: number };

  return {
    averageRating: result.avg ? Math.round(result.avg * 10) / 10 : null,
    totalNotes: result.count,
  };
}

// ==================== SHARE TOKEN QUERIES ====================

export function createShareToken(recipeId: number): string {
  const db = getDb();
  // Check if token already exists for this recipe
  const existing = db.prepare("SELECT token FROM share_tokens WHERE recipeId = ?").get(recipeId) as any;
  if (existing) return existing.token;

  const token = crypto.randomBytes(16).toString("hex");
  db.prepare("INSERT INTO share_tokens (token, recipeId) VALUES (?, ?)").run(token, recipeId);
  return token;
}

export function getRecipeByShareToken(token: string) {
  const db = getDb();
  const row = db.prepare(`
    SELECT r.* FROM recipes r
    INNER JOIN share_tokens st ON st.recipeId = r.id
    WHERE st.token = ?
  `).get(token) as any | undefined;
  return row;
}

export function getShareTokenForRecipe(recipeId: number): string | null {
  const db = getDb();
  const row = db.prepare("SELECT token FROM share_tokens WHERE recipeId = ?").get(recipeId) as any;
  return row?.token || null;
}

export function deleteShareToken(recipeId: number) {
  const db = getDb();
  db.prepare("DELETE FROM share_tokens WHERE recipeId = ?").run(recipeId);
}

// ==================== MEAL PLAN QUERIES ====================

export function getMealPlan(startDate: string, endDate: string) {
  const db = getDb();
  return db.prepare(`
    SELECT mp.*, r.title as recipeTitle, r.imageUrl as recipeImageUrl,
           r.prepTime, r.cookTime, r.servings
    FROM meal_plan mp
    INNER JOIN recipes r ON mp.recipeId = r.id
    WHERE mp.date >= ? AND mp.date <= ?
    ORDER BY mp.date, mp.mealType
  `).all(startDate, endDate) as any[];
}

export function addMealPlanEntry(data: {
  recipeId: number;
  date: string;
  mealType: string;
}): number {
  const db = getDb();
  // Remove existing entry for same date+mealType
  db.prepare("DELETE FROM meal_plan WHERE date = ? AND mealType = ?").run(data.date, data.mealType);
  const result = db.prepare(`
    INSERT INTO meal_plan (recipeId, date, mealType)
    VALUES (@recipeId, @date, @mealType)
  `).run(data);
  return Number(result.lastInsertRowid);
}

export function removeMealPlanEntry(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM meal_plan WHERE id = ?").run(id);
}

export function clearMealPlanForWeek(startDate: string, endDate: string) {
  const db = getDb();
  db.prepare("DELETE FROM meal_plan WHERE date >= ? AND date <= ?").run(startDate, endDate);
}

export function getShoppingListForDateRange(startDate: string, endDate: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT r.ingredients, r.servings, r.title
    FROM meal_plan mp
    INNER JOIN recipes r ON mp.recipeId = r.id
    WHERE mp.date >= ? AND mp.date <= ?
  `).all(startDate, endDate) as { ingredients: string; servings: number | null; title: string }[];
  return rows;
}
