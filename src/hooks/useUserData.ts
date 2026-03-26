import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUserData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [moods, setMoods] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setTasks([]);
      setMoods([]);
      setMetrics([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [tasksRes, moodsRes, metricsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("mood_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true }),

      supabase
        .from("custom_metrics")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    setTasks(tasksRes.data || []);
    setMoods(moodsRes.data || []);
    setMetrics(metricsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    userId,
    tasks,
    moods,
    metrics,
    loading,
    refetch: fetchAll,
  };
}
