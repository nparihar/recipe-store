import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

function getModel() {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured. Set it in your environment variables.");
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

const RECIPE_EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract the recipe from the provided content and return a JSON object with these exact fields:

{
  "title": "Recipe title",
  "description": "Brief description (1-2 sentences)",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": "Step by step instructions as a single text block. Use numbered steps. Separate sections with bold headers using **Section Name**.",
  "prepTime": number or null (in minutes),
  "cookTime": number or null (in minutes),
  "servings": number or null,
  "suggestedCategories": ["Category1", "Category2"] (e.g. Meat, Vegetarian, Seafood, Air Fryer, Instant Pot, Quick Meals, Indian, Italian, Asian, etc.)
}

Rules:
- Use imperial measurements (lbs, oz, cups, tbsp, tsp) by default
- If the recipe has sections (e.g. marinade, sauce), prefix ingredient groups with "--- Section Name ---"
- Keep instructions clear and concise
- Return ONLY valid JSON, no markdown code blocks or other text`;

export async function extractRecipeFromUrl(url: string) {
  const model = getModel();

  // Fetch the page content
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RecipeBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();

  // Strip HTML tags for a cleaner text extraction
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000); // Limit to avoid token limits

  const result = await model.generateContent([
    RECIPE_EXTRACTION_PROMPT,
    `Source URL: ${url}\n\nPage content:\n${textContent}`,
  ]);

  const text = result.response.text();
  return parseRecipeJson(text, url);
}

export async function extractRecipeFromImage(imageBase64: string, mimeType: string) {
  const model = getModel();

  const result = await model.generateContent([
    RECIPE_EXTRACTION_PROMPT,
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    },
  ]);

  const text = result.response.text();
  return parseRecipeJson(text);
}

export async function extractRecipeFromText(recipeText: string) {
  const model = getModel();

  const result = await model.generateContent([
    RECIPE_EXTRACTION_PROMPT,
    `Recipe text:\n${recipeText}`,
  ]);

  const text = result.response.text();
  return parseRecipeJson(text);
}

export async function extractRecipeFromYouTube(url: string) {
  const model = getModel();

  // For YouTube, we pass the URL and ask Gemini to work with what it knows
  const result = await model.generateContent([
    RECIPE_EXTRACTION_PROMPT,
    `This is a YouTube recipe video URL: ${url}\n\nPlease extract the recipe based on the video title and any information you can determine about this recipe. If you cannot determine the exact recipe, provide your best interpretation based on the video URL and title.`,
  ]);

  const text = result.response.text();
  return parseRecipeJson(text, url);
}

function parseRecipeJson(text: string, sourceUrl?: string) {
  // Clean up the response - remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const recipe = JSON.parse(cleaned);
    return {
      title: recipe.title || "Untitled Recipe",
      description: recipe.description || "",
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: recipe.instructions || "",
      prepTime: recipe.prepTime || null,
      cookTime: recipe.cookTime || null,
      servings: recipe.servings || null,
      sourceUrl: sourceUrl || null,
      suggestedCategories: Array.isArray(recipe.suggestedCategories) ? recipe.suggestedCategories : [],
    };
  } catch (e) {
    throw new Error("Failed to parse recipe from AI response. Please try again or use manual entry.");
  }
}

export function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}
