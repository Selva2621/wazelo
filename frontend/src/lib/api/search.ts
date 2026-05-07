import apiClient from "./client";
import type { SearchResponse } from "@/lib/types/search";

export const searchApi = {
  search: (q: string) =>
    apiClient
      .get<SearchResponse>("/search", { params: { q } })
      .then((r) => r.data),
};
