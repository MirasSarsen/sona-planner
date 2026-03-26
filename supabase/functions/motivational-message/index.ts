import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const moodDescriptions: Record<number, string> = {
  1: "Өте жаман (очень плохое)",
  2: "Жаман (плохое)",
  3: "Орташа (среднее)",
  4: "Жақсы (хорошее)",
  5: "Өте жақсы (отличное)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mood } = await req.json();

    if (!mood || mood < 1 || mood > 5) {
      return new Response(
        JSON.stringify({ error: "Mood must be between 1 and 5" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sona-planner.vercel.app",
        "X-Title": "sona-planner",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Ты — мотивационный помощник для студента. Отвечай ТОЛЬКО на казахском языке.
Твоя задача — дать короткое (2-3 предложения) мотивационное сообщение на основе текущего настроения студента.
Если настроение плохое — поддержи и подбодри. Если хорошее — похвали и мотивируй продолжать.
Используй эмодзи. Не используй заголовки или списки, только текст.`,
          },
          {
            role: "user",
            content: `Текущее настроение студента: ${mood}/5 — ${moodDescriptions[mood]}. Напиши мотивационное сообщение.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenRouter error:", response.status, text);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Сұраулар лимиті асылды, кейінірек қайталап көріңіз." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Кредиттер таусылды." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: `OpenRouter 401: ${text}` }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: `OpenRouter error ${response.status}: ${text}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "Алға! 💪";

    return new Response(
      JSON.stringify({ message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Error:", e);

    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
