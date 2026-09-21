import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Thin wrapper around the generic /api/admin/<resource> CRUD endpoints
// (see backend/src/routes/admin.ts)  every simple content-management
// resource (categories, courses, modules, lessons, quizzes, questions,
// projects, achievements) follows the same list/create/update/delete shape.
export function useAdminCrud<T extends { _id: string }>(resource: string) {
  const queryClient = useQueryClient();
  const queryKey = ["admin", resource];

  const list = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<{ items: T[] }>(`/admin/${resource}`);
      return data.items;
    },
  });

  const create = useMutation({
    mutationFn: async (body: Partial<T>) => {
      const { data } = await api.post<{ item: T }>(`/admin/${resource}`, body);
      return data.item;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const update = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<T> }) => {
      const { data } = await api.put<{ item: T }>(`/admin/${resource}/${id}`, body);
      return data.item;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/${resource}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { list, create, update, remove };
}
