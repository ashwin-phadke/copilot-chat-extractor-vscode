/**
 * Core chat extraction logic for GitHub Copilot Chat
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ChatSession, ChatMessage, WorkspaceInfo, VSCodeVariantConfig } from './types';

// VS Code variant configurations
const VSCODE_VARIANTS: Record<string, VSCodeVariantConfig> = {
    code: {
        name: 'VS Code',
        linux: '.config/Code/User/workspaceStorage',
        darwin: 'Library/Application Support/Code/User/workspaceStorage',
        windows: 'Code/User/workspaceStorage'
    },
    'code-insiders': {
        name: 'VS Code Insiders',
        linux: '.config/Code - Insiders/User/workspaceStorage',
        darwin: 'Library/Application Support/Code - Insiders/User/workspaceStorage',
        windows: 'Code - Insiders/User/workspaceStorage'
    },
    codium: {
        name: 'VSCodium',
        linux: '.config/VSCodium/User/workspaceStorage',
        darwin: 'Library/Application Support/VSCodium/User/workspaceStorage',
        windows: 'VSCodium/User/workspaceStorage'
    },
    cursor: {
        name: 'Cursor',
        linux: '.config/Cursor/User/workspaceStorage',
        darwin: 'Library/Application Support/Cursor/User/workspaceStorage',
        windows: 'Cursor/User/workspaceStorage'
    }
};

/**
 * Get all workspace storage paths for all VS Code variants
 */
export function getWorkspaceStoragePaths(): { variant: string; path: string }[] {
    const homeDir = os.homedir();
    const platform = os.platform();
    const paths: { variant: string; path: string }[] = [];

    for (const [variantId, config] of Object.entries(VSCODE_VARIANTS)) {
        let storagePath: string;

        if (platform === 'win32') {
            const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
            storagePath = path.join(appData, config.windows);
        } else if (platform === 'darwin') {
            storagePath = path.join(homeDir, config.darwin);
        } else {
            storagePath = path.join(homeDir, config.linux);
        }

        if (fs.existsSync(storagePath)) {
            paths.push({ variant: config.name, path: storagePath });
        }
    }

    return paths;
}

/**
 * Discover all workspaces with chat data
 */
export function discoverWorkspaces(): WorkspaceInfo[] {
    const workspaces: WorkspaceInfo[] = [];
    const storagePaths = getWorkspaceStoragePaths();

    for (const { variant, path: storagePath } of storagePaths) {
        try {
            const entries = fs.readdirSync(storagePath, { withFileTypes: true });

            for (const entry of entries) {
                if (!entry.isDirectory()) continue;

                const workspacePath = path.join(storagePath, entry.name);
                const chatSessionsDir = path.join(workspacePath, 'chatSessions');
                const stateDbPath = path.join(workspacePath, 'state.vscdb');

                const hasChats = fs.existsSync(chatSessionsDir);
                const hasStateDb = fs.existsSync(stateDbPath);

                if (hasChats || hasStateDb) {
                    const workspace: WorkspaceInfo = {
                        workspaceId: entry.name,
                        storagePath: workspacePath,
                        chatSessionFiles: [],
                        hasStateDb
                    };

                    // Get project path from workspace.json
                    const workspaceJsonPath = path.join(workspacePath, 'workspace.json');
                    if (fs.existsSync(workspaceJsonPath)) {
                        try {
                            const wsData = JSON.parse(fs.readFileSync(workspaceJsonPath, 'utf-8'));
                            let projectPath = wsData.folder || wsData.workspace;
                            if (projectPath) {
                                if (projectPath.startsWith('file://')) {
                                    projectPath = projectPath.substring(7);
                                }
                                // Handle URL encoding
                                projectPath = decodeURIComponent(projectPath);
                                workspace.projectPath = projectPath;
                                workspace.projectName = path.basename(projectPath);
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }

                    // Get chat session files
                    if (hasChats) {
                        try {
                            const files = fs.readdirSync(chatSessionsDir)
                                .filter(f => f.endsWith('.json'))
                                .map(f => path.join(chatSessionsDir, f));
                            workspace.chatSessionFiles = files;
                        } catch (e) {
                            // Ignore read errors
                        }
                    }

                    workspaces.push(workspace);
                }
            }
        } catch (e) {
            // Ignore errors reading storage path
        }
    }

    return workspaces;
}

/**
 * Extract content from various message formats
 */
function extractContent(data: any): string {
    if (!data) return '';

    if (typeof data === 'string') return data;

    if (Array.isArray(data)) {
        return data.map(item => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object') {
                return item.text || item.value || item.content || '';
            }
            return '';
        }).filter(Boolean).join('\n');
    }

    if (typeof data === 'object') {
        return data.text || data.value || data.content || data.message || '';
    }

    return '';
}

