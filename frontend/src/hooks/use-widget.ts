import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWidgetConfig, updateWidgetConfig, type WidgetConfig } from "@/lib/api/widget";

export function useWidgetConfig(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["widget", "config"],
    queryFn: getWidgetConfig,
    enabled: options.enabled ?? true,
  });
}

export function useUpdateWidgetConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<WidgetConfig>) => updateWidgetConfig(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["widget", "config"] }),
  });
}
