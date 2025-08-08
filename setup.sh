#!/bin/bash

echo "🎙️ Meeting Intelligence Platform Setup"
echo "====================================="

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This application requires macOS"
    exit 1
fi

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is required but not installed"
    echo "   Install it from: https://brew.sh/"
    exit 1
fi

# Install SoX if not already installed
if ! command -v sox &> /dev/null; then
    echo "📦 Installing SoX audio processing library..."
    brew install sox
    if [ $? -eq 0 ]; then
        echo "✅ SoX installed successfully"
    else
        echo "❌ Failed to install SoX"
        exit 1
    fi
else
    echo "✅ SoX is already installed"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    echo "   Install it from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="16.0.0"
if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION'))" 2>/dev/null; then
    echo "❌ Node.js version $NODE_VERSION is too old. Requires 16.0.0 or later"
    exit 1
fi

echo "✅ Node.js $(node -v) is installed"

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build the application
echo "🔨 Building application..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Application built successfully"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Set your API keys (choose one method):"
echo "   • Environment variables: export OPENAI_API_KEY=your_key"
echo "   • Or configure in app Settings after launch"
echo ""
echo "2. Start the application:"
echo "   npm run electron"
echo ""
echo "3. Grant microphone permissions when prompted"
echo ""
echo "📖 See README.md for detailed usage instructions"