/**
 * Parse a chat message from various formats
 */
function parseMessage(data: any): ChatMessage | null {
    if (!data || typeof data !== 'object') return null;

    let role: ChatMessage['role'] = 'unknown';
    let content = '';

    // Determine role
    const roleValue = data.role || data.type || data.kind || '';
    if (['user', 'human', 'User'].includes(roleValue)) {
        role = 'user';
    } else if (['assistant', 'bot', 'copilot', 'Assistant', 'ai'].includes(roleValue)) {
        role = 'assistant';
    } else if (roleValue === 'system') {
        role = 'system';
    }

    // Extract content
    content = extractContent(data.content) ||
        extractContent(data.text) ||
        extractContent(data.value) ||
        extractContent(data.message);

    if (!content && role === 'unknown') return null;

    return {
        role,
        content,
        timestamp: data.timestamp || data.date,
        toolCalls: data.toolCalls,
        toolResults: data.toolResults,
        rawData: data
    };
}

/**
 * Parse messages from a session data object
 */
function parseMessages(data: any): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // Try different message container keys
    const messageContainers = ['messages', 'history', 'exchanges', 'requests', 'turns', 'chatMessages'];

    for (const key of messageContainers) {
        if (data[key] && Array.isArray(data[key])) {
            for (const item of data[key]) {
                if (!item || typeof item !== 'object') continue;

                // Handle request/response format
                if (item.request || item.message) {
                    const request = item.request || item.message;
                    const userContent = typeof request === 'string' 
                        ? request 
                        : extractContent(request);
                    
                    if (userContent) {
                        messages.push({
                            role: 'user',
                            content: userContent,
                            timestamp: request?.timestamp
                        });
                    }
                }

                if (item.response || item.result) {
                    const response = item.response || item.result;
                    let assistantContent = '';

                    if (typeof response === 'string') {
                        assistantContent = response;
                    } else if (Array.isArray(response)) {
                        assistantContent = response.map(r => 
                            typeof r === 'string' ? r : extractContent(r)
                        ).filter(Boolean).join('\n');
                    } else {
                        assistantContent = extractContent(response);
                    }

                    if (assistantContent) {
                        messages.push({
                            role: 'assistant',
                            content: assistantContent,
                            timestamp: response?.timestamp
                        });
                    }
                }

                // Handle standard message format
                if (!item.request && !item.response && !item.message && !item.result) {
                    const msg = parseMessage(item);
                    if (msg && msg.content) {
                        messages.push(msg);
                    }
                }
            }

            if (messages.length > 0) break;
        }
    }

    return messages;
}

/**
 * Parse a chat session from a JSON file
 */
export function parseSessionFromFile(filePath: string, workspace: WorkspaceInfo): ChatSession | null {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        const messages = parseMessages(data);

        // Generate title from first user message if not present
        let title = data.title || data.name || data.sessionTitle || data.customTitle;
        if (!title && messages.length > 0) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                title = firstUserMsg.content.substring(0, 60);
                if (firstUserMsg.content.length > 60) title += '...';
            }
        }

        const stat = fs.statSync(filePath);

        const session: ChatSession = {
            sessionId: path.basename(filePath, '.json'),
            title: title || `Chat ${path.basename(filePath, '.json').substring(0, 8)}...`,
            messages,
            workspaceId: workspace.workspaceId,
            workspaceName: workspace.projectName || `Workspace ${workspace.workspaceId.substring(0, 8)}...`,
            projectPath: workspace.projectPath,
            createdAt: data.createdAt || data.created || data.timestamp || data.creationDate,
            modifiedAt: stat.mtimeMs,
            model: data.model || data.languageModel || data.modelId,
            agentMode: data.agentMode || data.mode || data.agent,
            source: 'json',
            filePath
        };

        return session;
    } catch (e) {
        console.error(`Error parsing session file ${filePath}:`, e);
        return null;
    }
}

/**
 * Extract sessions from SQLite database
 */
