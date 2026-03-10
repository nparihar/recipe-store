import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, X, ShoppingCart, Calendar,
  Trash2, ChefHat, Clock, Printer, Copy, Check,
} from "lucide-react";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};
const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "bg-amber-50 border-amber-200 text-amber-800",
  lunch: "bg-blue-50 border-blue-200 text-blue-800",
  dinner: "bg-purple-50 border-purple-200 text-purple-800",
  snack: "bg-green-50 border-green-200 text-green-800",
};

function getWeekDates(offset: number) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + 1 + offset * 7); // Monday
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export default function MealPlannerPage({
  onViewRecipe,
}: {
  onViewRecipe: (id: number) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [mealPlan, setMealPlan] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState<{ date: string; mealType: MealType } | null>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingList, setShoppingList] = useState<{ ingredient: string; fromRecipe: string }[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const startDate = weekDates[0];
  const endDate = weekDates[6];

  const fetchMealPlan = async () => {
    setLoading(true);
    try {
      const data = await api.mealPlan.get(startDate, endDate);
      setMealPlan(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealPlan();
  }, [startDate, endDate]);

  useEffect(() => {
    api.recipes.list().then(setRecipes).catch(console.error);
  }, []);

  const getMealForSlot = (date: string, mealType: MealType) => {
    return mealPlan.find((m) => m.date === date && m.mealType === mealType);
  };

  const handleAddMeal = async (recipeId: number) => {
    if (!showPicker) return;
    try {
      await api.mealPlan.add({
        recipeId,
        date: showPicker.date,
        mealType: showPicker.mealType,
      });
      toast.success("Meal added to plan!");
      setShowPicker(null);
      fetchMealPlan();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemoveMeal = async (id: number) => {
    try {
      await api.mealPlan.remove(id);
      toast.success("Meal removed");
      fetchMealPlan();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleClearWeek = async () => {
    if (!confirm("Clear all meals for this week?")) return;
    try {
      await api.mealPlan.clearWeek(startDate, endDate);
      toast.success("Week cleared");
      fetchMealPlan();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleShowShoppingList = async () => {
    try {
      const list = await api.mealPlan.shoppingList(startDate, endDate);
      setShoppingList(list);
      setCheckedItems(new Set());
      setShowShoppingList(true);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleChecked = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const copyShoppingList = () => {
    const text = shoppingList
      .map((item, i) => `${checkedItems.has(i) ? "✓" : "☐"} ${item.ingredient}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Shopping list copied!");
  };

  const weekLabel = (() => {
    const s = new Date(startDate + "T12:00:00");
    const e = new Date(endDate + "T12:00:00");
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Meal Planner
          </h1>
          <p className="text-muted-foreground">Plan your meals for the week</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShowShoppingList}
            disabled={mealPlan.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4" />
            Shopping List
          </button>
          <button
            onClick={handleClearWeek}
            disabled={mealPlan.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear Week
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="p-2 hover:bg-accent rounded-md transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <span className="font-semibold">{weekLabel}</span>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="ml-3 text-xs text-primary hover:underline"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="p-2 hover:bg-accent rounded-md transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Desktop view */}
          <div className="hidden lg:block overflow-x-auto">
            <div className="grid grid-cols-8 gap-px bg-border rounded-xl overflow-hidden min-w-[800px]">
              {/* Header row */}
              <div className="bg-card p-3 font-medium text-sm text-muted-foreground" />
              {weekDates.map((date) => {
                const isToday = date === new Date().toISOString().split("T")[0];
                return (
                  <div
                    key={date}
                    className={`bg-card p-3 text-center text-sm font-medium ${isToday ? "bg-primary/5" : ""}`}
                  >
                    <div className={isToday ? "text-primary font-bold" : ""}>{formatDate(date)}</div>
                  </div>
                );
              })}

              {/* Meal rows */}
              {MEAL_TYPES.map((mealType) => (
                <>
                  <div key={`label-${mealType}`} className="bg-card p-3 flex items-start">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${MEAL_COLORS[mealType]}`}>
                      {MEAL_LABELS[mealType]}
                    </span>
                  </div>
                  {weekDates.map((date) => {
                    const meal = getMealForSlot(date, mealType);
                    const isToday = date === new Date().toISOString().split("T")[0];
                    return (
                      <div
                        key={`${date}-${mealType}`}
                        className={`bg-card p-2 min-h-[80px] ${isToday ? "bg-primary/5" : ""}`}
                      >
                        {meal ? (
                          <div className="group relative bg-accent/50 rounded-lg p-2 h-full">
                            <button
                              onClick={() => onViewRecipe(meal.recipeId)}
                              className="text-xs font-medium text-left hover:text-primary transition-colors line-clamp-2"
                            >
                              {meal.recipeTitle}
                            </button>
                            {meal.cookTime && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                                <Clock className="w-3 h-3" />
                                {(meal.prepTime || 0) + meal.cookTime}m
                              </div>
                            )}
                            <button
                              onClick={() => handleRemoveMeal(meal.id)}
                              className="absolute top-1 right-1 p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowPicker({ date, mealType })}
                            className="w-full h-full min-h-[60px] flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-accent/30 rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          {/* Mobile view */}
          <div className="lg:hidden space-y-3">
            {weekDates.map((date) => {
              const isToday = date === new Date().toISOString().split("T")[0];
              const dayMeals = MEAL_TYPES.map((mt) => ({
                mealType: mt,
                meal: getMealForSlot(date, mt),
              }));
              const hasMeals = dayMeals.some((dm) => dm.meal);

              return (
                <div
                  key={date}
                  className={`bg-card border border-border rounded-lg overflow-hidden ${isToday ? "ring-2 ring-primary/30" : ""}`}
                >
                  <div className={`px-4 py-2 border-b border-border ${isToday ? "bg-primary/5" : "bg-muted/30"}`}>
                    <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                      {formatDate(date)}
                      {isToday && <span className="ml-2 text-xs font-normal text-primary">(Today)</span>}
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    {MEAL_TYPES.map((mealType) => {
                      const meal = getMealForSlot(date, mealType);
                      return (
                        <div key={mealType} className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 w-16 text-center ${MEAL_COLORS[mealType]}`}>
                            {MEAL_LABELS[mealType]}
                          </span>
                          {meal ? (
                            <div className="flex items-center justify-between flex-1 bg-accent/30 rounded-md px-2 py-1.5">
                              <button
                                onClick={() => onViewRecipe(meal.recipeId)}
                                className="text-xs font-medium hover:text-primary transition-colors truncate"
                              >
                                {meal.recipeTitle}
                              </button>
                              <button
                                onClick={() => handleRemoveMeal(meal.id)}
                                className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowPicker({ date, mealType })}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Recipe Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Choose a Recipe</h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(showPicker.date)} - {MEAL_LABELS[showPicker.mealType]}
                </p>
              </div>
              <button onClick={() => setShowPicker(null)} className="p-1 hover:bg-accent rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {recipes.length > 0 ? (
                <div className="space-y-1">
                  {recipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleAddMeal(recipe.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0">
                        {recipe.imageUrl ? (
                          <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ChefHat className="w-5 h-5 text-muted-foreground opacity-40" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{recipe.title}</p>
                        {((recipe.prepTime || 0) + (recipe.cookTime || 0)) > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recipes yet. Import some first!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shopping List Modal */}
      {showShoppingList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Shopping List
                </h3>
                <p className="text-xs text-muted-foreground">{weekLabel}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyShoppingList}
                  className="flex items-center gap-1 px-2 py-1 text-xs border border-border rounded-md hover:bg-accent transition-colors"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button onClick={() => setShowShoppingList(false)} className="p-1 hover:bg-accent rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {shoppingList.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground mb-3">
                    {checkedItems.size} of {shoppingList.length} items checked
                  </p>
                  <div className="space-y-1">
                    {shoppingList.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => toggleChecked(i)}
                        className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors hover:bg-accent/50 ${
                          checkedItems.has(i) ? "opacity-50" : ""
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                            checkedItems.has(i)
                              ? "bg-primary border-primary"
                              : "border-border"
                          }`}
                        >
                          {checkedItems.has(i) && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <div>
                          <p className={`text-sm ${checkedItems.has(i) ? "line-through" : ""}`}>
                            {item.ingredient}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{item.fromRecipe}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No meals planned for this week.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
