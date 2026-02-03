#!/bin/bash
#
# auto-version.sh - Automatic version management script
#
# Usage: ./auto-version.sh <BRANCH_NAME> <COMMIT_MESSAGE>
#
# Output (to stdout for GitHub Actions):
#   - BUMP_TYPE=major|minor|patch|none
#   - DISPLAY_VERSION=x.y.z-dev.TIMESTAMP (for development only)
#
# Key Design Principles:
#   1. Development: Does NOT modify package.json, only outputs display version
#   2. Master: Is the ONLY source of truth for version, modifies package.json
#   3. No double bumping - version is bumped once on master only
#

set -e

BRANCH_NAME="$1"
COMMIT_MSG="$2"

# Get the first line of commit message
COMMIT_FIRST_LINE=$(echo "$COMMIT_MSG" | head -n 1)

# Get current version from package.json
get_current_version() {
    node -p "require('./package.json').version"
}

# Determine bump type from commit message
get_bump_type_from_commit() {
    local commit="$1"
    
    # Breaking change → major
    if [[ "$commit" =~ ^feat(\(.+\))?!: ]] || [[ "$commit" =~ BREAKING.CHANGE ]]; then
        echo "major"
    # Feature → minor
    elif [[ "$commit" =~ ^feat(\(.+\))?: ]]; then
        echo "minor"
    # Fix or perf → patch
    elif [[ "$commit" =~ ^fix(\(.+\))?: ]] || [[ "$commit" =~ ^perf(\(.+\))?: ]]; then
        echo "patch"
    # Chore, docs, style, refactor, test → no version bump
    elif [[ "$commit" =~ ^(chore|docs|style|refactor|test|ci)(\(.+\))?: ]]; then
        echo "none"
    # Default for merge commits or unrecognized → patch
    else
        echo "patch"
    fi
}

# Main logic
main() {
    CURRENT_VERSION=$(get_current_version)
    
    if [ "$BRANCH_NAME" = "master" ]; then
        # ============================================
        # Master Branch Logic
        # ============================================
        # Master is the ONLY place that modifies package.json
        
        # Determine bump type from commit message
        BUMP_TYPE=$(get_bump_type_from_commit "$COMMIT_FIRST_LINE")
        
        if [ "$BUMP_TYPE" = "none" ]; then
            echo "No version bump needed for this commit type" >&2
            echo "BUMP_TYPE=none"
            echo "DISPLAY_VERSION=$CURRENT_VERSION"
        else
            # Execute version bump
            case "$BUMP_TYPE" in
                major)
                    npm run version:major >&2
                    ;;
                minor)
                    npm run version:minor >&2
                    ;;
                patch)
                    npm run version:patch >&2
                    ;;
            esac
            
            NEW_VERSION=$(get_current_version)
            echo "Version bumped: $CURRENT_VERSION -> $NEW_VERSION ($BUMP_TYPE)" >&2
            
            echo "BUMP_TYPE=$BUMP_TYPE"
            echo "DISPLAY_VERSION=$NEW_VERSION"
        fi
        
    else
        # ============================================
        # Development Branch Logic
        # ============================================
        # Development does NOT modify package.json
        # Only outputs a display version for Docker tags
        
        TIMESTAMP=$(date +%Y%m%d%H%M)
        DISPLAY_VERSION="${CURRENT_VERSION}-dev.${TIMESTAMP}"
        
        echo "Development build: $DISPLAY_VERSION (package.json unchanged)" >&2
        
        echo "BUMP_TYPE=none"
        echo "DISPLAY_VERSION=$DISPLAY_VERSION"
    fi
}

# Run main function
main
