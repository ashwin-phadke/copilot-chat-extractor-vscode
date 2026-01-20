/**
 * Copilot Chat Extractor - VS Code Extension
 * 
 * Export, search, and backup your GitHub Copilot chat history
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ChatSession, ExportOptions } from './types';
import { getAllSessions, searchSessions, discoverWorkspaces } from './chatExtractor';
import { formatSession, generateFilename, formatAsMarkdown } from './formatters';
import { ChatSessionTreeProvider, ChatSessionTreeItem } from './chatTreeView';

let treeProvider: ChatSessionTreeProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Copilot Chat Extractor is now active');

    // Create tree view provider
    treeProvider = new ChatSessionTreeProvider();

    // Register tree view
    const treeView = vscode.window.createTreeView('copilotChatSessions', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('copilotChatExtractor.showChats', showChatsCommand),
        vscode.commands.registerCommand('copilotChatExtractor.refresh', refreshCommand),
        vscode.commands.registerCommand('copilotChatExtractor.exportSession', exportSessionCommand),
        vscode.commands.registerCommand('copilotChatExtractor.exportAll', exportAllCommand),
        vscode.commands.registerCommand('copilotChatExtractor.exportRecent', exportRecentCommand),
        vscode.commands.registerCommand('copilotChatExtractor.searchChats', searchChatsCommand),
        vscode.commands.registerCommand('copilotChatExtractor.openSession', openSessionCommand)
    );

    // Show notification on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome');
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Copilot Chat Extractor is ready! Click the chat icon in the sidebar to view your chat history.',
            'Show Chat History'
        ).then(selection => {
            if (selection === 'Show Chat History') {
                vscode.commands.executeCommand('copilotChatSessions.focus');
            }
        });
        context.globalState.update('hasShownWelcome', true);
    }
}

export function deactivate() {
    console.log('Copilot Chat Extractor is now deactivated');
}

/**
 * Show the chat history panel
 */
async function showChatsCommand() {
    vscode.commands.executeCommand('copilotChatSessions.focus');
}

/**
 * Refresh the chat list
 */
async function refreshCommand() {
    treeProvider.refresh();
    vscode.window.showInformationMessage(`Found ${treeProvider.getSessions().length} chat session(s)`);
}

/**
 * Get export options from user
 */
async function getExportOptions(): Promise<ExportOptions | undefined> {
    const config = vscode.workspace.getConfiguration('copilotChatExtractor');

    // Get format
    const format = await vscode.window.showQuickPick(
        [
            { label: 'Markdown', description: 'Clean, readable format (.md)', value: 'markdown' },
            { label: 'JSON', description: 'Structured data for processing (.json)', value: 'json' },
            { label: 'HTML', description: 'Beautiful web-viewable format (.html)', value: 'html' }
        ],
        {
            placeHolder: 'Select export format',
            title: 'Export Format'
        }
    );

    if (!format) return undefined;

    // Get detailed option
    const detailed = await vscode.window.showQuickPick(
        [
            { label: 'Standard', description: 'Messages only', value: false },
            { label: 'Detailed', description: 'Include tool calls, metadata, etc.', value: true }
        ],
        {
            placeHolder: 'Select detail level',
            title: 'Export Detail Level'
        }
    );

    if (detailed === undefined) return undefined;

    return {
        format: format.value as 'markdown' | 'json' | 'html',
        detailed: detailed.value
    };
}

/**
 * Get the output directory
 */
async function getOutputDirectory(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('copilotChatExtractor');
    let defaultDir = config.get<string>('defaultOutputDirectory');

    if (!defaultDir) {
        // Default to Desktop/Copilot Chat Exports
        const desktop = path.join(os.homedir(), 'Desktop');
        const documents = path.join(os.homedir(), 'Documents');

        if (fs.existsSync(desktop)) {
            defaultDir = path.join(desktop, 'Copilot Chat Exports');
        } else if (fs.existsSync(documents)) {
            defaultDir = path.join(documents, 'Copilot Chat Exports');
        } else {
            defaultDir = path.join(os.homedir(), 'Copilot Chat Exports');
        }
    }

    const result = await vscode.window.showInputBox({
        prompt: 'Export directory',
        value: defaultDir,
        validateInput: (value) => {
            if (!value.trim()) return 'Please enter a directory path';
            return undefined;
        }
    });

    return result;
}

/**
 * Export a single session
 */
async function exportSessionCommand(item?: ChatSessionTreeItem | ChatSession) {
    let session: ChatSession;

    if (item instanceof ChatSessionTreeItem) {
        session = item.session;
    } else if (item && 'sessionId' in item) {
        session = item;
    } else {
        // Show quick pick to select session
        const sessions = treeProvider.getSessions();
        if (sessions.length === 0) {
            vscode.window.showWarningMessage('No chat sessions found.');
            return;
        }

        const selected = await vscode.window.showQuickPick(
            sessions.map(s => ({
                label: s.title,
                description: `${s.messages.length} messages • ${s.workspaceName}`,
                session: s
            })),
            {
                placeHolder: 'Select a chat session to export',
                title: 'Export Chat Session'
            }
        );

        if (!selected) return;
        session = selected.session;
    }

    const options = await getExportOptions();
    if (!options) return;

    const outputDir = await getOutputDirectory();
    if (!outputDir) return;

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename and export
    const filename = generateFilename(session, options.format);
    const filepath = path.join(outputDir, filename);

    try {
        const content = formatSession(session, options);
        fs.writeFileSync(filepath, content, 'utf-8');

        const action = await vscode.window.showInformationMessage(
            `Exported: ${filename}`,
            'Open File',
            'Open Folder'
        );

        if (action === 'Open File') {
            const doc = await vscode.workspace.openTextDocument(filepath);
            await vscode.window.showTextDocument(doc);
        } else if (action === 'Open Folder') {
            vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filepath));
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
}

