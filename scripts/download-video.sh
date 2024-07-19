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
if [[ -z "$ENCODING_TYPE" ]]; then
  ENCODING_TYPE="1"
fi
echo "ENCODING_TYPE = $ENCODING_TYPE"

echo "Extract video ID from the URL..."
video_id=$(echo "$url" | rev | cut -d'/' -f2 | rev)
if [[ -z "$video_id" ]]; then
    echo "Invalid URL: <$url>"
    exit 1
fi
echo "Video ID is $video_id"

echo "Checking if the video file is already downloaded"
video_save_path="$path_to_save/$video_id/$video_id.mp4"
if [[ -f "$video_save_path" ]]; then
  echo "$video_save_path is already downloaded"
  exit 0
fi

echo "Downloadig video $video_id"
if [[ "$ENCODING_TYPE" == "0" ]]; then
  printf "$url\nn\n" | python $CMD_DIR/../JableTVDownload/main.py
else
  printf "$url\ny\n$ENCODING_TYPE\n" | python $CMD_DIR/../JableTVDownload/main.py
fi
echo "Video $video_id downloaded"

echo "Moving $video_id to $path_to_save"
mv "./$video_id" "$path_to_save"
echo "$video_id moved"
