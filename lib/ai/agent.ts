import OpenAI from 'openai';
import { searchProblemsByEmbedding, searchProblemsToolDefinition, type SearchProblemsParams } from './tools';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for client-side usage in development
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  message: string;
  problems?: any[];
  error?: string;
}

const SYSTEM_PROMPT = `You are KIDARI AI, an intelligent assistant that helps teachers and students find specific problems from a database of Korean social studies (통합사회) exam questions.

Your main capabilities:
1. Search for problems based on natural language descriptions
2. Help users find problems by topic, difficulty, or content
3. Provide helpful suggestions for problem selection

When a user asks about finding problems:
1. Use the search_problems_by_embedding tool to find relevant problems
2. Explain what you found in a helpful, conversational way
3. Mention the number of problems found and briefly describe what types of problems they are

Always respond in Korean and be helpful and friendly. If you can't find problems that match the query, suggest alternative search terms or topics.`;

export async function processUserMessage(
  message: string,
  chatHistory: ChatMessage[] = [],
  onProblemsUpdate?: (problems: any[]) => void
): Promise<AgentResponse> {
  try {
    // Convert chat history to OpenAI format and keep last 10 messages for context
    const historyMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = chatHistory
      .slice(-10) // Keep last 10 messages for context trimming
      .map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : msg.role,
        content: msg.content
      }));

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...historyMessages,
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      tools: [searchProblemsToolDefinition],
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000
    });

    const assistantMessage = completion.choices[0].message;

    // Check if the assistant wants to use tools
    if (assistantMessage.tool_calls) {
      const toolCall = assistantMessage.tool_calls[0];

      if (toolCall.function.name === 'search_problems_by_embedding') {
        const params = JSON.parse(toolCall.function.arguments) as SearchProblemsParams;
        const searchResult = await searchProblemsByEmbedding(params);

        if (searchResult.success && searchResult.problems) {
          // Update the problems in the UI
          if (onProblemsUpdate) {
            onProblemsUpdate(searchResult.problems);
          }

          // Get a final response from the assistant about the search results
          const finalMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...historyMessages,
            { role: 'user', content: message },
            assistantMessage,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                success: true,
                count: searchResult.problems.length,
                message: searchResult.message
              })
            }
          ];

          const finalCompletion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: finalMessages,
            temperature: 0.7,
            max_tokens: 500
          });

          return {
            message: finalCompletion.choices[0].message.content || '문제를 찾았습니다!',
            problems: searchResult.problems
          };
        } else {
          return {
            message: `죄송합니다. 문제를 찾는 중 오류가 발생했습니다: ${searchResult.error}`,
            error: searchResult.error
          };
        }
      }
    }

    // If no tool calls, return the assistant's direct response
    return {
      message: assistantMessage.content || '죄송합니다. 응답을 생성할 수 없습니다.'
    };

  } catch (error) {
    console.error('Error in processUserMessage:', error);
    return {
      message: '죄송합니다. 메시지 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}