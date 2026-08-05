import type { Message } from './message.type.js'

export interface ParseResult {
  messages: Message[]
  rest: Buffer
}
