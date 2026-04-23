exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const body = JSON.parse(event.body);
    let requestBody;
    
    // Bajamos max_tokens a 2000 para reducir el tiempo de respuesta final
    if (body.content) {
      requestBody = {
        model: "claude-3-5-sonnet-latest", // Mantenemos la versión potente
        max_tokens: 2000, 
        messages: [{ role: "user", content: body.content }],
      };
    } else {
      requestBody = {
        model: body.model || "claude-3-5-sonnet-latest",
        max_tokens: 2000, 
        messages: body.messages,
      };
      if (body.tools) requestBody.tools = body.tools;
    }

    // Usamos un AbortController para manejar el límite de tiempo nosotros mismos
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9500); // Cortar a los 9.5s para no dar error de Netlify

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    // Si la conexión se corta, avisamos al usuario para que reintente
    const errorMessage = error.name === 'AbortError' 
      ? "La IA tardó mucho en responder. Por favor, reintenta el análisis."
      : error.message;
      
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: errorMessage }) 
    };
  }
};
