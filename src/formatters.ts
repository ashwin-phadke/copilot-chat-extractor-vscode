/**
 * Export formatters for chat sessions
 */

import { ChatSession, ChatMessage, ExportOptions } from './types';

/**
 * Format a timestamp for display
 */
function formatTimestamp(ts: number | string | undefined): string {
    if (!ts) return 'Unknown';

    try {
        let date: Date;
        if (typeof ts === 'number') {
            // Handle milliseconds vs seconds
            if (ts > 1e12) {
                date = new Date(ts);
            } else {
                date = new Date(ts * 1000);
            }
        } else {
            date = new Date(ts);
        }
        return date.toLocaleString();
    } catch (e) {
        return String(ts);
    }
}

/**
 * Format a date for filenames
 */
export function formatDateForFilename(ts: number | string | undefined): string {
    if (!ts) return 'unknown';

    try {
        let date: Date;
        if (typeof ts === 'number') {
            if (ts > 1e12) {
                date = new Date(ts);
            } else {
                date = new Date(ts * 1000);
            }
        } else {
            date = new Date(ts);
        }
        return date.toISOString().split('T')[0];
    } catch (e) {
        return 'unknown';
    }
}

/**
 * Sanitize a string for use in filenames
 */
export function sanitizeFilename(name: string, maxLength: number = 50): string {
    let sanitized = name
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .trim()
        .replace(/^_+|_+$/g, '');

    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength).replace(/_+$/, '');
    }

    return sanitized || 'untitled';
}

/**
 * Generate a filename for an exported session
 */
export function generateFilename(session: ChatSession, format: string): string {
    const date = formatDateForFilename(session.modifiedAt || session.createdAt);
    const title = sanitizeFilename(session.title);
    const shortId = session.sessionId.substring(0, 8);
    const ext = format === 'markdown' ? 'md' : format;

    return `copilot-chat-${date}-${title}-${shortId}.${ext}`;
}

/**
 * Format session as Markdown
 */
