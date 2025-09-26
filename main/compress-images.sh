#!/bin/bash

# use imagemagick to compress all images in the image-temp folder
# by resizing them to max 500 px on the longest side.
# Keep existing aspect ratio.

# Check if imagemagick is installed
if ! command -v magick &> /dev/null; then
    echo "Error: ImageMagick is not installed. Please install it first."
    exit 1
fi

# Check if image-temp directory exists
if [ ! -d "image-temp" ]; then
    echo "Error: image-temp directory not found"
    exit 1
fi

# Process all images in the image-temp directory
for img in image-temp/*; do
    if [ -f "$img" ]; then
        echo "Processing $img..."
        magick convert "$img" -resize "500x500>" "$img"
    fi
done

echo "Image compression complete!"


