import { useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  Link, Image, FileText, Sparkles, ArrowLeft, Check, Pencil,
  Clock, Users, Loader2,
} from "lucide-react";

type Tab = "url" | "image" | "text";

export default function ImportPage({
  onDone,
  onCancel,
}: {
  onDone: (id?: number) => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<Tab>("url");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<any>(null);

  // URL tab
  const [url, setUrl] = useState("");

  // Image tab
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Text tab
  const [recipeText, setRecipeText] = useState("");

  const handleExtract = async () => {
    setExtracting(true);
    try {
      let result;
      if (tab === "url") {
        if (!url.trim()) { toast.error("Please enter a URL"); return; }
        result = await api.import.fromUrl(url.trim());
      } else if (tab === "image") {
        if (!imageFile) { toast.error("Please select an image"); return; }
        result = await api.import.fromImage(imageFile);
      } else {
        if (!recipeText.trim()) { toast.error("Please enter recipe text"); return; }
        result = await api.import.fromText(recipeText.trim());
      }
      setExtracted(result);
      toast.success("Recipe extracted! Review and save.");
    } catch (e: any) {
      toast.error(e.message || "Failed to extract recipe");
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!extracted) return;
    try {
      const result = await api.import.save({
        ...extracted,
        sourceUrl: tab === "url" ? url : undefined,
      });
      toast.success("Recipe saved!");
      onDone(result.id);
    } catch (e: any) {
      toast.error(e.message || "Failed to save recipe");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (extracted) {
    return (
      <ReviewExtracted
        data={extracted}
        onChange={setExtracted}
        onSave={handleSave}
        onBack={() => setExtracted(null)}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to recipes
      </button>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Import Recipe</h1>
        </div>

        <p className="text-muted-foreground mb-6">
          Import a recipe from any source. Our AI will extract the recipe details automatically.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
          {([
            { id: "url" as Tab, label: "URL", icon: Link },
            { id: "image" as Tab, label: "Image", icon: Image },
            { id: "text" as Tab, label: "Text", icon: FileText },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "url" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipe URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/recipe or YouTube URL..."
                className="form-input"
              />
              <p className="text-xs text-muted-foreground">
                Supports recipe websites, YouTube videos, and blog posts
              </p>
            </div>
          </div>
        )}

        {tab === "image" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipe Screenshot or Photo</label>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/30 transition-colors">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-full object-contain rounded" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Image className="w-8 h-8" />
                    <span className="text-sm">Click to upload an image</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {tab === "text" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paste Recipe Text</label>
              <textarea
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                placeholder="Paste the recipe text here... ingredients, instructions, etc."
                rows={8}
                className="form-input resize-none"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleExtract}
          disabled={extracting}
          className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {extracting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Extracting recipe...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Extract Recipe
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ReviewExtracted({
  data,
  onChange,
  onSave,
  onBack,
}: {
  data: any;
  onChange: (d: any) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-6">Edit Extracted Recipe</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <input
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              rows={2}
              className="form-input resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prep (min)</label>
              <input
                type="number"
                value={data.prepTime || ""}
                onChange={(e) => onChange({ ...data, prepTime: e.target.value ? parseInt(e.target.value) : null })}
                className="form-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cook (min)</label>
              <input
                type="number"
                value={data.cookTime || ""}
                onChange={(e) => onChange({ ...data, cookTime: e.target.value ? parseInt(e.target.value) : null })}
                className="form-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Servings</label>
              <input
                type="number"
                value={data.servings || ""}
                onChange={(e) => onChange({ ...data, servings: e.target.value ? parseInt(e.target.value) : null })}
                className="form-input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Ingredients (one per line)</label>
            <textarea
              value={data.ingredients.join("\n")}
              onChange={(e) => onChange({ ...data, ingredients: e.target.value.split("\n") })}
              rows={8}
              className="form-input resize-none font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Instructions</label>
            <textarea
              value={data.instructions}
              onChange={(e) => onChange({ ...data, instructions: e.target.value })}
              rows={10}
              className="form-input resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Categories (comma separated)</label>
            <input
              value={(data.suggestedCategories || []).join(", ")}
              onChange={(e) => onChange({ ...data, suggestedCategories: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
              className="form-input"
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors">
              Done Editing
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalTime = (data.prepTime || 0) + (data.cookTime || 0);

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to import
      </button>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Review Recipe</h2>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
          >
            <Pencil className="w-4 h-4" /> Edit
          </button>
        </div>

        <h3 className="text-lg font-semibold mb-2">{data.title}</h3>
        {data.description && <p className="text-muted-foreground mb-4">{data.description}</p>}

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> {totalTime} min
            </span>
          )}
          {data.servings && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" /> {data.servings} servings
            </span>
          )}
        </div>

        {data.suggestedCategories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {data.suggestedCategories.map((cat: string, i: number) => (
              <span key={i} className="px-2 py-0.5 text-xs font-medium bg-accent text-accent-foreground rounded-full">
                {cat}
              </span>
            ))}
          </div>
        )}

        <hr className="my-4 border-border" />

        <h4 className="font-medium mb-2">Ingredients ({data.ingredients.length})</h4>
        <ul className="space-y-1 mb-4">
          {data.ingredients.map((item: string, i: number) =>
            item.startsWith("---") ? (
              <li key={i} className="font-medium text-muted-foreground pt-2">{item.replace(/---/g, "").trim()}</li>
            ) : (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {item}
              </li>
            )
          )}
        </ul>

        <h4 className="font-medium mb-2">Instructions</h4>
        <div className="text-sm space-y-2 mb-6">
          {data.instructions.split("\n").map((p: string, i: number) =>
            p.trim() ? <p key={i}>{p}</p> : null
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onBack} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors">
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
