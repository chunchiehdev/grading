// spec 020: provider tag distinguishes the 3 parallel agents in a multi-model run.
// undefined → single-model (legacy) mode; frontend treats those events as the default stream.
export type ProviderTag = 'gemini' | 'openai' | 'anthropic';

export type BridgeEvent =
  | { type: 'text-delta'; content: string; provider?: ProviderTag }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: any; provider?: ProviderTag }
  | { type: 'tool-result'; toolCallId: string; result: any; provider?: ProviderTag }
  | { type: 'error'; error: string; provider?: ProviderTag }
  | { type: 'finish'; result?: any; provider?: ProviderTag }
  // spec 020: emitted by parallel-agents once all providers settle; bridge uses this to cleanup.
  | { type: 'aggregate-finish'; medianTotal?: number; anyCriterionDiverged?: boolean };
