#!/bin/bash

# Source directory for network icons
SRC_DIR="${HOME}/web3icons/packages/core/src/svgs/networks/branded"
# Destination directory (expand ~ to actual home directory)
DEST_DIR="${HOME}/SAManager/src/assets/networks"

# List of networks to copy
networks=(
    "ethereum"
    "arbitrum-one"
    "base"
    "polygon"
    "optimism"
)

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Copy each network icon
for network in "${networks[@]}"; do
    if [ -f "$SRC_DIR/$network.svg" ]; then
        cp "$SRC_DIR/$network.svg" "$DEST_DIR/"
        echo "✓ Copied $network.svg"
    else
        echo "⚠️  Warning: $network.svg not found in source directory"
        # Try to list similar files to help debugging
        echo "   Similar files in directory:"
        ls -1 "$SRC_DIR" | grep -i "$network" || echo "   No similar files found"
    fi
done

echo "Operation completed!"
