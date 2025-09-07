#!/bin/bash


set -e

echo "🔍 Checking for Python/FastAPI/Docker cruft..."

CRUFT_FOUND=0

PYTHON_PATTERNS=(
    "poetry"
    "uvicorn"
    "fastapi"
    "main\.py"
    "requirements\.txt"
    "pyproject\.toml"
    "\.py$"
    "python"
    "pip install"
    "poetry install"
    "poetry run"
)

DOCKER_PATTERNS=(
    "dockerfile"
    "docker-compose"
    "\.dockerignore"
    "docker build"
    "docker run"
    "FROM python"
    "COPY requirements"
)

FLY_PATTERNS=(
    "fly\.toml"
    "fly deploy"
    "fly\.dev"
    "flyctl"
)

check_patterns() {
    local patterns=("$@")
    local pattern_name=$1
    shift
    
    echo "Checking for $pattern_name patterns..."
    
    for pattern in "${patterns[@]}"; do
        matches=$(find . -type f \
            -not -path "./node_modules/*" \
            -not -path "./.git/*" \
            -not -path "./frontend/node_modules/*" \
            -not -path "./.vercel/*" \
            -not -name "*.log" \
            -not -name "check-cruft.sh" \
            -exec grep -l -i "$pattern" {} \; 2>/dev/null || true)
        
        if [ -n "$matches" ]; then
            echo "❌ Found '$pattern' in:"
            echo "$matches" | sed 's/^/  /'
            CRUFT_FOUND=1
        fi
    done
}

check_patterns "Python/FastAPI" "${PYTHON_PATTERNS[@]}"

check_patterns "Docker" "${DOCKER_PATTERNS[@]}"

check_patterns "Fly.io" "${FLY_PATTERNS[@]}"

FORBIDDEN_FILES=(
    "fly.toml"
    "Dockerfile"
    "docker-compose.yml"
    "requirements.txt"
    "pyproject.toml"
    "main.py"
    "backend/"
)

echo "Checking for forbidden files..."
for file in "${FORBIDDEN_FILES[@]}"; do
    if [ -e "$file" ]; then
        echo "❌ Forbidden file exists: $file"
        CRUFT_FOUND=1
    fi
done

echo ""
if [ $CRUFT_FOUND -eq 0 ]; then
    echo "✅ No cruft detected! Repository is clean."
    exit 0
else
    echo "❌ Cruft detected! Please remove the identified artifacts."
    echo ""
    echo "This script helps maintain a clean Vercel-only architecture."
    echo "Remove any Python/FastAPI/Docker references found above."
    exit 1
fi
