import { useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  Link, Image, FileText, Sparkles, ArrowLeft, Check, Pencil,
  Clock, Users, Loader2, X, Plus,
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

  // Image tab - now supports multiple images
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Text tab
  const [recipeText, setRecipeText] = useState("");

  const handleExtract = async () => {
    setExtracting(true);
    try {
      let result;
      if (tab === "url") {
        if (!url.trim()) { toast.error("Please enter a URL"); setExtracting(false); return; }
        result = await api.import.fromUrl(url.trim());
      } else if (tab === "image") {
        if (imageFiles.length === 0) { toast.error("Please select at least one image"); setExtracting(false); return; }
        result = await api.import.fromImages(imageFiles);
      } else {
        if (!recipeText.trim()) { toast.error("Please enter recipe text"); setExtracting(false); return; }
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

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    // Generate previews for new files
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }

    // Reset the input so the same file can be re-selected
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
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
              <label className="text-sm font-medium">
                Recipe Screenshots or Photos
                <span className="text-muted-foreground font-normal ml-1">(upload multiple if recipe spans several images)</span>
              </label>

              {/* Image previews grid */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Image ${index + 1}`}
                        className="w-full h-28 object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                        {index + 1}
                      </span>
                    </div>
                  ))}

                  {/* Add more button */}
                  <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/30 transition-colors">
                    <Plus className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Add more</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImagesChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Initial upload area (shown when no images) */}
              {imagePreviews.length === 0 && (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/30 transition-colors">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Image className="w-8 h-8" />
                    <span className="text-sm">Click to upload images</span>
                    <span className="text-xs">You can select multiple images at once</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesChange}
                    className="hidden"
                  />
                </label>
              )}

              <p className="text-xs text-muted-foreground">
                {imageFiles.length === 0
                  ? "Upload one or more photos of a recipe — great for screenshots from social media, cookbook pages, etc."
                  : `${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""} selected. AI will combine all images into one recipe.`}
              </p>
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
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to import
      </button>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{data.title}</h2>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>

        {data.description && (
          <p className="text-muted-foreground mb-4">{data.description}</p>
        )}

        <div className="flex gap-4 text-sm text-muted-foreground mb-6">
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
          <div className="flex flex-wrap gap-2 mb-6">
            {data.suggestedCategories.map((cat: string) => (
              <span key={cat} className="px-2.5 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full">
                {cat}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <h3 className="font-semibold mb-2">Ingredients</h3>
            <ul className="space-y-1">
              {data.ingredients.map((ing: string, i: number) =>
                ing.startsWith("---") ? (
                  <li key={i} className="font-medium text-primary mt-3 first:mt-0">
                    {ing.replace(/^---\s*/, "").replace(/\s*---$/, "")}
                  </li>
                ) : (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
                    {ing}
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Instructions</h3>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{data.instructions}</div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Save Recipe
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
