import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Search, Clock, Users, ChefHat, CheckCircle2, Sparkles, PenLine } from "lucide-react";

type Recipe = {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  ingredients: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  categories: { id: number; name: string }[];
  notesCount: number;
};

type Category = { id: number; name: string };

export default function HomePage({
  onViewRecipe,
  onImport,
}: {
  onViewRecipe: (id: number) => void;
  onImport: () => void;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const catIds = selectedCategory !== "all" ? [parseInt(selectedCategory)] : undefined;
      const data = await api.recipes.list(search || undefined, catIds);
      setRecipes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.categories.list().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchRecipes, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Recipes</h1>
          <p className="text-muted-foreground">{recipes.length} recipes in your collection</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            Import Recipe
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search recipes by title or ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-[180px]"
        >
          <option value="all">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id.toString()}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Recipe Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : recipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => onViewRecipe(recipe.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <ChefHat className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No recipes yet</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            {search || selectedCategory !== "all"
              ? "No recipes match your search. Try adjusting your filters."
              : "Start building your recipe collection by importing your first recipe."}
          </p>
          {!search && selectedCategory === "all" && (
            <button
              onClick={onImport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              Import Recipe
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  let ingredientList: string[] = [];
  try {
    ingredientList = JSON.parse(recipe.ingredients);
  } catch {
    ingredientList = recipe.ingredients.split("\n").filter(Boolean);
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200 group"
    >
      <div className="aspect-video relative overflow-hidden bg-muted">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-16 h-16 text-muted-foreground opacity-40" />
          </div>
        )}
        {recipe.notesCount > 0 && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-full shadow-md">
              <CheckCircle2 className="w-3 h-3" />
              Tried it{recipe.notesCount > 1 ? ` (${recipe.notesCount}x)` : ""}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg line-clamp-1 mb-1">{recipe.title}</h3>
        {recipe.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{recipe.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {totalTime} min
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {recipe.servings} servings
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {ingredientList
            .filter((i) => !i.startsWith("---"))
            .slice(0, 3)
            .join(", ")}
          {ingredientList.filter((i) => !i.startsWith("---")).length > 3 && "..."}
        </p>
      </div>
      {recipe.categories.length > 0 && (
        <div className="px-4 pb-4 flex flex-wrap gap-1.5">
          {recipe.categories.slice(0, 3).map((cat) => (
            <span
              key={cat.id}
              className="px-2 py-0.5 text-xs font-medium bg-accent text-accent-foreground rounded-full"
            >
              {cat.name}
            </span>
          ))}
          {recipe.categories.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-muted-foreground border border-border rounded-full">
              +{recipe.categories.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
