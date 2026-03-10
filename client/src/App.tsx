import { useState, useEffect, useCallback } from "react";
import { api } from "./lib/api";
import { Toaster } from "sonner";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import ImportPage from "./pages/ImportPage";
import CategoriesPage from "./pages/CategoriesPage";
import MealPlannerPage from "./pages/MealPlannerPage";
import SharedRecipePage from "./pages/SharedRecipePage";

type Page =
  | { name: "home" }
  | { name: "detail"; recipeId: number }
  | { name: "import" }
  | { name: "categories" }
  | { name: "meal-planner" };

export default function App() {
  // Check if this is a shared recipe URL
  const sharedToken = getSharedToken();
  if (sharedToken) {
    return (
      <>
        <Toaster />
        <SharedRecipePage token={sharedToken} />
      </>
    );
  }

  return <AuthenticatedApp />;
}

function getSharedToken(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/shared\/([a-f0-9]+)$/);
  return match ? match[1] : null;
}

function AuthenticatedApp() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [page, setPage] = useState<Page>({ name: "home" });

  useEffect(() => {
    api.auth.check().then((res) => setAuthenticated(res.authenticated));
  }, []);

  const handleLogin = useCallback(() => setAuthenticated(true), []);
  const handleLogout = useCallback(async () => {
    await api.auth.logout();
    setAuthenticated(false);
  }, []);

  const navigate = useCallback((p: Page) => setPage(p), []);

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <>
        <Toaster />
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <header className="border-b border-border bg-card sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => navigate({ name: "home" })}
                  className="text-lg font-bold text-foreground flex items-center gap-2"
                >
                  🍳 Recipe Store
                </button>
                <nav className="hidden sm:flex items-center gap-1">
                  <NavButton
                    active={page.name === "home" || page.name === "detail"}
                    onClick={() => navigate({ name: "home" })}
                  >
                    Recipes
                  </NavButton>
                  <NavButton
                    active={page.name === "meal-planner"}
                    onClick={() => navigate({ name: "meal-planner" })}
                  >
                    Meal Planner
                  </NavButton>
                  <NavButton
                    active={page.name === "categories"}
                    onClick={() => navigate({ name: "categories" })}
                  >
                    Categories
                  </NavButton>
                </nav>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate({ name: "import" })}
                  className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
                >
                  + Import
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
            {/* Mobile nav */}
            <div className="sm:hidden flex gap-1 pb-2">
              <NavButton
                active={page.name === "home" || page.name === "detail"}
                onClick={() => navigate({ name: "home" })}
              >
                Recipes
              </NavButton>
              <NavButton
                active={page.name === "meal-planner"}
                onClick={() => navigate({ name: "meal-planner" })}
              >
                Planner
              </NavButton>
              <NavButton
                active={page.name === "categories"}
                onClick={() => navigate({ name: "categories" })}
              >
                Categories
              </NavButton>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {page.name === "home" && (
            <HomePage
              onViewRecipe={(id) => navigate({ name: "detail", recipeId: id })}
              onImport={() => navigate({ name: "import" })}
            />
          )}
          {page.name === "detail" && (
            <RecipeDetailPage
              recipeId={page.recipeId}
              onBack={() => navigate({ name: "home" })}
            />
          )}
          {page.name === "import" && (
            <ImportPage
              onDone={(id) => navigate(id ? { name: "detail", recipeId: id } : { name: "home" })}
              onCancel={() => navigate({ name: "home" })}
            />
          )}
          {page.name === "categories" && <CategoriesPage />}
          {page.name === "meal-planner" && (
            <MealPlannerPage
              onViewRecipe={(id) => navigate({ name: "detail", recipeId: id })}
            />
          )}
        </main>
      </div>
    </>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      }`}
    >
      {children}
    </button>
  );
}
