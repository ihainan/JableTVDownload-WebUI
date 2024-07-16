#!/usr/bin/bash

set -e

if [ $# -lt 2 ]
  then
    echo "Usage: bash -x $0 <url> <directory>"
    exit 1
fi

# variables
CMD="$0"
CMD_DIR="$(cd "$(dirname "$CMD")" && pwd -P)"
url="$1"
path_to_save="$2"

echo "Extract video ID from the URL..."
video_id=$(echo "$url" | rev | cut -d'/' -f2 | rev)
if [[ -z "$video_id" ]]; then
    echo "Invalid URL: <$url>"
    exit 1
fi
echo "Video ID is $video_id"

echo "Downloadig video $video_id"
printf "$url\ny\n3\n" | python $CMD_DIR/../JableTVDownload/main.py
echo "Video $video_id downloaded"

echo "Moving $video_id to $path_to_save"
mv "/app/$video_id" "$path_to_save"
echo "$video_id moved"
