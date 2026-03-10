import express from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import * as db from "./db.js";
import { login, logout, checkAuth, requireAuth } from "./auth.js";
import {
  extractRecipeFromUrl,
  extractRecipeFromImage,
  extractRecipeFromMultipleImages,
  extractRecipeFromText,
  extractRecipeFromYouTube,
  isYouTubeUrl,
} from "./recipeImport.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Trust reverse proxy (Nginx, Cloudflare) so Express sees the correct protocol
app.set("trust proxy", 1);

// Uploads directory (persisted via Docker volume)
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "data", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const name = crypto.randomBytes(12).toString("hex") + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Multer for import (memory storage)
const importUpload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Serve uploaded images
app.use("/uploads", express.static(UPLOADS_DIR));

// ==================== AUTH ROUTES ====================
app.post("/api/auth/login", login);
app.post("/api/auth/logout", logout);
app.get("/api/auth/check", checkAuth);

// ==================== IMAGE UPLOAD ROUTE ====================
app.post("/api/upload", requireAuth, upload.single("image"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RECIPE ROUTES ====================
app.get("/api/recipes", requireAuth, (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const categoryIdsStr = req.query.categoryIds as string | undefined;
    const categoryIds = categoryIdsStr
      ? categoryIdsStr.split(",").map(Number).filter(Boolean)
      : undefined;

    const recipes = db.getRecipes(search, categoryIds);
    const recipeIds = recipes.map((r) => r.id);
    const categoriesMap = db.getRecipeCategoriesMap(recipeIds);
    const notesCountMap = db.getRecipeCookingNotesCount(recipeIds);

    const result = recipes.map((recipe) => ({
      ...recipe,
      categories: categoriesMap.get(recipe.id) || [],
      notesCount: notesCountMap.get(recipe.id) || 0,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/recipes/:id", requireAuth, (req, res) => {
  try {
    const recipe = db.getRecipeById(Number(req.params.id));
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    const categories = db.getRecipeCategories(recipe.id);
    const shareToken = db.getShareTokenForRecipe(recipe.id);
    res.json({ ...recipe, categories, shareToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/recipes", requireAuth, (req, res) => {
  try {
    const { categoryIds, ...recipeData } = req.body;
    const id = db.createRecipe(recipeData);

    if (categoryIds && categoryIds.length > 0) {
      db.setRecipeCategories(id, categoryIds);
    }

    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/recipes/:id", requireAuth, (req, res) => {
  try {
    const { categoryIds, ...updateData } = req.body;
    db.updateRecipe(Number(req.params.id), updateData);

    if (categoryIds !== undefined) {
      db.setRecipeCategories(Number(req.params.id), categoryIds);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/recipes/:id", requireAuth, (req, res) => {
  try {
    db.deleteRecipe(Number(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SHARE ROUTES ====================
app.post("/api/recipes/:id/share", requireAuth, (req, res) => {
  try {
    const recipeId = Number(req.params.id);
    const recipe = db.getRecipeById(recipeId);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    const token = db.createShareToken(recipeId);
    res.json({ token, url: `/shared/${token}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/recipes/:id/share", requireAuth, (req, res) => {
  try {
    db.deleteShareToken(Number(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public shared recipe endpoint (no auth required)
app.get("/api/shared/:token", (req, res) => {
  try {
    const recipe = db.getRecipeByShareToken(req.params.token);
    if (!recipe) return res.status(404).json({ error: "Shared recipe not found" });

    const categories = db.getRecipeCategories(recipe.id);
    const stats = db.getRecipeAverageRating(recipe.id);
    res.json({ ...recipe, categories, averageRating: stats.averageRating });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== IMPORT ROUTES ====================
app.post("/api/import/url", requireAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    let extracted;
    if (isYouTubeUrl(url)) {
      extracted = await extractRecipeFromYouTube(url);
    } else {
      extracted = await extractRecipeFromUrl(url);
    }
    res.json(extracted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/import/image", requireAuth, importUpload.array("images", 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: "At least one image is required" });

    let extracted;
    if (files.length === 1) {
      const base64 = files[0].buffer.toString("base64");
      const mimeType = files[0].mimetype;
      extracted = await extractRecipeFromImage(base64, mimeType);
    } else {
      const images = files.map((f) => ({
        base64: f.buffer.toString("base64"),
        mimeType: f.mimetype,
      }));
      extracted = await extractRecipeFromMultipleImages(images);
    }
    res.json(extracted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/import/text", requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const extracted = await extractRecipeFromText(text);
    res.json(extracted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/import/save", requireAuth, (req, res) => {
  try {
    const { suggestedCategories, ingredients, ...recipeData } = req.body;

    const id = db.createRecipe({
      ...recipeData,
      ingredients: JSON.stringify(ingredients),
    });

    if (suggestedCategories && suggestedCategories.length > 0) {
      const categoryIds: number[] = [];
      for (const catName of suggestedCategories) {
        const catId = db.createCategory(catName);
        categoryIds.push(catId);
      }
      db.setRecipeCategories(id, categoryIds);
    }

    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CATEGORY ROUTES ====================
app.get("/api/categories", requireAuth, (_req, res) => {
  try {
    res.json(db.getCategories());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/categories", requireAuth, (req, res) => {
  try {
    const id = db.createCategory(req.body.name);
    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/categories/:id", requireAuth, (req, res) => {
  try {
    db.deleteCategory(Number(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COOKING NOTES ROUTES ====================
app.get("/api/recipes/:recipeId/notes", requireAuth, (req, res) => {
  try {
    res.json(db.getCookingNotesByRecipe(Number(req.params.recipeId)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/recipes/:recipeId/notes/stats", requireAuth, (req, res) => {
  try {
    res.json(db.getRecipeAverageRating(Number(req.params.recipeId)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/recipes/:recipeId/notes", requireAuth, (req, res) => {
  try {
    const id = db.createCookingNote({
      recipeId: Number(req.params.recipeId),
      ...req.body,
    });
    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/notes/:id", requireAuth, (req, res) => {
  try {
    db.updateCookingNote(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/notes/:id", requireAuth, (req, res) => {
  try {
    db.deleteCookingNote(Number(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MEAL PLAN ROUTES ====================
app.get("/api/meal-plan", requireAuth, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    res.json(db.getMealPlan(startDate as string, endDate as string));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/meal-plan", requireAuth, (req, res) => {
  try {
    const { recipeId, date, mealType } = req.body;
    if (!recipeId || !date || !mealType) {
      return res.status(400).json({ error: "recipeId, date, and mealType are required" });
    }
    const id = db.addMealPlanEntry({ recipeId, date, mealType });
    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/meal-plan/:id", requireAuth, (req, res) => {
  try {
    db.removeMealPlanEntry(Number(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/meal-plan", requireAuth, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    db.clearMealPlanForWeek(startDate as string, endDate as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/shopping-list", requireAuth, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    const recipes = db.getShoppingListForDateRange(startDate as string, endDate as string);

    // Consolidate ingredients across all planned recipes
    const allIngredients: { ingredient: string; fromRecipe: string }[] = [];
    for (const recipe of recipes) {
      let ingredients: string[] = [];
      try {
        ingredients = JSON.parse(recipe.ingredients);
      } catch {
        ingredients = recipe.ingredients.split("\n").filter(Boolean);
      }
      for (const ing of ingredients) {
        if (!ing.startsWith("---")) {
          allIngredients.push({ ingredient: ing, fromRecipe: recipe.title });
        }
      }
    }

    res.json(allIngredients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STATIC FILES (PRODUCTION) ====================
if (process.env.NODE_ENV === "production") {
  const publicDir = path.join(__dirname, "public");
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Recipe Store running on http://0.0.0.0:${PORT}`);
});
