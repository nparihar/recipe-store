import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, Clock, Users, ChefHat, Pencil, Trash2, ExternalLink,
  Star, Plus, Calendar, MessageSquare, Wrench, X, Check,
  Share2, Copy, Link2, Unlink, Upload, Image as ImageIcon,
} from "lucide-react";

export default function RecipeDetailPage({
  recipeId,
  onBack,
}: {
  recipeId: number;
  onBack: () => void;
}) {
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const fetchRecipe = async () => {
    setLoading(true);
    try {
      const data = await api.recipes.get(recipeId);
      setRecipe(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipe();
  }, [recipeId]);

  const handleDelete = async () => {
    try {
      await api.recipes.delete(recipeId);
      toast.success("Recipe deleted");
      onBack();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleShare = async () => {
    try {
      const result = await api.share.create(recipeId);
      const shareUrl = `${window.location.origin}/shared/${result.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard!");
      fetchRecipe();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUnshare = async () => {
    try {
      await api.share.delete(recipeId);
      toast.success("Share link removed");
      fetchRecipe();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const copyShareLink = () => {
    if (recipe?.shareToken) {
      const shareUrl = `${window.location.origin}/shared/${recipe.shareToken}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Recipe not found</p>
        <button onClick={onBack} className="mt-4 text-primary hover:underline">
          Back to recipes
        </button>
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

  if (editing) {
    return (
      <EditRecipeForm
        recipe={recipe}
        onSave={async (data) => {
          await api.recipes.update(recipeId, data);
          toast.success("Recipe updated");
          setEditing(false);
          fetchRecipe();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to recipes
      </button>

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
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{recipe.title}</h1>
              {recipe.description && (
                <p className="text-muted-foreground">{recipe.description}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              {/* Share button */}
              {recipe.shareToken ? (
                <div className="flex gap-1">
                  <button
                    onClick={copyShareLink}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-green-300 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
                    title="Copy share link"
                  >
                    <Copy className="w-4 h-4" /> Copy Link
                  </button>
                  <button
                    onClick={handleUnshare}
                    className="flex items-center gap-1 px-2 py-1.5 text-sm border border-border rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove share link"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => setDeleting(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>

          {/* Share banner */}
          {recipe.shareToken && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <Link2 className="w-4 h-4 shrink-0" />
              <span className="truncate">
                Shared at: {window.location.origin}/shared/{recipe.shareToken}
              </span>
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
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-3">Source</h2>
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" /> View original recipe
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cooking Notes */}
      <div className="mt-6">
        <CookingNotes recipeId={recipeId} />
      </div>

      {/* Delete Confirmation */}
      {deleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Recipe</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete this recipe? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleting(false)}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Edit Form with Image Upload ====================
function EditRecipeForm({
  recipe,
  onSave,
  onCancel,
}: {
  recipe: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  let ingredientsText = "";
  try {
    ingredientsText = JSON.parse(recipe.ingredients).join("\n");
  } catch {
    ingredientsText = recipe.ingredients;
  }

  const [form, setForm] = useState({
    title: recipe.title,
    description: recipe.description || "",
    imageUrl: recipe.imageUrl || "",
    ingredients: ingredientsText,
    instructions: recipe.instructions,
    prepTime: recipe.prepTime?.toString() || "",
    cookTime: recipe.cookTime?.toString() || "",
    servings: recipe.servings?.toString() || "",
    sourceUrl: recipe.sourceUrl || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const result = await api.upload.image(file);
      setForm({ ...form, imageUrl: result.url });
      toast.success("Image uploaded!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const ingredientsArray = form.ingredients.split("\n").map((i) => i.trim()).filter(Boolean);
      await onSave({
        title: form.title,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        ingredients: JSON.stringify(ingredientsArray),
        instructions: form.instructions,
        prepTime: form.prepTime ? parseInt(form.prepTime) : undefined,
        cookTime: form.cookTime ? parseInt(form.cookTime) : undefined,
        servings: form.servings ? parseInt(form.servings) : undefined,
        sourceUrl: form.sourceUrl || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Edit Recipe</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Title" required>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="form-input" />
        </FormField>
        <FormField label="Description">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="form-input resize-none" />
        </FormField>

        {/* Image section with upload */}
        <FormField label="Recipe Image">
          <div className="space-y-3">
            {form.imageUrl && (
              <div className="relative w-full max-w-xs">
                <img src={form.imageUrl} alt="Preview" className="w-full rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, imageUrl: "" })}
                  className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? "Uploading..." : "Upload Image"}
              </button>
              <span className="text-xs text-muted-foreground">or</span>
              <input
                placeholder="Paste image URL"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="form-input flex-1"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </FormField>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Prep Time (min)">
            <input type="number" value={form.prepTime} onChange={(e) => setForm({ ...form, prepTime: e.target.value })} className="form-input" />
          </FormField>
          <FormField label="Cook Time (min)">
            <input type="number" value={form.cookTime} onChange={(e) => setForm({ ...form, cookTime: e.target.value })} className="form-input" />
          </FormField>
          <FormField label="Servings">
            <input type="number" value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} className="form-input" />
          </FormField>
        </div>
        <FormField label="Ingredients (one per line)" required>
          <textarea value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} rows={8} required className="form-input resize-none font-mono text-sm" />
        </FormField>
        <FormField label="Instructions" required>
          <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={10} required className="form-input resize-none" />
        </FormField>
        <FormField label="Source URL">
          <input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} className="form-input" />
        </FormField>
        <div className="flex gap-2 justify-end pt-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

// ==================== Cooking Notes ====================
function CookingNotes({ recipeId }: { recipeId: number }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [stats, setStats] = useState<{ averageRating: number | null; totalNotes: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    try {
      const [notesData, statsData] = await Promise.all([
        api.cookingNotes.list(recipeId),
        api.cookingNotes.stats(recipeId),
      ]);
      setNotes(notesData);
      setStats(statsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [recipeId]);

  const handleCreate = async (data: any) => {
    await api.cookingNotes.create(recipeId, data);
    toast.success("Cooking note added!");
    setShowForm(false);
    fetchNotes();
  };

  const handleUpdate = async (data: any) => {
    if (!editingId) return;
    await api.cookingNotes.update(editingId, data);
    toast.success("Note updated!");
    setEditingId(null);
    fetchNotes();
  };

  const handleDelete = async (id: number) => {
    await api.cookingNotes.delete(id);
    toast.success("Note deleted!");
    fetchNotes();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Cooking Notes
            {stats && stats.totalNotes > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-accent text-accent-foreground rounded-full">
                {stats.totalNotes} {stats.totalNotes === 1 ? "entry" : "entries"}
              </span>
            )}
          </h2>
          {stats?.averageRating !== null && stats?.averageRating !== undefined && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating value={Math.round(stats.averageRating)} readonly size="sm" />
              <span className="text-sm text-muted-foreground">{stats.averageRating} avg</span>
            </div>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Note
          </button>
        )}
      </div>

      {showForm && (
        <NoteForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-3 mt-4">
          {notes.map((note) =>
            editingId === note.id ? (
              <NoteForm
                key={note.id}
                initialData={note}
                onSubmit={handleUpdate}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div key={note.id} className="p-3 border border-border rounded-lg hover:bg-accent/20 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {note.rating && <StarRating value={note.rating} readonly size="sm" />}
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(note.cookedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingId(note.id)} className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(note.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {note.notes && <p className="text-sm mt-2">{note.notes}</p>}
                {note.modifications && (
                  <div className="flex items-start gap-1.5 text-sm mt-2">
                    <Wrench className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{note.modifications}</span>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      ) : !showForm ? (
        <div className="text-center py-6 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No cooking notes yet.</p>
          <p className="text-xs mt-1">Try this recipe and add your feedback!</p>
        </div>
      ) : null}
    </div>
  );
}

function NoteForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [modifications, setModifications] = useState(initialData?.modifications || "");
  const [cookedAt, setCookedAt] = useState(
    initialData?.cookedAt
      ? new Date(initialData.cookedAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit({
        rating: rating > 0 ? rating : undefined,
        notes: notes.trim() || undefined,
        modifications: modifications.trim() || undefined,
        cookedAt: cookedAt,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-accent/20">
      <div className="space-y-2">
        <label className="text-sm font-medium">Rating</label>
        <StarRating value={rating} onChange={setRating} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">When did you cook this?</label>
        <input type="date" value={cookedAt} onChange={(e) => setCookedAt(e.target.value)} className="form-input max-w-[200px]" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> Notes
        </label>
        <textarea placeholder="How did it turn out?" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="form-input resize-none" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5" /> Modifications
        </label>
        <textarea placeholder="What did you change?" value={modifications} onChange={(e) => setModifications(e.target.value)} rows={2} className="form-input resize-none" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors">
          <X className="w-4 h-4" /> Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? "Saving..." : <><Check className="w-4 h-4" /> {initialData ? "Update" : "Save Note"}</>}
        </button>
      </div>
    </div>
  );
}

function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={`${sizeClass} ${
              star <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}
