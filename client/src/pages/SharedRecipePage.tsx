import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Clock, Users, ChefHat, Star, ExternalLink } from "lucide-react";

export default function SharedRecipePage({ token }: { token: string }) {
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.share
      .getPublic(token)
      .then(setRecipe)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h1 className="text-xl font-semibold mb-2">Recipe Not Found</h1>
          <p className="text-muted-foreground">This shared recipe link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  let ingredientList: string[] = [];
  try {
    ingredientList = JSON.parse(recipe.ingredients);
  } catch {
    ingredientList = recipe.ingredients.split("\n").filter(Boolean);
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <span className="text-lg font-bold flex items-center gap-2">
            🍳 Recipe Store
            <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 bg-accent rounded-full">
              Shared Recipe
            </span>
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-card rounded-xl overflow-hidden shadow-sm border border-border">
          {/* Hero Image */}
          <div className="aspect-video relative bg-muted">
            {recipe.imageUrl ? (
              <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ChefHat className="w-24 h-24 text-muted-foreground opacity-30" />
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">
            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{recipe.title}</h1>
            {recipe.description && (
              <p className="text-muted-foreground mb-4">{recipe.description}</p>
            )}

            {/* Rating */}
            {recipe.averageRating && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(recipe.averageRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{recipe.averageRating} rating</span>
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              {recipe.prepTime > 0 && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4" /> Prep: {recipe.prepTime} min
                </span>
              )}
              {recipe.cookTime > 0 && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4" /> Cook: {recipe.cookTime} min
                </span>
              )}
              {totalTime > 0 && (
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4" /> Total: {totalTime} min
                </span>
              )}
              {recipe.servings > 0 && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4" /> {recipe.servings} servings
                </span>
              )}
            </div>

            {/* Categories */}
            {recipe.categories?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {recipe.categories.map((cat: any) => (
                  <span key={cat.id} className="px-2.5 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full">
                    {cat.name}
                  </span>
                ))}
              </div>
            )}

            <hr className="my-6 border-border" />

            {/* Ingredients */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
              <ul className="space-y-2">
                {ingredientList.map((item, i) =>
                  item.startsWith("---") ? (
                    <li key={i} className="font-medium text-muted-foreground pt-3 first:pt-0">
                      {item.replace(/---/g, "").trim()}
                    </li>
                  ) : (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  )
                )}
              </ul>
            </div>

            <hr className="my-6 border-border" />

            {/* Instructions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Instructions</h2>
              <div className="space-y-3">
                {recipe.instructions.split("\n").map((p: string, i: number) =>
                  p.trim() ? (
                    <p key={i}>
                      {p.startsWith("**") ? <strong>{p.replace(/\*\*/g, "")}</strong> : p}
                    </p>
                  ) : null
                )}
              </div>
            </div>

            {/* Source */}
            {recipe.sourceUrl && (
              <>
                <hr className="my-6 border-border" />
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" /> View original recipe
                </a>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          Shared from Recipe Store
        </div>
      </main>
    </div>
  );
}
