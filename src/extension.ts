import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let fastApiProcess: cp.ChildProcess | null = null;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

enum LogLevel {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

class Logger {
    private static formatTimestamp(): string {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour12: false });
    }

    private static formatMessage(level: LogLevel, message: string): string {
        const timestamp = this.formatTimestamp();
        const prefix = this.getPrefixForLevel(level);
        return `[${timestamp}] ${prefix} ${message}`;
    }

    private static getPrefixForLevel(level: LogLevel): string {
        switch (level) {
            case LogLevel.INFO:
                return '[INFO]   ';
            case LogLevel.SUCCESS:
                return '[SUCCESS]';
            case LogLevel.WARNING:
                return '[WARNING]';
            case LogLevel.ERROR:
                return '[ERROR]  ';
            case LogLevel.DEBUG:
                return '[DEBUG]  ';
            default:
                return '[LOG]    ';
        }
    }

    static info(message: string): void {
        const formattedMessage = this.formatMessage(LogLevel.INFO, message);
        outputChannel.appendLine(formattedMessage);
    }

    static success(message: string): void {
        const formattedMessage = this.formatMessage(LogLevel.SUCCESS, message);
        outputChannel.appendLine(formattedMessage);
    }

    static warning(message: string): void {
        const formattedMessage = this.formatMessage(LogLevel.WARNING, message);
        outputChannel.appendLine(formattedMessage);
    }

    static error(message: string): void {
        const formattedMessage = this.formatMessage(LogLevel.ERROR, message);
        outputChannel.appendLine(formattedMessage);
    }

    static debug(message: string): void {
        const formattedMessage = this.formatMessage(LogLevel.DEBUG, message);
        outputChannel.appendLine(formattedMessage);
    }

    static raw(message: string): void {
        outputChannel.append(message);
    }

    static clear(): void {
        outputChannel.clear();
    }

    static show(): void {
        outputChannel.show();
    }
}

export function activate(context: vscode.ExtensionContext) {
    // Create output channel
    outputChannel = vscode.window.createOutputChannel('FastAPI Runner');
    
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = "$(circle-outline) FastAPI: Stopped";
    statusBarItem.tooltip = "FastAPI Server Status";
    statusBarItem.command = 'fastapi-runner.start';
    statusBarItem.show();
    
    // Register commands
    const disposables = [
        vscode.commands.registerCommand('fastapi-runner.start', startFastAPI),
        vscode.commands.registerCommand('fastapi-runner.stop', stopFastAPI),
        vscode.commands.registerCommand('fastapi-runner.restart', restartFastAPI),
        vscode.commands.registerCommand('fastapi-runner.selectFile', selectFastAPIFile),
        vscode.commands.registerCommand('fastapi-runner.createVenv', createVirtualEnvironment),
        vscode.commands.registerCommand('fastapi-runner.installDependencies', installDependencies),
        statusBarItem,
        outputChannel
    ];
    
    context.subscriptions.push(...disposables);
    
    // Auto-detect FastAPI files
    setTimeout(() => {
        try {
            detectFastAPIFiles();
        } catch (error) {
            // Silent fail
        }
    }, 1000);
}

