const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (res.status === 401) {
    window.location.reload();
    throw new Error("Not authenticated");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  auth: {
    check: () => request<{ authenticated: boolean }>("/auth/check"),
    login: (password: string) =>
      request<{ success: boolean }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    logout: () => request<{ success: boolean }>("/auth/logout", { method: "POST" }),
  },

  recipes: {
    list: (search?: string, categoryIds?: number[]) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryIds?.length) params.set("categoryIds", categoryIds.join(","));
      const qs = params.toString();
      return request<any[]>(`/recipes${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => request<any>(`/recipes/${id}`),
    create: (data: any) =>
      request<{ id: number }>("/recipes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<{ success: boolean }>(`/recipes/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/recipes/${id}`, { method: "DELETE" }),
  },

  upload: {
    image: async (file: File): Promise<{ url: string; filename: string }> => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${BASE}/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
  },

  share: {
    create: (recipeId: number) =>
      request<{ token: string; url: string }>(`/recipes/${recipeId}/share`, { method: "POST" }),
    delete: (recipeId: number) =>
      request<{ success: boolean }>(`/recipes/${recipeId}/share`, { method: "DELETE" }),
    getPublic: (token: string) => request<any>(`/shared/${token}`),
  },

  import: {
    fromUrl: (url: string) =>
      request<any>("/import/url", { method: "POST", body: JSON.stringify({ url }) }),
    fromImage: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${BASE}/import/image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }
      return res.json();
    },
    fromText: (text: string) =>
      request<any>("/import/text", { method: "POST", body: JSON.stringify({ text }) }),
    save: (data: any) =>
      request<{ id: number }>("/import/save", { method: "POST", body: JSON.stringify(data) }),
  },

  categories: {
    list: () => request<any[]>("/categories"),
    create: (name: string) =>
      request<{ id: number }>("/categories", { method: "POST", body: JSON.stringify({ name }) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/categories/${id}`, { method: "DELETE" }),
  },

  cookingNotes: {
    list: (recipeId: number) => request<any[]>(`/recipes/${recipeId}/notes`),
    stats: (recipeId: number) =>
      request<{ averageRating: number | null; totalNotes: number }>(
        `/recipes/${recipeId}/notes/stats`
      ),
    create: (recipeId: number, data: any) =>
      request<{ id: number }>(`/recipes/${recipeId}/notes`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      request<{ success: boolean }>(`/notes/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/notes/${id}`, { method: "DELETE" }),
  },

  mealPlan: {
    get: (startDate: string, endDate: string) => {
      const params = new URLSearchParams({ startDate, endDate });
      return request<any[]>(`/meal-plan?${params}`);
    },
    add: (data: { recipeId: number; date: string; mealType: string }) =>
      request<{ id: number }>("/meal-plan", { method: "POST", body: JSON.stringify(data) }),
    remove: (id: number) =>
      request<{ success: boolean }>(`/meal-plan/${id}`, { method: "DELETE" }),
    clearWeek: (startDate: string, endDate: string) => {
      const params = new URLSearchParams({ startDate, endDate });
      return request<{ success: boolean }>(`/meal-plan?${params}`, { method: "DELETE" });
    },
    shoppingList: (startDate: string, endDate: string) => {
      const params = new URLSearchParams({ startDate, endDate });
      return request<{ ingredient: string; fromRecipe: string }[]>(`/shopping-list?${params}`);
    },
  },
};
