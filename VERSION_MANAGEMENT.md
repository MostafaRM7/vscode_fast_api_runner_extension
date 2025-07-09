# 📦 Version Management Guide

This guide explains how to manage versions of the FastAPI Runner VS Code extension.

## 🏗️ Current Structure

```
RunnerVSCodeExtension/
├── fastapi-runner-1.0.1.vsix          # Current version
├── versions/                           # Previous versions
│   └── fastapi-runner-1.0.0.vsix      # Previous version
├── scripts/
│   └── version-manager.sh              # Version management script
└── package.json                       # Version info
```

## 🚀 Quick Start

### Automatic Version Management (Recommended)

Use the automated script to increment version and create new VSIX:

```bash
# Patch version (1.0.1 → 1.0.2)
./scripts/version-manager.sh patch

# Minor version (1.0.1 → 1.1.0)
./scripts/version-manager.sh minor

# Major version (1.0.1 → 2.0.0)
./scripts/version-manager.sh major
```

### Manual Version Management

If you prefer manual control:

```bash
# 1. Move current VSIX to versions folder
mv fastapi-runner-*.vsix versions/

# 2. Update version in package.json
# Edit "version": "1.0.1" to "version": "1.0.2"

# 3. Compile and package
npm run compile
npx vsce package
```

## 📋 Version Types

| Type | Description | Example |
|------|-------------|---------|
| **patch** | Bug fixes, small improvements | 1.0.1 → 1.0.2 |
| **minor** | New features, non-breaking changes | 1.0.1 → 1.1.0 |
| **major** | Breaking changes, major features | 1.0.1 → 2.0.0 |

## 🎯 What the Script Does

1. **Validates** the version type (major/minor/patch)
2. **Reads** current version from `package.json`
3. **Calculates** new version number
4. **Moves** current VSIX to `versions/` folder
5. **Updates** version in `package.json`
6. **Compiles** TypeScript code
7. **Creates** new VSIX package
8. **Verifies** the new package was created successfully
9. **Shows** version history

## 📊 Version History

Check all available versions:

```bash
ls -la versions/
```

Current version:
```bash
grep '"version"' package.json
```

## 🔧 Troubleshooting

### Script Permission Error
```bash
chmod +x scripts/version-manager.sh
```

### VSIX Not Found
Make sure you're in the project root directory and have built the extension at least once.

### TypeScript Compilation Error
```bash
npm run compile
```

## 📝 Release Notes Template

When creating a new version, consider documenting changes:

### Version 1.0.1
- **feat**: Improved command registration reliability
- **fix**: Fixed extension activation issues in VSIX packages
- **refactor**: Simplified activation events
- **docs**: Added version management system

### Version 1.0.0
- **feat**: Initial release
- **feat**: FastAPI server start/stop/restart
- **feat**: Virtual environment detection
- **feat**: Configurable settings

## 🎉 Best Practices

1. **Always test** the extension before releasing
2. **Document changes** in commit messages using Conventional Commits
3. **Test VSIX installation** before distributing
4. **Keep version history** in the `versions/` folder
5. **Use semantic versioning** appropriately

## 📞 Support

For issues or questions about version management:
- Check the main README.md
- Review the extension logs in VS Code Output panel
- Test with F5 debugging before creating VSIX 