async function startFastAPI() {
    if (fastApiProcess) {
        vscode.window.showWarningMessage('FastAPI server is already running!');
        return;
    }

    const config = vscode.workspace.getConfiguration('fastapi-runner');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found!');
        return;
    }

    try {
        // Get FastAPI file to run
        const fastApiFile = await getFastAPIFile();
        if (!fastApiFile) {
            vscode.window.showErrorMessage('No FastAPI file selected or found!');
            return;
        }

        const host = config.get<string>('host', '127.0.0.1');
        const port = config.get<number>('port', 8000);
        const reload = config.get<boolean>('reload', true);
        const pythonPath = config.get<string>('pythonPath', 'python');
        const uvicornPath = config.get<string>('uvicornPath', 'uvicorn');
        const autoDetectVenv = config.get<boolean>('autoDetectVenv', true);
        const customVenvPath = config.get<string>('venvPath', '');
        const useModuleMode = config.get<boolean>('useModuleMode', true);
        const workingDirectory = config.get<string>('workingDirectory', '');

        // Detect virtual environment
        let venvInfo: VirtualEnvironmentInfo = {
            venvPath: null,
            pythonPath: null,
            uvicornPath: null
        };

        if (autoDetectVenv) {
            if (customVenvPath) {
                // Use custom virtual environment path
                venvInfo = detectVirtualEnvironmentFromPath(customVenvPath);
            } else {
                // Auto-detect virtual environment
                venvInfo = detectVirtualEnvironment(workspaceFolder.uri.fsPath);
            }
        }

        const finalPythonPath = venvInfo.pythonPath || pythonPath;
        const finalUvicornPath = venvInfo.uvicornPath || uvicornPath;

        // Determine working directory
        const workingDir = workingDirectory ? 
            path.join(workspaceFolder.uri.fsPath, workingDirectory) : 
            workspaceFolder.uri.fsPath;

        // Validate working directory
        if (!fs.existsSync(workingDir)) {
            vscode.window.showErrorMessage(`Working directory does not exist: ${workingDir}`);
            return;
        }

        // Build uvicorn command
        let command: string;
        let args: string[];

        if (useModuleMode && finalPythonPath !== 'python') {
            // Use python -m uvicorn for better virtual environment support
            command = finalPythonPath;
            args = [
                '-m', 'uvicorn',
                fastApiFile,
                '--host', host,
                '--port', port.toString()
            ];
        } else if (venvInfo.uvicornPath) {
            // Use specific uvicorn path from virtual environment
            command = finalUvicornPath;
            args = [
                fastApiFile,
                '--host', host,
                '--port', port.toString()
            ];
        } else if (useModuleMode) {
            // Fallback to python -m uvicorn with system Python
            command = finalPythonPath;
            args = [
                '-m', 'uvicorn',
                fastApiFile,
                '--host', host,
                '--port', port.toString()
            ];
        } else {
            // Use direct uvicorn command
            command = finalUvicornPath;
            args = [
                fastApiFile,
                '--host', host,
                '--port', port.toString()
            ];
        }

        if (reload) {
            args.push('--reload');
        }

        Logger.clear();
        Logger.show();
        Logger.info('Starting FastAPI server...');
        if (venvInfo.venvPath) {
            Logger.info(`Virtual environment detected: ${venvInfo.venvPath}`);
        }
        Logger.info(`Python executable: ${finalPythonPath}`);
        Logger.info(`Working directory: ${workingDir}`);
        if (workingDirectory) {
            Logger.info(`PYTHONPATH configured: ${workingDir}`);
        }
        Logger.info(`Executing command: ${command} ${args.join(' ')}`);

        // Prepare environment variables
        const envVars: { [key: string]: string } = {
            ...process.env,
            ...(venvInfo.venvPath && { VIRTUAL_ENV: venvInfo.venvPath })
        };

        // Set PYTHONPATH to working directory if specified
        if (workingDirectory) {
            const currentPythonPath = envVars.PYTHONPATH || '';
            envVars.PYTHONPATH = workingDir + (currentPythonPath ? `:${currentPythonPath}` : '');
        }

        // Start the process
        fastApiProcess = cp.spawn(command, args, {
            cwd: workingDir,
            shell: true,
            env: envVars
        });

        if (fastApiProcess.stdout) {
            fastApiProcess.stdout.on('data', (data) => {
                Logger.raw(data.toString());
            });
        }

        if (fastApiProcess.stderr) {
            fastApiProcess.stderr.on('data', (data) => {
                Logger.raw(data.toString());
            });
        }

        fastApiProcess.on('close', (code) => {
            if (code === 0) {
                Logger.success(`Server stopped successfully`);
            } else {
                Logger.warning(`Server stopped with exit code ${code}`);
            }
            fastApiProcess = null;
            updateStatusBar(false);
        });

        fastApiProcess.on('error', (error) => {
            Logger.error(`Failed to start server: ${error.message}`);
            vscode.window.showErrorMessage(`Failed to start FastAPI server: ${error.message}`);
            fastApiProcess = null;
            updateStatusBar(false);
        });

        updateStatusBar(true, port);
        vscode.window.showInformationMessage(`🚀 FastAPI server started on http://${host}:${port}`);

    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to start FastAPI server: ${error}`);
    }
}

function stopFastAPI() {
    if (!fastApiProcess) {
        vscode.window.showWarningMessage('FastAPI server is not running!');
        return;
    }

    Logger.info('Stopping FastAPI server...');

    if (fastApiProcess.pid) {
        try {
            process.kill(fastApiProcess.pid, 'SIGTERM');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            Logger.error(`Error stopping server: ${errorMessage}`);
            // Force kill if SIGTERM fails
            if (fastApiProcess?.pid) {
                try {
                    process.kill(fastApiProcess.pid, 'SIGKILL');
                } catch (killError) {
                    const killErrorMessage = killError instanceof Error ? killError.message : String(killError);
                    Logger.warning(`Force kill failed: ${killErrorMessage}`);
                }
            }
        }
    }

    fastApiProcess = null;
    updateStatusBar(false);
    vscode.window.showInformationMessage('🛑 FastAPI server stopped');
}

async function restartFastAPI() {
    if (fastApiProcess) {
        stopFastAPI();
        // Wait a moment for the process to fully stop
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    startFastAPI();
}

async function selectFastAPIFile() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found!');
        return;
    }

    const config = vscode.workspace.getConfiguration('fastapi-runner');
    const workingDirectory = config.get<string>('workingDirectory', '');

    // Determine search directory
    const searchDir = workingDirectory ? 
        path.join(workspaceFolder.uri.fsPath, workingDirectory) : 
        workspaceFolder.uri.fsPath;

    // Find Python files that might contain FastAPI
    const pythonFiles = await findPythonFiles(searchDir);
    const fastApiFiles = await filterFastAPIFiles(pythonFiles);

    if (fastApiFiles.length === 0) {
        vscode.window.showWarningMessage('No FastAPI files found in the workspace!');
        return;
    }

    const selectedFile = await vscode.window.showQuickPick(
        fastApiFiles.map(file => ({
            label: path.basename(file),
            description: path.relative(workspaceFolder.uri.fsPath, file),
            detail: file
        })),
        {
            placeHolder: 'Select FastAPI file to run'
        }
    );

    if (selectedFile) {
        const config = vscode.workspace.getConfiguration('fastapi-runner');
        const workingDirectory = config.get<string>('workingDirectory', '');
        
        // Calculate relative path from search directory
        const relativePath = path.relative(searchDir, selectedFile.detail);
        const modulePath = relativePath.replace(/\.py$/, '').replace(/[/\\]/g, '.') + ':app';
        
        await config.update('defaultFile', modulePath, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(`📁 Selected FastAPI file: ${selectedFile.label}`);
    }
}

function updateStatusBar(running: boolean, port?: number) {
    if (running && port) {
        statusBarItem.text = `$(play-circle) FastAPI: Running :${port}`;
        statusBarItem.tooltip = `FastAPI server running on port ${port}`;
        statusBarItem.command = 'fastapi-runner.stop';
    } else {
        statusBarItem.text = "$(circle-outline) FastAPI: Stopped";
        statusBarItem.tooltip = "FastAPI Server Status";
        statusBarItem.command = 'fastapi-runner.start';
    }
}

async function getFastAPIFile(): Promise<string | null> {
    const config = vscode.workspace.getConfiguration('fastapi-runner');
    let defaultFile = config.get<string>('defaultFile', 'main:app');
    const workingDirectory = config.get<string>('workingDirectory', '');

    // If default file is just module:app format, return it
    if (defaultFile.includes(':')) {
        return defaultFile;
    }

    // Try to auto-detect
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return null;
    }

    // Determine search directory
    const searchDir = workingDirectory ? 
        path.join(workspaceFolder.uri.fsPath, workingDirectory) : 
        workspaceFolder.uri.fsPath;

    const possibleFiles = ['main.py', 'app.py', 'server.py', 'api.py'];
    
    for (const fileName of possibleFiles) {
        const filePath = path.join(searchDir, fileName);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('FastAPI') || content.includes('fastapi')) {
                const moduleName = path.basename(fileName, '.py');
                return `${moduleName}:app`;
            }
        }
    }

    return defaultFile;
}

async function findPythonFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    function walkDir(currentDir: string) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== '__pycache__' && item !== 'node_modules') {
                walkDir(fullPath);
            } else if (stat.isFile() && item.endsWith('.py')) {
                files.push(fullPath);
            }
        }
    }
    
    try {
        walkDir(dir);
    } catch (error) {
        // Silent fail
    }
    
    return files;
}

async function filterFastAPIFiles(files: string[]): Promise<string[]> {
    const fastApiFiles: string[] = [];
    
    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes('FastAPI') || content.includes('fastapi')) {
                fastApiFiles.push(file);
            }
        } catch (error) {
            // Skip files that can't be read
            continue;
        }
    }
    
    return fastApiFiles;
}

interface VirtualEnvironmentInfo {
    venvPath: string | null;
    pythonPath: string | null;
    uvicornPath: string | null;
}

function detectVirtualEnvironmentFromPath(venvPath: string): VirtualEnvironmentInfo {
    const result: VirtualEnvironmentInfo = {
        venvPath: null,
        pythonPath: null,
        uvicornPath: null
    };

    if (!fs.existsSync(venvPath)) {
        return result;
    }

    result.venvPath = venvPath;

    // Check for Python executable
    const pythonPaths = [
        path.join(venvPath, 'bin', 'python'),
        path.join(venvPath, 'bin', 'python3'),
        path.join(venvPath, 'Scripts', 'python.exe'),  // Windows
        path.join(venvPath, 'Scripts', 'python3.exe')  // Windows
    ];
    
    for (const pythonPath of pythonPaths) {
        if (fs.existsSync(pythonPath)) {
            result.pythonPath = pythonPath;
            break;
        }
    }
    
    // Check for uvicorn executable
    const uvicornPaths = [
        path.join(venvPath, 'bin', 'uvicorn'),
        path.join(venvPath, 'Scripts', 'uvicorn.exe')  // Windows
    ];
    
    for (const uvicornPath of uvicornPaths) {
        if (fs.existsSync(uvicornPath)) {
            result.uvicornPath = uvicornPath;
            break;
        }
    }

    return result;
}

function detectVirtualEnvironment(workspacePath: string): VirtualEnvironmentInfo {
    const result: VirtualEnvironmentInfo = {
        venvPath: null,
        pythonPath: null,
        uvicornPath: null
    };

    // Common virtual environment directory names
    const venvDirs = ['venv', 'env', '.venv', '.env', 'virtualenv'];
    
    // Check for virtual environment in workspace
    for (const venvDir of venvDirs) {
        const venvPath = path.join(workspacePath, venvDir);
        if (fs.existsSync(venvPath)) {
            return detectVirtualEnvironmentFromPath(venvPath);
        }
    }
    
    // Check for VIRTUAL_ENV environment variable
    if (process.env.VIRTUAL_ENV) {
        return detectVirtualEnvironmentFromPath(process.env.VIRTUAL_ENV);
    }
    
    return result;
}

function detectFastAPIFiles() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }

    const config = vscode.workspace.getConfiguration('fastapi-runner');
    const workingDirectory = config.get<string>('workingDirectory', '');

    // Determine search directory
    const searchDir = workingDirectory ? 
        path.join(workspaceFolder.uri.fsPath, workingDirectory) : 
        workspaceFolder.uri.fsPath;

    // Check for common FastAPI files
    const commonFiles = ['main.py', 'app.py', 'server.py'];
    
    for (const fileName of commonFiles) {
        const filePath = path.join(searchDir, fileName);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('FastAPI') || content.includes('fastapi')) {
                    break;
                }
            } catch (error) {
                // Silent fail
            }
        }
    }
}

async function createVirtualEnvironment() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found!');
        return;
    }

    const venvName = await vscode.window.showInputBox({
        prompt: 'Enter virtual environment name',
        placeHolder: 'venv',
        value: 'venv'
    });

    if (!venvName) {
        return;
    }

    const venvPath = path.join(workspaceFolder.uri.fsPath, venvName);
    
    if (fs.existsSync(venvPath)) {
        const overwrite = await vscode.window.showWarningMessage(
            `Virtual environment '${venvName}' already exists. Overwrite?`,
            'Yes', 'No'
        );
        if (overwrite !== 'Yes') {
            return;
        }
    }

    Logger.clear();
    Logger.show();
    Logger.info(`Creating virtual environment: ${venvName}`);
    Logger.info(`Target path: ${venvPath}`);

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    try {
        const createProcess = cp.spawn(pythonCmd, ['-m', 'venv', venvPath], {
            cwd: workspaceFolder.uri.fsPath,
            shell: true
        });

        createProcess.stdout?.on('data', (data) => {
            Logger.raw(data.toString());
        });

        createProcess.stderr?.on('data', (data) => {
            Logger.raw(data.toString());
        });

        createProcess.on('close', (code) => {
            if (code === 0) {
                Logger.success('Virtual environment created successfully!');
                vscode.window.showInformationMessage(`Virtual environment '${venvName}' created successfully!`);
                
                // Update extension settings to use the new venv
                const config = vscode.workspace.getConfiguration('fastapi-runner');
                config.update('venvPath', venvPath, vscode.ConfigurationTarget.Workspace);
                
                // Refresh the FastAPI detection
                detectFastAPIFiles();
            } else {
                Logger.error(`Failed to create virtual environment (exit code: ${code})`);
                vscode.window.showErrorMessage(`Failed to create virtual environment '${venvName}'`);
            }
        });

        createProcess.on('error', (error) => {
            Logger.error(`Error creating virtual environment: ${error.message}`);
            vscode.window.showErrorMessage(`Error creating virtual environment: ${error.message}`);
        });

    } catch (error) {
        Logger.error(`Error creating virtual environment: ${error}`);
        vscode.window.showErrorMessage(`Error creating virtual environment: ${error}`);
    }
}

async function installDependencies() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found!');
        return;
    }

    // Detect virtual environment
    const config = vscode.workspace.getConfiguration('fastapi-runner');
    const customVenvPath = config.get<string>('venvPath', '');
    
    let venvInfo: VirtualEnvironmentInfo;
    if (customVenvPath) {
        venvInfo = detectVirtualEnvironmentFromPath(customVenvPath);
    } else {
        venvInfo = detectVirtualEnvironment(workspaceFolder.uri.fsPath);
    }

    if (!venvInfo.venvPath) {
        const createVenv = await vscode.window.showWarningMessage(
            'No virtual environment found. Create one first?',
            'Create Virtual Environment', 'Cancel'
        );
        if (createVenv === 'Create Virtual Environment') {
            await createVirtualEnvironment();
        }
        return;
    }

    const pythonPath = venvInfo.pythonPath || 'python';
    const pipPath = venvInfo.venvPath ? 
        path.join(venvInfo.venvPath, process.platform === 'win32' ? 'Scripts/pip.exe' : 'bin/pip') : 
        'pip';

    Logger.clear();
    Logger.show();
    Logger.info('Installing FastAPI dependencies...');
    Logger.info(`Using virtual environment: ${venvInfo.venvPath}`);

    // Check if requirements.txt exists (first in working directory, then in root)
    const config2 = vscode.workspace.getConfiguration('fastapi-runner');
    const workingDirectory2 = config2.get<string>('workingDirectory', '');
    
    let requirementsPath: string = '';
    let hasRequirements = false;
    
    if (workingDirectory2) {
        const workingDirRequirements = path.join(workspaceFolder.uri.fsPath, workingDirectory2, 'requirements.txt');
        const rootRequirements = path.join(workspaceFolder.uri.fsPath, 'requirements.txt');
        
        if (fs.existsSync(workingDirRequirements)) {
            requirementsPath = workingDirRequirements;
            hasRequirements = true;
        } else if (fs.existsSync(rootRequirements)) {
            requirementsPath = rootRequirements;
            hasRequirements = true;
        }
    } else {
        requirementsPath = path.join(workspaceFolder.uri.fsPath, 'requirements.txt');
        hasRequirements = fs.existsSync(requirementsPath);
    }

    let installCommand: string;
    let installArgs: string[];

    if (hasRequirements) {
        Logger.info(`Found requirements.txt: ${requirementsPath}`);
        installCommand = pythonPath;
        installArgs = ['-m', 'pip', 'install', '-r', requirementsPath];
    } else {
        Logger.info('Installing basic FastAPI packages...');
        installCommand = pythonPath;
        installArgs = ['-m', 'pip', 'install', 'fastapi', 'uvicorn[standard]'];
    }

    try {
        const installProcess = cp.spawn(installCommand, installArgs, {
            cwd: workspaceFolder.uri.fsPath,
            shell: true
        });

        installProcess.stdout?.on('data', (data) => {
            Logger.raw(data.toString());
        });

        installProcess.stderr?.on('data', (data) => {
            Logger.raw(data.toString());
        });

        installProcess.on('close', (code) => {
            if (code === 0) {
                Logger.success('Dependencies installed successfully!');
                vscode.window.showInformationMessage('FastAPI dependencies installed successfully!');
                
                // Refresh the FastAPI detection
                detectFastAPIFiles();
            } else {
                Logger.error(`Failed to install dependencies (exit code: ${code})`);
                vscode.window.showErrorMessage('Failed to install dependencies');
            }
        });

        installProcess.on('error', (error) => {
            Logger.error(`Error installing dependencies: ${error.message}`);
            vscode.window.showErrorMessage(`Error installing dependencies: ${error.message}`);
        });

    } catch (error) {
        Logger.error(`Error installing dependencies: ${error}`);
        vscode.window.showErrorMessage(`Error installing dependencies: ${error}`);
    }
}

export function deactivate() {
    if (fastApiProcess) {
        stopFastAPI();
    }
} 