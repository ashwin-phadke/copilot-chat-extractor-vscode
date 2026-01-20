# Copilot Chat Extractor

> 🚀 Export, search, and backup your GitHub Copilot chat history directly from VS Code!

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

This extension was created using Claude Opus 4.5.

## Features

✨ **Export Chat Sessions** - Save your Copilot conversations to Markdown, JSON, or HTML

🔍 **Search History** - Find any conversation with real-time search

📁 **Sidebar View** - Browse all your chat sessions organized by workspace

📦 **Bulk Export** - Export all sessions or recent sessions at once

🎨 **Multiple Formats** - Choose from Markdown, JSON, or beautiful HTML exports

## Quick Start

1. Install the extension
2. Click the chat icon (💬) in the Activity Bar
3. Browse your Copilot chat history
4. Right-click to export or use the command palette

## Commands

Access via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `Copilot Chat Extractor: Show Copilot Chat History` | Open the chat history sidebar |
| `Copilot Chat Extractor: Export Chat Session` | Export a single session |
| `Copilot Chat Extractor: Export All Chat Sessions` | Export all sessions |
| `Copilot Chat Extractor: Export Recent Sessions` | Export N most recent sessions |
| `Copilot Chat Extractor: Search Chat History` | Search through all conversations |
| `Copilot Chat Extractor: Refresh Chat List` | Refresh the session list |

## Sidebar

The extension adds a **Copilot Chat History** view to the Activity Bar:

- 📂 **Grouped by Workspace** - Sessions are organized by project
- 🖱️ **Click to Preview** - View any session in a beautiful preview panel
- 📤 **Right-click to Export** - Export individual sessions quickly
- 🔄 **Refresh Button** - Update the list with new sessions

## Export Formats

### Markdown (.md)
Clean, readable format perfect for documentation:
```markdown
# How to implement binary search

## Metadata
- **Session ID**: `abc123`
- **Workspace**: my-project
- **Messages**: 4

## Conversation

### 👤 User
How do I implement binary search in Python?

### 🤖 Copilot
Here's a simple implementation...
```

### JSON (.json)
Structured data for programmatic processing:
```json
{
  "sessionId": "abc123",
  "title": "Binary search implementation",
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

### HTML (.html)
Beautiful web-viewable format with dark/light mode support.

## Settings

Configure the extension in VS Code settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `copilotChatExtractor.defaultExportFormat` | `markdown` | Default export format |
| `copilotChatExtractor.defaultOutputDirectory` | (Desktop) | Where to save exports |
| `copilotChatExtractor.includeDetailedInfo` | `false` | Include tool calls in exports |
| `copilotChatExtractor.maxSessionsInView` | `100` | Max sessions shown in sidebar |

## Where Are Chats Stored?

GitHub Copilot stores chat sessions locally in VS Code's workspace storage:

| Platform | Location |
|----------|----------|
| **Windows** | `%APPDATA%\Code\User\workspaceStorage\<hash>\chatSessions\` |
| **macOS** | `~/Library/Application Support/Code/User/workspaceStorage\<hash>\chatSessions\` |
| **Linux** | `~/.config/Code/User/workspaceStorage/<hash>/chatSessions/` |

The extension automatically finds and reads these files.

## Supported Editors

- VS Code (stable)
- VS Code Insiders
- VSCodium


## Troubleshooting

### No chat sessions found?
- Make sure you've used GitHub Copilot Chat at least once
- Try clicking the Refresh button in the sidebar
- Check that you have the GitHub Copilot extension installed

### Sessions not updating?
- Click the Refresh button to rescan for new sessions
- Some sessions may appear after restarting VS Code

### Export failed?
- Make sure you have write permissions to the output directory
- Try selecting a different directory

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Note**: This extension is not affiliated with GitHub or Microsoft. It simply reads the local chat history files stored by VS Code.

## Changelog

### 1.0.0
- Initial release
- Export to Markdown, JSON, HTML
- Search functionality
- Sidebar tree view
- Multi-workspace support
