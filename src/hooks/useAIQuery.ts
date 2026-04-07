import { useState } from 'react';

interface UseAIQueryOptions {
  onSuccess?: (query: string) => void;
  onError?: (error: string) => void;
}

export const useAIQuery = (options?: UseAIQueryOptions) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuery = async (prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return null;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [
            {
              role: 'user',
              content: `You are a SQL expert. Generate only SQL queries without explanations.\n\nGenerate a SQL query for: ${trimmedPrompt}`
            }
          ]
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to generate query');
      }

      const generatedQuery = data.choices?.[0]?.message?.content?.trim();

      if (generatedQuery) {
        options?.onSuccess?.(generatedQuery);
        return generatedQuery;
      }

      return null;
    } catch (err) {
      const errorMessage = 'Failed to generate query. Please try again.';
      setError(errorMessage);
      options?.onError?.(errorMessage);
      console.error('OpenRouter Error:', err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateQuery,
    isGenerating,
    error,
    setError
  };
};
