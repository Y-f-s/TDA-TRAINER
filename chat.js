exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ status: "error", message: "Method Not Allowed" }) };
  }

  try {
    const data = JSON.parse(event.body);
    const prompt = data.prompt || "";
    
    // API Key langsung di-inject aman di environment Netlify
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "error", message: "GROQ_API_KEY belum diset di Netlify Environment Variables." })
      };
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Anda adalah asisten publik TDA Trainer Jakarta Selatan yang ramah, profesional, dan informatif." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1024
      })
    });

    const resData = await response.json();
    if (resData.error) {
      throw new Error(resData.error.message || "Gagal dari server Groq.");
    }

    const answer = resData.choices?.[0]?.message?.content || "Maaf, respons kosong.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "success", answer: answer })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "error", message: error.toString() })
    };
  }
};