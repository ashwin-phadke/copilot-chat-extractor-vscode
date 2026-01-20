/**
 * Tree view provider for displaying chat sessions in the sidebar
 */

import * as vscode from 'vscode';
import { ChatSession } from './types';
import { getAllSessions } from './chatExtractor';

export class ChatSessionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly session: ChatSession,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(session.title, collapsibleState);

        this.tooltip = this.buildTooltip();
        this.description = this.buildDescription();
        this.contextValue = 'chatSession';
        this.iconPath = new vscode.ThemeIcon('comment-discussion');

        // Command to open session when clicked
        this.command = {
            command: 'copilotChatExtractor.openSession',
            title: 'Open Chat Session',
            arguments: [session]
        };
    }

    private buildTooltip(): string {
        const lines = [
            `📝 ${this.session.title}`,
            `📁 ${this.session.workspaceName}`,
            `💬 ${this.session.messages.length} messages`
        ];

        if (this.session.model) {
            lines.push(`🤖 ${this.session.model}`);
        }

        if (this.session.modifiedAt) {
            const date = new Date(this.session.modifiedAt);
            lines.push(`📅 ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        }

        return lines.join('\n');
    }

    private buildDescription(): string {
        const parts: string[] = [];

        // Message count
        parts.push(`${this.session.messages.length} msgs`);

        // Date
        if (this.session.modifiedAt) {
            const date = new Date(this.session.modifiedAt);
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                parts.push('Today');
            } else if (diffDays === 1) {
                parts.push('Yesterday');
            } else if (diffDays < 7) {
                parts.push(`${diffDays}d ago`);
            } else {
                parts.push(date.toLocaleDateString());
            }
        }

        return parts.join(' • ');
    }
}

export class WorkspaceTreeItem extends vscode.TreeItem {
    constructor(
        public readonly workspaceName: string,
        public readonly sessions: ChatSession[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(workspaceName, collapsibleState);

        this.tooltip = `${sessions.length} chat session(s)`;
        this.description = `${sessions.length} sessions`;
        this.contextValue = 'workspace';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

export class ChatSessionTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = 
        new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    private sessions: ChatSession[] = [];
    private groupByWorkspace: boolean = true;

    constructor() {
        this.refresh();
    }

    refresh(): void {
        this.sessions = getAllSessions();
        this._onDidChangeTreeData.fire();
    }

    getSessions(): ChatSession[] {
        return this.sessions;
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            // Root level
            if (this.sessions.length === 0) {
                return Promise.resolve([]);
            }

            const config = vscode.workspace.getConfiguration('copilotChatExtractor');
            const maxSessions = config.get<number>('maxSessionsInView', 100);

            if (this.groupByWorkspace) {
                // Group by workspace
                const workspaceMap = new Map<string, ChatSession[]>();

                for (const session of this.sessions.slice(0, maxSessions)) {
                    const key = session.workspaceName;
                    if (!workspaceMap.has(key)) {
                        workspaceMap.set(key, []);
                    }
                    workspaceMap.get(key)!.push(session);
                }

                // Sort workspaces by most recent session
                const workspaces = Array.from(workspaceMap.entries())
                    .sort((a, b) => {
                        const aLatest = Math.max(...a[1].map(s => s.modifiedAt || 0));
                        const bLatest = Math.max(...b[1].map(s => s.modifiedAt || 0));
                        return bLatest - aLatest;
                    });

                return Promise.resolve(
                    workspaces.map(([name, sessions]) => 
                        new WorkspaceTreeItem(name, sessions, vscode.TreeItemCollapsibleState.Collapsed)
                    )
                );
            } else {
                // Flat list
                return Promise.resolve(
                    this.sessions.slice(0, maxSessions).map(session =>
                        new ChatSessionTreeItem(session, vscode.TreeItemCollapsibleState.None)
                    )
                );
            }
        }

        if (element instanceof WorkspaceTreeItem) {
            // Children of workspace
            return Promise.resolve(
                element.sessions.map(session =>
                    new ChatSessionTreeItem(session, vscode.TreeItemCollapsibleState.None)
                )
            );
        }

        return Promise.resolve([]);
    }

    toggleGroupByWorkspace(): void {
        this.groupByWorkspace = !this.groupByWorkspace;
        this._onDidChangeTreeData.fire();
    }
}
