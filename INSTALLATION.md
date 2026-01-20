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
