import { apiPostAuth } from "../api";

export const fetchGeminiSuggestion = async (locationName) => {
  try {
    console.log(`🔍 Fetching AI suggestion for: "${locationName}"`);

    // Use n8n webhook endpoint directly
    const apiUrl = "https://n8n-js.onrender.com/webhook/ai-generate";

    const payload = {
      location: locationName,
    };

    console.log("📤 Sending request to backend ai-generate endpoint...");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log(`📊 API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();
    console.log("✅ Received response from backend");

    // Handle both array format (from N8N) and object format
    let responseData = data;

    if (Array.isArray(data) && data.length > 0) {
      // N8N returns array format: [{ content: "..." }]
      responseData = data[0];
    }

    if (!responseData || !responseData.content) {
      console.error("❌ Invalid response format:", data);
      return null;
    }

    // Process the content: replace \n with actual line breaks
    const processedContent = responseData.content.replace(/\\n/g, "\n").trim();

    const result = {
      location: locationName,
      content: processedContent,
    };

    console.log("✅ Successfully parsed AI-generated content");

    return result;
  } catch (error) {
    console.error("❌ Error in fetchGeminiSuggestion:", error.message);
    return null;
  }
};
