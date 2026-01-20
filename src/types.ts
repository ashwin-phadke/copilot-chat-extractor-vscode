/**
 * TypeScript interfaces for Copilot Chat Extractor
 */

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'unknown';
    content: string;
    timestamp?: number | string;
    toolCalls?: any[];
    toolResults?: any[];
    rawData?: any;
}

export interface ChatSession {
    sessionId: string;
    title: string;
    messages: ChatMessage[];
    workspaceId: string;
    workspaceName: string;
    projectPath?: string;
    createdAt?: number | string;
    modifiedAt?: number;
    model?: string;
    agentMode?: string;
    source: 'json' | 'sqlite';
    filePath?: string;
}

export interface WorkspaceInfo {
    workspaceId: string;
    storagePath: string;
    projectPath?: string;
    projectName?: string;
    chatSessionFiles: string[];
    hasStateDb: boolean;
}

export interface ExportOptions {
    format: 'markdown' | 'json' | 'html';
    detailed: boolean;
    outputPath?: string;
}

export interface SearchResult {
    session: ChatSession;
    matchingMessages: ChatMessage[];
    matchCount: number;
}

export type VSCodeVariant = 'code' | 'code-insiders' | 'codium' | 'cursor';

export interface VSCodeVariantConfig {
    name: string;
    linux: string;
    darwin: string;
    windows: string;
}
