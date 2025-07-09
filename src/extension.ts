import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as kill from 'tree-kill';

let fastApiProcess: cp.ChildProcess | null = null;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    console.log('⚡ FastAPI Runner extension activate() called!');
    
    try {
        // Create output channel first
        outputChannel = vscode.window.createOutputChannel('FastAPI Runner');
        outputChannel.clear();
        outputChannel.appendLine('🚀 FastAPI Runner extension is starting...');
        outputChannel.appendLine(`📍 Extension path: ${context.extensionPath}`);
        outputChannel.appendLine(`📍 VS Code version: ${vscode.version}`);
        outputChannel.appendLine(`📍 Node version: ${process.version}`);
        outputChannel.appendLine('─'.repeat(60));
        
        // Create status bar item
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        statusBarItem.text = "$(circle-outline) FastAPI: Stopped";
        statusBarItem.tooltip = "FastAPI Server Status - Click to start";
        statusBarItem.command = 'fastapi-runner.start';
        statusBarItem.show();
        outputChannel.appendLine('✅ Status bar item created');

        // Register commands synchronously to prevent registration issues
        const disposables: vscode.Disposable[] = [];
        
        // Command registration must be synchronous
        disposables.push(
            vscode.commands.registerCommand('fastapi-runner.start', startFastAPI),
            vscode.commands.registerCommand('fastapi-runner.stop', stopFastAPI),
            vscode.commands.registerCommand('fastapi-runner.restart', restartFastAPI),
            vscode.commands.registerCommand('fastapi-runner.selectFile', selectFastAPIFile),
            vscode.commands.registerCommand('fastapi-runner.createVenv', createVirtualEnvironment),
            vscode.commands.registerCommand('fastapi-runner.installDependencies', installDependencies)
        );

        outputChannel.appendLine('✅ All commands registered successfully');

        // Add all disposables to context
        context.subscriptions.push(
            ...disposables,
            statusBarItem,
            outputChannel
        );

        // Auto-detect FastAPI files asynchronously (non-blocking)
        setImmediate(() => {
            try {
                detectFastAPIFiles();
            } catch (error) {
                outputChannel.appendLine(`❌ Error detecting FastAPI files: ${error}`);
                console.error('Error detecting FastAPI files:', error);
            }
        });
        
        outputChannel.appendLine('─'.repeat(60));
        outputChannel.appendLine('🎉 FastAPI Runner extension activated successfully!');
        outputChannel.appendLine('💡 Available commands:');
        outputChannel.appendLine('   - FastAPI Runner: Start FastAPI Server');
        outputChannel.appendLine('   - FastAPI Runner: Stop FastAPI Server');
        outputChannel.appendLine('   - FastAPI Runner: Restart FastAPI Server');
        outputChannel.appendLine('   - FastAPI Runner: Select FastAPI File');
        outputChannel.appendLine('   - FastAPI Runner: Create Virtual Environment');
        outputChannel.appendLine('   - FastAPI Runner: Install FastAPI Dependencies');
        
        console.log('FastAPI Runner extension activated successfully!');
        
        // Show success message
        vscode.window.showInformationMessage('FastAPI Runner extension activated! Commands are ready to use.');
        
    } catch (error) {
        const errorMessage = `Failed to activate FastAPI Runner: ${error}`;
        console.error('Error activating FastAPI Runner extension:', error);
        
        if (outputChannel) {
            outputChannel.appendLine(`❌ FATAL ERROR: ${errorMessage}`);
            outputChannel.appendLine(`Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
            outputChannel.show();
        }
        
        vscode.window.showErrorMessage(errorMessage + ' - Check Output panel for details');
        
        // Don't re-throw to prevent VS Code from disabling the extension
        return;
    }
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

        outputChannel.clear();
        outputChannel.show();
        outputChannel.appendLine(`Starting FastAPI server...`);
        if (venvInfo.venvPath) {
            outputChannel.appendLine(`Virtual environment detected: ${venvInfo.venvPath}`);
        }
        outputChannel.appendLine(`Python path: ${finalPythonPath}`);
        outputChannel.appendLine(`Working directory: ${workingDir}`);
        if (workingDirectory) {
            outputChannel.appendLine(`PYTHONPATH: ${workingDir}`);
        }
        outputChannel.appendLine(`Command: ${command} ${args.join(' ')}`);
        outputChannel.appendLine('─'.repeat(50));

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
                outputChannel.append(data.toString());
            });
        }

        if (fastApiProcess.stderr) {
            fastApiProcess.stderr.on('data', (data) => {
                outputChannel.append(data.toString());
            });
        }

        fastApiProcess.on('close', (code) => {
            outputChannel.appendLine(`\nFastAPI server stopped with code ${code}`);
            fastApiProcess = null;
            updateStatusBar(false);
        });

        fastApiProcess.on('error', (error) => {
            outputChannel.appendLine(`\nError: ${error.message}`);
            vscode.window.showErrorMessage(`Failed to start FastAPI server: ${error.message}`);
            fastApiProcess = null;
            updateStatusBar(false);
        });

        updateStatusBar(true, port);
        vscode.window.showInformationMessage(`FastAPI server started on http://${host}:${port}`);

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to start FastAPI server: ${error}`);
    }
}

function stopFastAPI() {
    if (!fastApiProcess) {
        vscode.window.showWarningMessage('FastAPI server is not running!');
        return;
    }

    outputChannel.appendLine('\nStopping FastAPI server...');

    if (fastApiProcess.pid) {
        kill(fastApiProcess.pid, 'SIGTERM', (error) => {
            if (error) {
                outputChannel.appendLine(`Error stopping server: ${error.message}`);
                // Force kill if SIGTERM fails
                if (fastApiProcess?.pid) {
                    try {
                        process.kill(fastApiProcess.pid, 'SIGKILL');
                    } catch (killError) {
                        outputChannel.appendLine(`Force kill failed: ${killError}`);
                    }
                }
            }
        });
    }

    fastApiProcess = null;
    updateStatusBar(false);
    vscode.window.showInformationMessage('FastAPI server stopped');
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
        vscode.window.showInformationMessage(`Selected FastAPI file: ${selectedFile.label}`);
        
        outputChannel.appendLine(`Selected FastAPI module: ${modulePath}`);
        if (workingDirectory) {
            outputChannel.appendLine(`Working directory: ${workingDirectory}`);
        }
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
        console.error('Error walking directory:', error);
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
        outputChannel.appendLine('No workspace folder found. Please open a folder to use FastAPI Runner.');
        return;
    }

    const config = vscode.workspace.getConfiguration('fastapi-runner');
    const workingDirectory = config.get<string>('workingDirectory', '');

    // Determine search directory
    const searchDir = workingDirectory ? 
        path.join(workspaceFolder.uri.fsPath, workingDirectory) : 
        workspaceFolder.uri.fsPath;

    outputChannel.appendLine(`Scanning workspace: ${workspaceFolder.uri.fsPath}`);
    if (workingDirectory) {
        outputChannel.appendLine(`Working directory: ${searchDir}`);
    }

    // Check for virtual environment
    const venvInfo = detectVirtualEnvironment(workspaceFolder.uri.fsPath);
    if (venvInfo.venvPath) {
        outputChannel.appendLine(`✓ Virtual environment detected: ${venvInfo.venvPath}`);
    } else {
        outputChannel.appendLine('⚠ No virtual environment detected');
    }

    // Check for common FastAPI files
    const commonFiles = ['main.py', 'app.py', 'server.py'];
    let fastApiFound = false;
    
    for (const fileName of commonFiles) {
        const filePath = path.join(searchDir, fileName);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('FastAPI') || content.includes('fastapi')) {
                    const relativePath = workingDirectory ? 
                        path.join(workingDirectory, fileName) : 
                        fileName;
                    outputChannel.appendLine(`✓ Detected FastAPI file: ${relativePath}`);
                    fastApiFound = true;
                    break;
                }
            } catch (error) {
                outputChannel.appendLine(`⚠ Error reading ${fileName}: ${error}`);
            }
        }
    }
    
    if (!fastApiFound) {
        const searchLocation = workingDirectory ? 
            `${workingDirectory}/ (main.py, app.py, server.py)` : 
            'root directory (main.py, app.py, server.py)';
        outputChannel.appendLine(`No FastAPI files detected in ${searchLocation}`);
        outputChannel.appendLine('You can use "Select FastAPI File" command to choose a file manually.');
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

    outputChannel.clear();
    outputChannel.show();
    outputChannel.appendLine(`Creating virtual environment: ${venvName}`);
    outputChannel.appendLine(`Path: ${venvPath}`);
    outputChannel.appendLine('─'.repeat(50));

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    try {
        const createProcess = cp.spawn(pythonCmd, ['-m', 'venv', venvPath], {
            cwd: workspaceFolder.uri.fsPath,
            shell: true
        });

        createProcess.stdout?.on('data', (data) => {
            outputChannel.append(data.toString());
        });

        createProcess.stderr?.on('data', (data) => {
            outputChannel.append(data.toString());
        });

        createProcess.on('close', (code) => {
            if (code === 0) {
                outputChannel.appendLine('\n✓ Virtual environment created successfully!');
                outputChannel.appendLine(`To activate: source ${venvName}/bin/activate`);
                vscode.window.showInformationMessage(`Virtual environment '${venvName}' created successfully!`);
                
                // Update extension settings to use the new venv
                const config = vscode.workspace.getConfiguration('fastapi-runner');
                config.update('venvPath', venvPath, vscode.ConfigurationTarget.Workspace);
                
                // Refresh the FastAPI detection
                detectFastAPIFiles();
            } else {
                outputChannel.appendLine(`\n✗ Failed to create virtual environment (exit code: ${code})`);
                vscode.window.showErrorMessage(`Failed to create virtual environment '${venvName}'`);
            }
        });

        createProcess.on('error', (error) => {
            outputChannel.appendLine(`\n✗ Error: ${error.message}`);
            vscode.window.showErrorMessage(`Error creating virtual environment: ${error.message}`);
        });

    } catch (error) {
        outputChannel.appendLine(`\n✗ Error: ${error}`);
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

    outputChannel.clear();
    outputChannel.show();
    outputChannel.appendLine('Installing FastAPI dependencies...');
    outputChannel.appendLine(`Virtual environment: ${venvInfo.venvPath}`);
    outputChannel.appendLine(`Using pip: ${pipPath}`);
    outputChannel.appendLine('─'.repeat(50));

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
        outputChannel.appendLine(`Found requirements.txt: ${requirementsPath}`);
        installCommand = pythonPath;
        installArgs = ['-m', 'pip', 'install', '-r', requirementsPath];
    } else {
        outputChannel.appendLine('No requirements.txt found, installing basic FastAPI packages...');
        installCommand = pythonPath;
        installArgs = ['-m', 'pip', 'install', 'fastapi', 'uvicorn[standard]'];
    }

    try {
        const installProcess = cp.spawn(installCommand, installArgs, {
            cwd: workspaceFolder.uri.fsPath,
            shell: true
        });

        installProcess.stdout?.on('data', (data) => {
            outputChannel.append(data.toString());
        });

        installProcess.stderr?.on('data', (data) => {
            outputChannel.append(data.toString());
        });

        installProcess.on('close', (code) => {
            if (code === 0) {
                outputChannel.appendLine('\n✓ Dependencies installed successfully!');
                vscode.window.showInformationMessage('FastAPI dependencies installed successfully!');
                
                // Refresh the FastAPI detection
                detectFastAPIFiles();
            } else {
                outputChannel.appendLine(`\n✗ Failed to install dependencies (exit code: ${code})`);
                vscode.window.showErrorMessage('Failed to install dependencies');
            }
        });

        installProcess.on('error', (error) => {
            outputChannel.appendLine(`\n✗ Error: ${error.message}`);
            vscode.window.showErrorMessage(`Error installing dependencies: ${error.message}`);
        });

    } catch (error) {
        outputChannel.appendLine(`\n✗ Error: ${error}`);
        vscode.window.showErrorMessage(`Error installing dependencies: ${error}`);
    }
}

export function deactivate() {
    try {
        if (fastApiProcess) {
            stopFastAPI();
        }
        
        if (statusBarItem) {
            statusBarItem.dispose();
        }
        
        if (outputChannel) {
            outputChannel.dispose();
        }
        
        console.log('FastAPI Runner extension deactivated successfully!');
    } catch (error) {
        console.error('Error deactivating FastAPI Runner extension:', error);
    }
} 