export function extractSessionsFromSqlite(workspace: WorkspaceInfo): ChatSession[] {
    const sessions: ChatSession[] = [];
    const dbPath = path.join(workspace.storagePath, 'state.vscdb');

    if (!fs.existsSync(dbPath)) return sessions;

    try {
        // Use native SQLite if available, otherwise skip
        // Note: In a real extension, you'd use better-sqlite3 or similar
        const Database = require('better-sqlite3');
        const db = new Database(dbPath, { readonly: true });

        const rows = db.prepare(`
            SELECT key, value FROM ItemTable 
            WHERE key LIKE '%chat%' 
               OR key LIKE '%interactive%'
               OR key LIKE '%copilot%'
               OR key LIKE '%session%'
        `).all();

        for (const row of rows) {
            try {
                const data = JSON.parse(row.value);
                processDbEntry(data, workspace, sessions);
            } catch (e) {
                // Ignore parse errors
            }
        }

        db.close();
    } catch (e) {
        // SQLite not available or error reading - that's ok
        console.log('SQLite extraction not available:', e);
    }

    return sessions;
}

function processDbEntry(data: any, workspace: WorkspaceInfo, sessions: ChatSession[]): void {
    if (!data) return;

    if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            if (typeof data[i] === 'object') {
                const messages = parseMessages(data[i]);
                if (messages.length > 0) {
                    sessions.push(createSessionFromData(data[i], messages, workspace, `db_${i}`));
                }
            }
        }
    } else if (typeof data === 'object') {
        if (data.sessions) {
            if (typeof data.sessions === 'object' && !Array.isArray(data.sessions)) {
                for (const [sid, sdata] of Object.entries(data.sessions)) {
                    if (typeof sdata === 'object') {
                        const messages = parseMessages(sdata);
                        if (messages.length > 0) {
                            sessions.push(createSessionFromData(sdata as any, messages, workspace, sid));
                        }
                    }
                }
            }
        } else {
            const messages = parseMessages(data);
            if (messages.length > 0) {
                sessions.push(createSessionFromData(data, messages, workspace, `db_${Date.now()}`));
            }
        }
    }
}

function createSessionFromData(data: any, messages: ChatMessage[], workspace: WorkspaceInfo, sessionId: string): ChatSession {
    let title = data.title || data.name || data.sessionTitle;
    if (!title && messages.length > 0) {
        const firstUserMsg = messages.find(m => m.role === 'user');
        if (firstUserMsg) {
            title = firstUserMsg.content.substring(0, 60);
            if (firstUserMsg.content.length > 60) title += '...';
        }
    }

    return {
        sessionId: data.sessionId || sessionId,
        title: title || `Chat ${sessionId.substring(0, 8)}...`,
        messages,
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.projectName || `Workspace ${workspace.workspaceId.substring(0, 8)}...`,
        projectPath: workspace.projectPath,
        createdAt: data.createdAt || data.created,
        modifiedAt: Date.now(),
        model: data.model || data.languageModel,
        agentMode: data.agentMode || data.mode,
        source: 'sqlite'
    };
}

/**
 * Get all chat sessions from all workspaces
 */
export function getAllSessions(): ChatSession[] {
    const workspaces = discoverWorkspaces();
    const sessions: ChatSession[] = [];
    const seenIds = new Set<string>();

    for (const workspace of workspaces) {
        // Parse JSON files
        for (const filePath of workspace.chatSessionFiles) {
            const session = parseSessionFromFile(filePath, workspace);
            if (session && session.messages.length > 0 && !seenIds.has(session.sessionId)) {
                sessions.push(session);
                seenIds.add(session.sessionId);
            }
        }

        // Try SQLite extraction
        const sqliteSessions = extractSessionsFromSqlite(workspace);
        for (const session of sqliteSessions) {
            if (!seenIds.has(session.sessionId)) {
                sessions.push(session);
                seenIds.add(session.sessionId);
            }
        }
    }

    // Sort by modification time (newest first)
    sessions.sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0));

    return sessions;
}

/**
 * Search sessions for a query
 */
export function searchSessions(sessions: ChatSession[], query: string): { session: ChatSession; matches: ChatMessage[] }[] {
    const results: { session: ChatSession; matches: ChatMessage[] }[] = [];
    const lowerQuery = query.toLowerCase();

    for (const session of sessions) {
        const matches: ChatMessage[] = [];

        // Check title
        const titleMatch = session.title.toLowerCase().includes(lowerQuery);

        // Check messages
        for (const msg of session.messages) {
            if (msg.content.toLowerCase().includes(lowerQuery)) {
                matches.push(msg);
            }
        }

        if (titleMatch || matches.length > 0) {
            results.push({ session, matches });
        }
    }

    return results;
}
