## Install from VSIX File

If you have a packaged `.vsix` file, you can install the extension in VS Code as follows:

1. Open Visual Studio Code.
2. Go to the Extensions view (Ctrl+Shift+X).
3. Click the three-dot menu (⋮) in the top-right corner and select **Install from VSIX...**
4. Browse to your `.vsix` file (e.g., `copilot-chat-extractor-1.0.0.vsix`) and select it.
5. Wait for the installation to complete and reload VS Code if prompted.

Alternatively, you can install from the command line:

```sh
code --install-extension copilot-chat-extractor-1.0.0.vsix
```

Replace the filename with your actual VSIX file name if different.
# Installation Guide

This guide will help you install and set up the Copilot Chat Extractor VS Code extension.

## Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Visual Studio Code](https://code.visualstudio.com/)

## Steps

1. **Clone the Repository**
   ```sh
   git clone <repository-url>
   cd copilot-chat-extractor-vscode
   ```

2. **Install Dependencies**
   ```sh
   npm install
   ```

3. **Build the Extension**
   ```sh
   npm run compile
   ```
   Or, to watch for changes during development:
   ```sh
   npm run watch
   ```

4. **Open in VS Code**
   - Open the project folder in VS Code:
     ```sh
     code .
     ```

5. **Run the Extension**
   - Press `F5` in VS Code to launch an Extension Development Host.

6. **(Optional) Package the Extension**
   - Install `vsce` if you want to package the extension:
     ```sh
     npm install -g vsce
     vsce package
     ```

## Troubleshooting
- Ensure all dependencies are installed.
- If you encounter issues, try running `npm install` again.
- Check the [README.md](README.md) for more details.

---
For more information, see the [official documentation](README.md) or open an issue in the repository.