export function formatAsMarkdown(session: ChatSession, detailed: boolean = false): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${session.title}`);
    lines.push('');

    // Metadata
    lines.push('## Metadata');
    lines.push('');
    lines.push(`- **Session ID**: \`${session.sessionId}\``);
    lines.push(`- **Workspace**: ${session.workspaceName}`);
    if (session.projectPath) {
        lines.push(`- **Project Path**: \`${session.projectPath}\``);
    }
    if (session.createdAt) {
        lines.push(`- **Created**: ${formatTimestamp(session.createdAt)}`);
    }
    if (session.modifiedAt) {
        lines.push(`- **Modified**: ${formatTimestamp(session.modifiedAt)}`);
    }
    if (session.model) {
        lines.push(`- **Model**: ${session.model}`);
    }
    if (session.agentMode) {
        lines.push(`- **Agent Mode**: ${session.agentMode}`);
    }
    lines.push(`- **Messages**: ${session.messages.length}`);
    lines.push('');

    // Conversation
    lines.push('## Conversation');
    lines.push('');

    for (const msg of session.messages) {
        if (msg.role === 'user') {
            lines.push('### 👤 User');
        } else if (msg.role === 'assistant') {
            lines.push('### 🤖 Copilot');
        } else {
            lines.push(`### 📝 ${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}`);
        }

        if (msg.timestamp) {
            lines.push(`*${formatTimestamp(msg.timestamp)}*`);
        }

        lines.push('');
        lines.push(msg.content);

        if (detailed) {
            if (msg.toolCalls && msg.toolCalls.length > 0) {
                lines.push('');
                lines.push('**Tool Calls:**');
                for (const tc of msg.toolCalls) {
                    if (typeof tc === 'object') {
                        lines.push(`- \`${tc.name || 'unknown'}\`: ${JSON.stringify(tc.arguments || {}).substring(0, 200)}`);
                    }
                }
            }

            if (msg.toolResults && msg.toolResults.length > 0) {
                lines.push('');
                lines.push('**Tool Results:**');
                for (const tr of msg.toolResults) {
                    if (typeof tr === 'object') {
                        lines.push(`- \`${tr.name || 'unknown'}\`: ${String(tr.result || '').substring(0, 200)}`);
                    }
                }
            }
        }

        lines.push('');
        lines.push('---');
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Format session as JSON
 */
export function formatAsJson(session: ChatSession, detailed: boolean = false): string {
    const data: any = {
        sessionId: session.sessionId,
        title: session.title,
        workspace: {
            id: session.workspaceId,
            name: session.workspaceName,
            projectPath: session.projectPath
        },
        metadata: {
            createdAt: session.createdAt ? formatTimestamp(session.createdAt) : null,
            modifiedAt: session.modifiedAt ? formatTimestamp(session.modifiedAt) : null,
            model: session.model,
            agentMode: session.agentMode,
            messageCount: session.messages.length
        },
        messages: session.messages.map(msg => {
            const msgData: any = {
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp ? formatTimestamp(msg.timestamp) : null
            };

            if (detailed) {
                if (msg.toolCalls) msgData.toolCalls = msg.toolCalls;
                if (msg.toolResults) msgData.toolResults = msg.toolResults;
                if (msg.rawData) msgData.rawData = msg.rawData;
            }

            return msgData;
        })
    };

    return JSON.stringify(data, null, 2);
}

/**
 * Format session as HTML
 */
export function formatAsHtml(session: ChatSession, detailed: boolean = false): string {
    const escapeHtml = (text: string) => {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(session.title)}</title>
    <style>
        :root {
            --bg-primary: #1e1e1e;
            --bg-secondary: #252526;
            --bg-user: #2d2d30;
            --bg-assistant: #1e3a5f;
            --text-primary: #d4d4d4;
            --text-secondary: #858585;
            --accent: #0e639c;
            --border: #3c3c3c;
        }
        
        @media (prefers-color-scheme: light) {
            :root {
                --bg-primary: #ffffff;
                --bg-secondary: #f3f3f3;
                --bg-user: #e8e8e8;
                --bg-assistant: #e3f2fd;
                --text-primary: #1e1e1e;
                --text-secondary: #666666;
                --accent: #0066b8;
                --border: #d4d4d4;
            }
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
        }
        
        h1 {
            border-bottom: 2px solid var(--accent);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        
        .metadata {
            background-color: var(--bg-secondary);
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            font-size: 0.9em;
        }
        
        .metadata dt { color: var(--text-secondary); display: inline; }
        .metadata dd { display: inline; margin-left: 5px; margin-right: 20px; }
        
        .conversation { display: flex; flex-direction: column; gap: 15px; }
        
        .message {
            padding: 15px 20px;
            border-radius: 8px;
            position: relative;
        }
        
        .message-user {
            background-color: var(--bg-user);
            border-left: 4px solid #4ec9b0;
        }
        
        .message-assistant {
            background-color: var(--bg-assistant);
            border-left: 4px solid var(--accent);
        }
        
        .message-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .message-time {
            color: var(--text-secondary);
            font-size: 0.85em;
            font-weight: normal;
        }
        
        .message-content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        code {
            background-color: rgba(0,0,0,0.2);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Fira Code', 'Consolas', monospace;
        }
        
        pre {
            background-color: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 10px 0;
        }
        
        pre code { background: none; padding: 0; }
        
        .tool-info {
            margin-top: 15px;
            padding: 10px;
            background-color: rgba(0,0,0,0.1);
            border-radius: 4px;
            font-size: 0.85em;
        }
        
        .tool-info h4 { color: var(--text-secondary); margin-bottom: 5px; }
    </style>
</head>
<body>
    <h1>🤖 ${escapeHtml(session.title)}</h1>
    
    <dl class="metadata">
        <dt>Session ID:</dt><dd><code>${session.sessionId}</code></dd>
        <dt>Workspace:</dt><dd>${escapeHtml(session.workspaceName)}</dd>`;

    if (session.createdAt) {
        html += `\n        <dt>Created:</dt><dd>${formatTimestamp(session.createdAt)}</dd>`;
    }
    if (session.model) {
        html += `\n        <dt>Model:</dt><dd>${escapeHtml(session.model)}</dd>`;
    }

    html += `
        <dt>Messages:</dt><dd>${session.messages.length}</dd>
    </dl>
    
    <div class="conversation">`;

    for (const msg of session.messages) {
        const roleClass = msg.role === 'user' ? 'user' : 'assistant';
        const roleIcon = msg.role === 'user' ? '👤' : '🤖';
        const roleName = msg.role === 'user' ? 'User' : 'Copilot';

        html += `
        <div class="message message-${roleClass}">
            <div class="message-header">
                <span>${roleIcon} ${roleName}</span>`;

        if (msg.timestamp) {
            html += `
                <span class="message-time">${formatTimestamp(msg.timestamp)}</span>`;
        }

        html += `
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>`;

        if (detailed && (msg.toolCalls?.length || msg.toolResults?.length)) {
            html += `
            <div class="tool-info">`;
            if (msg.toolCalls?.length) {
                html += `
                <h4>Tool Calls:</h4>
                <pre><code>${escapeHtml(JSON.stringify(msg.toolCalls, null, 2))}</code></pre>`;
            }
            if (msg.toolResults?.length) {
                html += `
                <h4>Tool Results:</h4>
                <pre><code>${escapeHtml(JSON.stringify(msg.toolResults, null, 2))}</code></pre>`;
            }
            html += `
            </div>`;
        }

        html += `
        </div>`;
    }

    html += `
    </div>
</body>
</html>`;

    return html;
}

/**
 * Format a session based on options
 */
export function formatSession(session: ChatSession, options: ExportOptions): string {
    switch (options.format) {
        case 'json':
            return formatAsJson(session, options.detailed);
        case 'html':
            return formatAsHtml(session, options.detailed);
        case 'markdown':
        default:
            return formatAsMarkdown(session, options.detailed);
    }
}
