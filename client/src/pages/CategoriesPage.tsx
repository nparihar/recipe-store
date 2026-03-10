import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Tag } from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const data = await api.categories.list();
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await api.categories.create(newName.trim());
      setNewName("");
      toast.success("Category created");
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.categories.delete(id);
      toast.success("Category deleted");
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Tag className="w-6 h-6" /> Categories
      </h1>

      {/* Add Category */}
      <div className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New category name..."
          className="flex-1 px-4 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Category List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      ) : categories.length > 0 ? (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
            >
              <span className="font-medium">{cat.name}</span>
              <button
                onClick={() => handleDelete(cat.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Tag className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No categories yet. Create one above.</p>
        </div>
      )}
    </div>
  );
}
