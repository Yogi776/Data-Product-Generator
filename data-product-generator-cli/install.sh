#!/bin/bash

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a file exists
file_exists() {
    [ -f "$1" ]
}

# Function to check if a directory exists
dir_exists() {
    [ -d "$1" ]
}

# Function to check if a file is writable
file_writable() {
    [ -w "$1" ]
}

# Function to detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Function to check and install Homebrew on macOS
install_homebrew() {
    if ! command_exists brew; then
        print_info "Homebrew not found. Installing Homebrew..."
        print_warning "This will install Homebrew package manager. You may be prompted for your password."
        
        # Install Homebrew
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH for current session
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
            # Apple Silicon Mac
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -f "/usr/local/bin/brew" ]]; then
            # Intel Mac
            eval "$(/usr/local/bin/brew shellenv)"
        fi
        
        print_success "Homebrew installed successfully"
    else
        print_info "Homebrew is already installed"
    fi
}

# Function to check and install required dependencies
install_dependencies() {
    local os=$(detect_os)
    
    print_info "Detected operating system: $os"
    
    if [[ "$os" == "macos" ]]; then
        print_info "Setting up macOS environment..."
        
        # Install Homebrew if not present
        install_homebrew
        
        # Check for required tools
        local missing_tools=()
        
        # Check for git
        if ! command_exists git; then
            missing_tools+=("git")
        fi
        
        # Check for bash (should be available by default)
        if ! command_exists bash; then
            missing_tools+=("bash")
        fi
        
        # Check for coreutils (for better compatibility)
        if ! command_exists greadlink; then
            missing_tools+=("coreutils")
        fi
        
        # Install missing tools
        if [[ ${#missing_tools[@]} -gt 0 ]]; then
            print_info "Installing missing tools: ${missing_tools[*]}"
            brew install "${missing_tools[@]}"
            print_success "All required tools installed"
        else
            print_success "All required tools are already installed"
        fi
        
        # Check for Xcode Command Line Tools
        if ! xcode-select -p >/dev/null 2>&1; then
            print_warning "Xcode Command Line Tools not found. Installing..."
            print_info "This may take a while and you may be prompted for your password."
            xcode-select --install
            print_info "Please complete the Xcode Command Line Tools installation when prompted."
            print_info "You may need to restart your terminal after installation."
            print_warning "Press Enter when Xcode Command Line Tools installation is complete..."
            read -r
        else
            print_success "Xcode Command Line Tools are already installed"
        fi
        
    elif [[ "$os" == "linux" ]]; then
        print_info "Setting up Linux environment..."
        
        # Detect package manager
        if command_exists apt-get; then
            print_info "Using apt package manager"
            # Update package list
            sudo apt-get update
            
            # Install required packages
            local packages=("git" "bash" "coreutils")
            for package in "${packages[@]}"; do
                if ! dpkg -l | grep -q "^ii  $package "; then
                    print_info "Installing $package..."
                    sudo apt-get install -y "$package"
                else
                    print_info "$package is already installed"
                fi
            done
            
        elif command_exists yum; then
            print_info "Using yum package manager"
            local packages=("git" "bash" "coreutils")
            for package in "${packages[@]}"; do
                if ! rpm -q "$package" >/dev/null 2>&1; then
                    print_info "Installing $package..."
                    sudo yum install -y "$package"
                else
                    print_info "$package is already installed"
                fi
            done
            
        elif command_exists dnf; then
            print_info "Using dnf package manager"
            local packages=("git" "bash" "coreutils")
            for package in "${packages[@]}"; do
                if ! rpm -q "$package" >/dev/null 2>&1; then
                    print_info "Installing $package..."
                    sudo dnf install -y "$package"
                else
                    print_info "$package is already installed"
                fi
            done
            
        else
            print_warning "Unsupported package manager. Please install git, bash, and coreutils manually."
        fi
        
    elif [[ "$os" == "windows" ]]; then
        print_info "Setting up Windows environment..."
        print_warning "Windows installation requires WSL (Windows Subsystem for Linux) or Git Bash."
        print_info "Please ensure you have WSL or Git Bash installed and run this script from there."
        
        # Check if we're in WSL or Git Bash
        if [[ -f "/etc/os-release" ]]; then
            print_info "Detected WSL environment"
        elif command_exists git; then
            print_info "Detected Git Bash environment"
        else
            print_error "Please install WSL or Git Bash to run this script on Windows"
            exit 1
        fi
        
    else
        print_warning "Unknown operating system. Please ensure you have git, bash, and coreutils installed."
    fi
}

# Function to check system requirements
check_system_requirements() {
    print_info "Checking system requirements..."
    
    # Check available disk space (at least 100MB)
    local available_space=$(df . | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 102400 ]]; then
        print_error "Insufficient disk space. Need at least 100MB available."
        exit 1
    fi
    
    # Check available memory (at least 512MB)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        local total_mem=$(sysctl -n hw.memsize | awk '{print $0/1024/1024}')
        if [[ $(echo "$total_mem < 512" | bc -l) -eq 1 ]]; then
            print_warning "Low memory detected. Installation may be slow."
        fi
    fi
    
    print_success "System requirements met"
}

print_info "Starting dp-generator installation..."

# Check system requirements
check_system_requirements

# Install dependencies based on OS
install_dependencies

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if we're in the correct directory
if [ ! -f "$SCRIPT_DIR/create_structure.sh" ]; then
    print_error "create_structure.sh not found in $SCRIPT_DIR"
    print_error "Please run this script from the data-product-generator-cli directory"
    exit 1
fi

print_info "Found create_structure.sh in $SCRIPT_DIR"

# Check if create_structure.sh is executable
if [ ! -x "$SCRIPT_DIR/create_structure.sh" ]; then
    print_warning "create_structure.sh is not executable, making it executable..."
    chmod +x "$SCRIPT_DIR/create_structure.sh"
fi

# Create hidden bin directory in user's home if it doesn't exist
BIN_DIR="$HOME/.bin"
if [ ! -d "$BIN_DIR" ]; then
    print_info "Creating hidden ~/.bin directory..."
    mkdir -p "$BIN_DIR"
    print_success "Created hidden ~/.bin directory"
else
    print_info "Hidden ~/.bin directory already exists"
fi

# Check if we can write to ~/.bin
if [ ! -w "$BIN_DIR" ]; then
    print_error "Cannot write to ~/.bin directory. Please check permissions."
    exit 1
fi

# Check if dp-generator already exists
TARGET_FILE="$BIN_DIR/.dp-generator"
if [ -f "$TARGET_FILE" ]; then
    print_warning ".dp-generator already exists in ~/.bin"
    print_info "Backing up existing installation..."
    cp "$TARGET_FILE" "$TARGET_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    print_success "Backup created"
fi

# Copy the script to user's hidden bin directory
print_info "Copying create_structure.sh to ~/.bin/.dp-generator..."
if cp "$SCRIPT_DIR/create_structure.sh" "$TARGET_FILE"; then
    print_success "Successfully copied create_structure.sh to ~/.bin/.dp-generator"
else
    print_error "Failed to copy create_structure.sh to ~/.bin/.dp-generator"
    exit 1
fi

# Create hidden dp-generator directory in ~/.bin for supporting files
DP_GENERATOR_DIR="$BIN_DIR/.dp-generator-files"
if [ -d "$DP_GENERATOR_DIR" ]; then
    print_warning ".dp-generator-files directory already exists in ~/.bin"
    print_info "Backing up existing installation..."
    mv "$DP_GENERATOR_DIR" "$DP_GENERATOR_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    print_success "Backup created"
fi

# Copy the entire directory structure to ~/.bin/.dp-generator-files
print_info "Copying dp-generator files to ~/.bin/.dp-generator-files..."
if cp -r "$SCRIPT_DIR" "$DP_GENERATOR_DIR"; then
    print_success "Successfully copied dp-generator files to ~/.bin/.dp-generator-files"
else
    print_error "Failed to copy dp-generator files to ~/.bin/.dp-generator-files"
    exit 1
fi

# Update the script to know where its supporting files are located
print_info "Updating dp-generator script to locate supporting files..."
if sed -i '' "s|SCRIPT_DIR=.*|SCRIPT_DIR=\"$DP_GENERATOR_DIR\"|" "$TARGET_FILE"; then
    print_success "Updated dp-generator script with correct file paths"
else
    print_error "Failed to update dp-generator script"
    exit 1
fi

# Make it executable
print_info "Making .dp-generator executable..."
if chmod +x "$TARGET_FILE"; then
    print_success "Made .dp-generator executable"
else
    print_error "Failed to make .dp-generator executable"
    exit 1
fi

# Create a symlink for easy access (optional)
SYMLINK_PATH="$HOME/.local/bin/dp-generator"
if [ ! -d "$HOME/.local/bin" ]; then
    mkdir -p "$HOME/.local/bin"
fi

if [ -L "$SYMLINK_PATH" ]; then
    print_warning "Symlink already exists, updating..."
    rm "$SYMLINK_PATH"
fi

if ln -s "$TARGET_FILE" "$SYMLINK_PATH"; then
    print_success "Created symlink: $SYMLINK_PATH -> $TARGET_FILE"
    # Add .local/bin to PATH if not already there
    if ! grep -q "export PATH=\"\$HOME/.local/bin:\$PATH\"" "$HOME/.zshrc" 2>/dev/null; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
        print_info "Added ~/.local/bin to PATH"
    fi
else
    print_warning "Failed to create symlink, you can still use: ~/.bin/.dp-generator"
fi

# Test if the script can be executed
if "$TARGET_FILE" --help >/dev/null 2>&1 || "$TARGET_FILE" --help 2>&1 | grep -q "Usage:"; then
    print_success "dp-generator script installed successfully"
else
    print_error "Installation verification failed: dp-generator cannot be executed"
    exit 1
fi

# Verify the installation
if [ ! -x "$TARGET_FILE" ]; then
    print_error "Installation verification failed: dp-generator is not executable"
    exit 1
fi

# Test the installed version
if "$TARGET_FILE" --help >/dev/null 2>&1 || "$TARGET_FILE" --help 2>&1 | grep -q "Usage:"; then
    print_success "dp-generator installation verified successfully"
else
    print_error "dp-generator installation verification failed"
    exit 1
fi

# Test that the script can find its reference files
print_info "Testing reference file access..."
if [ -d "$DP_GENERATOR_DIR/reference" ]; then
    print_success "Reference directory found at $DP_GENERATOR_DIR/reference"
else
    print_error "Reference directory not found at $DP_GENERATOR_DIR/reference"
    exit 1
fi

# Test that the script can access template files
if [ -f "$DP_GENERATOR_DIR/reference/sql-template.sql" ]; then
    print_success "Template files are accessible"
else
    print_error "Template files are not accessible"
    exit 1
fi

# Test that the script can run from a different directory
print_info "Testing script execution from different directory..."
cd /tmp
if "$TARGET_FILE" --help >/dev/null 2>&1 || "$TARGET_FILE" --help 2>&1 | grep -q "Usage:"; then
    print_success "dp-generator can be executed from any directory"
    cd "$SCRIPT_DIR"  # Return to original directory
else
    print_error "dp-generator cannot be executed from different directory"
    cd "$SCRIPT_DIR"  # Return to original directory
    exit 1
fi

# Add to PATH if not already added
PATH_UPDATED=false

# Determine the appropriate shell configuration file
SHELL_CONFIG=""
if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_CONFIG="$HOME/.bashrc"
else
    # Fallback: try to detect the shell
    if [[ -f "$HOME/.zshrc" ]]; then
        SHELL_CONFIG="$HOME/.zshrc"
    elif [[ -f "$HOME/.bashrc" ]]; then
        SHELL_CONFIG="$HOME/.bashrc"
    elif [[ -f "$HOME/.bash_profile" ]]; then
        SHELL_CONFIG="$HOME/.bash_profile"
    fi
fi

# Update the detected shell configuration file
if [[ -n "$SHELL_CONFIG" ]]; then
    if [ -f "$SHELL_CONFIG" ]; then
        if ! grep -q "export PATH=\"\$HOME/.bin:\$PATH\"" "$SHELL_CONFIG"; then
            print_info "Adding ~/.bin to PATH in $SHELL_CONFIG..."
            echo 'export PATH="$HOME/.bin:$PATH"' >> "$SHELL_CONFIG"
            PATH_UPDATED=true
        else
            print_info "~/.bin already in PATH in $SHELL_CONFIG"
        fi
    else
        print_warning "$SHELL_CONFIG not found, creating it..."
        echo 'export PATH="$HOME/.bin:$PATH"' > "$SHELL_CONFIG"
        PATH_UPDATED=true
    fi
else
    # Fallback: update both .bashrc and .zshrc
    print_warning "Could not detect shell configuration file, updating both .bashrc and .zshrc"
    
    # Check and update .bashrc
    if [ -f "$HOME/.bashrc" ]; then
        if ! grep -q "export PATH=\"\$HOME/.bin:\$PATH\"" "$HOME/.bashrc"; then
            print_info "Adding ~/.bin to PATH in .bashrc..."
            echo 'export PATH="$HOME/.bin:$PATH"' >> "$HOME/.bashrc"
            PATH_UPDATED=true
        else
            print_info "~/.bin already in PATH in .bashrc"
        fi
    else
        print_warning ".bashrc not found, creating it..."
        echo 'export PATH="$HOME/.bin:$PATH"' > "$HOME/.bashrc"
        PATH_UPDATED=true
    fi
    
    # Check and update .zshrc
    if [ -f "$HOME/.zshrc" ]; then
        if ! grep -q "export PATH=\"\$HOME/.bin:\$PATH\"" "$HOME/.zshrc"; then
            print_info "Adding ~/.bin to PATH in .zshrc..."
            echo 'export PATH="$HOME/.bin:$PATH"' >> "$HOME/.zshrc"
            PATH_UPDATED=true
        else
            print_info "~/.bin already in PATH in .zshrc"
        fi
    else
        print_warning ".zshrc not found, creating it..."
        echo 'export PATH="$HOME/.bin:$PATH"' > "$HOME/.zshrc"
        PATH_UPDATED=true
    fi
fi

# Final verification
print_info "Performing final verification..."

# Check if dp-generator is in PATH (if we're in a new shell)
if command_exists dp-generator; then
    print_success "dp-generator is available in current PATH"
else
    print_warning "dp-generator is not yet available in current PATH"
    print_info "This is normal if you haven't restarted your terminal"
fi

echo ""
print_success "Installation complete! dp-generator has been successfully installed."
echo ""
print_success "✅ dp-generator can now be used from ANY directory in your terminal!"
echo ""
print_info "Example usage:"
echo "  dp-generator -p customer-360 -codp analytics -e customer,product,transaction"
echo "  dp-generator -p my-project -codp analytics -e user,order -path custom-config.yaml"
echo ""

if [ "$PATH_UPDATED" = true ]; then
    print_warning "PATH has been updated. Please restart your terminal or run:"
    if [[ -n "$SHELL_CONFIG" ]]; then
        echo "  source $SHELL_CONFIG"
    else
        echo "  source ~/.bashrc  # for bash"
        echo "  source ~/.zshrc   # for zsh"
    fi
else
    print_info "PATH was already configured correctly"
fi

echo ""
print_info "You can now use 'dp-generator' command from anywhere in your terminal!"
echo ""
print_info "Installation details:"
echo "  - Executable: ~/.bin/.dp-generator"
echo "  - Supporting files: ~/.bin/.dp-generator-files/"
echo "  - Templates: ~/.bin/.dp-generator-files/reference/"

# macOS-specific post-installation notes
if [[ "$(detect_os)" == "macos" ]]; then
    echo ""
    print_info "macOS-specific notes:"
    echo "  - If you encounter permission issues, you may need to allow Terminal in System Preferences > Security & Privacy"
    echo "  - For the best experience, consider using iTerm2 or the latest Terminal app"
    echo "  - If you installed Xcode Command Line Tools during this installation, a restart may be recommended"
fi 