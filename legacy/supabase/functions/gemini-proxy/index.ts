const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // В продакшене лучше заменить на ваш домен
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Обработка preflight-запроса для CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Получаем ключ API из секретных переменных окружения Supabase
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not found in environment variables." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Получаем тело запроса от фронтенда
    const requestBody = await req.json();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

    // Отправляем запрос к Google Gemini API
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.json();
      // Возвращаем ошибку от Gemini на фронтенд
      return new Response(JSON.stringify(errorBody), {
        status: geminiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await geminiResponse.json();

    // Возвращаем успешный ответ от Gemini на фронтенд
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});