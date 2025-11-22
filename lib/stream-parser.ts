/**
 * Types for SSE stream events from AI SDK UI message stream
 */
export type StreamEventType =
  | 'start'
  | 'start-step'
  | 'tool-input-start'
  | 'tool-input-delta'
  | 'tool-input-available'
  | 'tool-output-available'
  | 'finish-step'
  | 'text-start'
  | 'text-delta'
  | 'text-end'
  | 'finish'
  | 'error';

export interface BaseStreamEvent {
  type: StreamEventType;
}

export interface StartEvent extends BaseStreamEvent {
  type: 'start';
  messageId: string;
}

export interface StartStepEvent extends BaseStreamEvent {
  type: 'start-step';
}

export interface ToolInputStartEvent extends BaseStreamEvent {
  type: 'tool-input-start';
  toolCallId: string;
  toolName: string;
}

export interface ToolInputDeltaEvent extends BaseStreamEvent {
  type: 'tool-input-delta';
  toolCallId: string;
  inputTextDelta: string;
}

export interface ToolInputAvailableEvent extends BaseStreamEvent {
  type: 'tool-input-available';
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  providerMetadata?: Record<string, unknown>;
}

export interface ToolOutputAvailableEvent extends BaseStreamEvent {
  type: 'tool-output-available';
  toolCallId: string;
  output: Record<string, unknown>;
  preliminary?: boolean;
}

export interface FinishStepEvent extends BaseStreamEvent {
  type: 'finish-step';
}

export interface TextStartEvent extends BaseStreamEvent {
  type: 'text-start';
  id: string;
  providerMetadata?: Record<string, unknown>;
}

export interface TextDeltaEvent extends BaseStreamEvent {
  type: 'text-delta';
  id: string;
  delta: string;
}

export interface TextEndEvent extends BaseStreamEvent {
  type: 'text-end';
  id: string;
}

export interface FinishEvent extends BaseStreamEvent {
  type: 'finish';
  finishReason: string;
}

export interface ErrorEvent extends BaseStreamEvent {
  type: 'error';
  errorText?: string;
}

export type StreamEvent =
  | StartEvent
  | StartStepEvent
  | ToolInputStartEvent
  | ToolInputDeltaEvent
  | ToolInputAvailableEvent
  | ToolOutputAvailableEvent
  | FinishStepEvent
  | TextStartEvent
  | TextDeltaEvent
  | TextEndEvent
  | FinishEvent
  | ErrorEvent;

/**
 * Parses a single SSE data line
 * @param line - The SSE line (e.g., "data: {...}" or "data: [DONE]")
 * @returns Parsed event object or null if line is invalid/empty
 */
export function parseStreamLine(line: string): StreamEvent | null {
  // Remove leading/trailing whitespace
  const trimmed = line.trim();
  
  // Skip empty lines
  if (!trimmed) {
    return null;
  }

  // Check for [DONE] marker
  if (trimmed === 'data: [DONE]') {
    return { type: 'finish', finishReason: 'stop' } as FinishEvent;
  }

  // Extract JSON from "data: {...}" format
  if (!trimmed.startsWith('data: ')) {
    return null;
  }

  const jsonStr = trimmed.slice(6); // Remove "data: " prefix

  try {
    const parsed = JSON.parse(jsonStr) as StreamEvent;
    return parsed;
  } catch (error) {
    console.error('Failed to parse stream line:', error, 'Line:', line);
    return null;
  }
}

/**
 * Parses multiple SSE data lines
 * @param content - The full SSE content (can be a single string with newlines or array of lines)
 * @returns Array of parsed event objects
 */
export function parseStreamContent(
  content: string | string[]
): StreamEvent[] {
  const lines = Array.isArray(content) ? content : content.split('\n');
  
  return lines
    .map(parseStreamLine)
    .filter((event): event is StreamEvent => event !== null);
}

/**
 * Parses SSE stream content and groups events by type
 * @param content - The full SSE content
 * @returns Object with events grouped by type
 */
export function parseAndGroupStreamContent(content: string | string[]) {
  const events = parseStreamContent(content);
  
  return {
    events,
    byType: {
      start: events.filter((e): e is StartEvent => e.type === 'start'),
      'start-step': events.filter((e): e is StartStepEvent => e.type === 'start-step'),
      'tool-input-start': events.filter((e): e is ToolInputStartEvent => e.type === 'tool-input-start'),
      'tool-input-delta': events.filter((e): e is ToolInputDeltaEvent => e.type === 'tool-input-delta'),
      'tool-input-available': events.filter((e): e is ToolInputAvailableEvent => e.type === 'tool-input-available'),
      'tool-output-available': events.filter((e): e is ToolOutputAvailableEvent => e.type === 'tool-output-available'),
      'finish-step': events.filter((e): e is FinishStepEvent => e.type === 'finish-step'),
      'text-start': events.filter((e): e is TextStartEvent => e.type === 'text-start'),
      'text-delta': events.filter((e): e is TextDeltaEvent => e.type === 'text-delta'),
      'text-end': events.filter((e): e is TextEndEvent => e.type === 'text-end'),
      finish: events.filter((e): e is FinishEvent => e.type === 'finish'),
      error: events.filter((e): e is ErrorEvent => e.type === 'error'),
    },
  };
}

/**
 * Extracts accumulated text from text-delta events, grouped by stream ID
 * @param events - Array of stream events
 * @returns Map of stream ID to accumulated text
 */
export function extractTextByStreamId(events: StreamEvent[]): Map<string, string> {
  const textByStreamId = new Map<string, string>();
  
  events
    .filter((e): e is TextDeltaEvent => e.type === 'text-delta')
    .forEach((e) => {
      const current = textByStreamId.get(e.id) || '';
      textByStreamId.set(e.id, current + e.delta);
    });
  
  return textByStreamId;
}

/**
 * Extracts accumulated text from text-delta events
 * @param events - Array of stream events
 * @returns Concatenated text from all text-delta events (all streams merged)
 */
export function extractTextFromEvents(events: StreamEvent[]): string {
  const textByStreamId = extractTextByStreamId(events);
  // Merge all streams in order of first appearance
  const streamIds = Array.from(textByStreamId.keys());
  return streamIds.map(id => textByStreamId.get(id) || '').join('');
}

/**
 * Extracts tool calls from events
 * @param events - Array of stream events
 * @returns Map of toolCallId to tool call data
 */
export function extractToolCalls(events: StreamEvent[]) {
  const toolCalls = new Map<
    string,
    {
      toolName: string;
      input: Record<string, unknown>;
      output?: Record<string, unknown>;
      inputDeltas: string[];
    }
  >();

  for (const event of events) {
    if (event.type === 'tool-input-start') {
      if (!toolCalls.has(event.toolCallId)) {
        toolCalls.set(event.toolCallId, {
          toolName: event.toolName,
          input: {},
          inputDeltas: [],
        });
      }
    } else if (event.type === 'tool-input-delta') {
      const toolCall = toolCalls.get(event.toolCallId);
      if (toolCall) {
        toolCall.inputDeltas.push(event.inputTextDelta);
      }
    } else if (event.type === 'tool-input-available') {
      const toolCall = toolCalls.get(event.toolCallId);
      if (toolCall) {
        toolCall.input = event.input;
      }
    } else if (event.type === 'tool-output-available') {
      const toolCall = toolCalls.get(event.toolCallId);
      if (toolCall) {
        toolCall.output = event.output;
      }
    }
  }

  return toolCalls;
}