/**
 * Export all sessions
 */
async function exportAllCommand() {
    const sessions = treeProvider.getSessions();

    if (sessions.length === 0) {
        vscode.window.showWarningMessage('No chat sessions found.');
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        `Export all ${sessions.length} chat sessions?`,
        { modal: true },
        'Export All'
    );

    if (confirm !== 'Export All') return;

    const options = await getExportOptions();
    if (!options) return;

    const outputDir = await getOutputDirectory();
    if (!outputDir) return;

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Export with progress
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Exporting chat sessions',
            cancellable: true
        },
        async (progress, token) => {
            let exported = 0;
            let failed = 0;

            for (let i = 0; i < sessions.length; i++) {
                if (token.isCancellationRequested) break;

                const session = sessions[i];
                progress.report({
                    message: `${i + 1}/${sessions.length}: ${session.title.substring(0, 30)}...`,
                    increment: (100 / sessions.length)
                });

                try {
                    const filename = generateFilename(session, options.format);
                    const filepath = path.join(outputDir, filename);
                    const content = formatSession(session, options);
                    fs.writeFileSync(filepath, content, 'utf-8');
                    exported++;
                } catch (error) {
                    console.error(`Failed to export ${session.sessionId}:`, error);
                    failed++;
                }
            }

            const message = failed > 0
                ? `Exported ${exported} sessions (${failed} failed)`
                : `Exported ${exported} sessions`;

            const action = await vscode.window.showInformationMessage(
                message,
                'Open Folder'
            );

            if (action === 'Open Folder') {
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputDir));
            }
        }
    );
}

/**
 * Export recent sessions
 */
async function exportRecentCommand() {
    const sessions = treeProvider.getSessions();

    if (sessions.length === 0) {
        vscode.window.showWarningMessage('No chat sessions found.');
        return;
    }

    const countInput = await vscode.window.showInputBox({
        prompt: 'How many recent sessions to export?',
        value: '5',
        validateInput: (value) => {
            const num = parseInt(value);
            if (isNaN(num) || num < 1) return 'Please enter a positive number';
            if (num > sessions.length) return `Only ${sessions.length} sessions available`;
            return undefined;
        }
    });

    if (!countInput) return;
    const count = parseInt(countInput);

    const sessionsToExport = sessions.slice(0, count);

    const options = await getExportOptions();
    if (!options) return;

    const outputDir = await getOutputDirectory();
    if (!outputDir) return;

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let exported = 0;
    for (const session of sessionsToExport) {
        try {
            const filename = generateFilename(session, options.format);
            const filepath = path.join(outputDir, filename);
            const content = formatSession(session, options);
            fs.writeFileSync(filepath, content, 'utf-8');
            exported++;
        } catch (error) {
            console.error(`Failed to export ${session.sessionId}:`, error);
        }
    }

    const action = await vscode.window.showInformationMessage(
        `Exported ${exported} recent sessions`,
        'Open Folder'
    );

    if (action === 'Open Folder') {
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputDir));
    }
}

/**
 * Search chat history
 */
async function searchChatsCommand() {
    const sessions = treeProvider.getSessions();

    if (sessions.length === 0) {
        vscode.window.showWarningMessage('No chat sessions found.');
        return;
    }

    const query = await vscode.window.showInputBox({
        prompt: 'Search your Copilot chat history',
        placeHolder: 'Enter search query...'
    });

    if (!query) return;

    const results = searchSessions(sessions, query);

    if (results.length === 0) {
        vscode.window.showInformationMessage(`No results found for "${query}"`);
        return;
    }

    // Show results in quick pick
    const selected = await vscode.window.showQuickPick(
        results.map(r => ({
            label: r.session.title,
            description: `${r.matches.length} match(es) • ${r.session.workspaceName}`,
            detail: r.matches.length > 0
                ? r.matches[0].content.substring(0, 100).replace(/\n/g, ' ') + '...'
                : undefined,
            session: r.session
        })),
        {
            placeHolder: `${results.length} session(s) found for "${query}"`,
            title: 'Search Results',
            matchOnDescription: true,
            matchOnDetail: true
        }
    );

    if (selected) {
        openSessionCommand(selected.session);
    }
}

/**
 * Open a session in a preview panel
 */
async function openSessionCommand(session: ChatSession) {
    // Create a webview panel to display the session
    const panel = vscode.window.createWebviewPanel(
        'copilotChatSession',
        session.title,
        vscode.ViewColumn.One,
        {
            enableScripts: false,
            retainContextWhenHidden: true
        }
    );

    // Generate HTML content
    const config = vscode.workspace.getConfiguration('copilotChatExtractor');
    const detailed = config.get<boolean>('includeDetailedInfo', false);

    // Use the HTML formatter for the webview
    const content = formatSession(session, { format: 'html', detailed });
    panel.webview.html = content;
}
