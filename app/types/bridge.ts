export type BridgeEvent =
  | { type: 'text-delta'; content: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: any }
  | { type: 'tool-result'; toolCallId: string; result: any }
  | { type: 'error'; error: string }
  | { type: 'finish'; result?: any };
