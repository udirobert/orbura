#!/bin/bash
# Assemble the Presage demo video per docs/presage-demo-video.md
set -e
cd "$(dirname "$0")/.."
A=demo-assets
OUT=demo-assets/presage-demo-final.mp4
FONT='/System/Library/Fonts/Supplemental/Arial.ttf'
TMP=$(mktemp -d)

# caption text files (drawtext textfile avoids escaping issues)
cat > $TMP/cap1.txt <<'TXT'
Health data is either expensive, effortful, or invisible.
TXT
cat > $TMP/cap2.txt <<'TXT'
The camera measures. It doesn't record. Nothing leaves this device.
TXT
cat > $TMP/cap3.txt <<'TXT'
Frames stay here. Numbers are yours.
TXT
cat > $TMP/cap4.txt <<'TXT'
A reading is trivia. An action is health.
TXT
cat > $TMP/cap5.txt <<'TXT'
It lands in your record — automatically.
TXT
cat > $TMP/cap6.txt <<'TXT'
Day 1 is a reading. Day 30 is a baseline.
TXT

# segment list: name|source|ss|t|captionfile(or -)
cat > $TMP/segments.txt <<'SEG'
s1|demo-assets/beat1-morning.mp4|0|12|-
s2|demo-assets/beat2-overshoulder.mp4|0|8|cap1.txt
s3|demo-assets/capture/capture-full.mp4|1.8|6.5|cap2.txt
s4|demo-assets/beat5-boundary.mp4|0|8|cap3.txt
s5|demo-assets/capture/capture-full.mp4|46|30|-
s6|demo-assets/capture/capture-full.mp4|99|10|cap4.txt
s7|demo-assets/capture/web/page@512f191e5e0edec68122881507459708.webm|0|21|-CAP7
s8|demo-assets/beat9-dataflight.mp4|0|10|cap6.txt
s9|demo-assets/beat10-close.mp4|0|8|-
s10|demo-assets/beat11-embers.mp4|0|6|-
s11|-|0|7|-ENDCARD
SEG

# webm filename may differ — resolve wildcard
WEBM=$(ls demo-assets/capture/web/*.webm | head -1)
sed -i '' "s|demo-assets/capture/web/[^ |]*\.webm|$WEBM|" $TMP/segments.txt

FC=$TMP/filter.txt
: > $FC
N=0
declare -a LABELS
while IFS='|' read -r name src ss t cap; do
  N=$((N+1))
  LABELS[$N]=$name
  norm="scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=24,format=yuv420p"
  if [ "$src" = "-" ]; then
    if [ "$cap" = "-ENDCARD" ]; then
      echo "color=c=0x0A0A0B:s=1280x720:d=${t}:r=24,format=yuv420p[v$N]" >> $FC
      continue
    fi
  else
    echo "[$((N-1)):v]trim=start=${ss}:duration=${t},setpts=PTS-STARTPTS,$norm[v$N]" >> $FC
  fi
  # captions drawn in a second pass below via overlay on normalized segment
done < $TMP/segments.txt

# For captioned segments, wrap: normalized -> drawtext. Simpler: apply drawtext inside norm chain.
# Rebuild: for each segment with cap1-6, append drawtext before format.
FC2=$TMP/filter2.txt
: > $FC2
N=0
while IFS='|' read -r name src ss t cap; do
  N=$((N+1))
  norm="scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1"
  dt=""
  case "$cap" in
    cap*.txt) dt=",drawtext=fontfile=$FONT:textfile=$TMP/$cap:fontsize=36:fontcolor=white:borderw=2:bordercolor=black@0.6:x=(w-text_w)/2:y=h-150:line_spacing=8";;
    -CAP7) dt=",drawtext=fontfile=$FONT:textfile=$TMP/cap5.txt:fontsize=36:fontcolor=white:borderw=2:bordercolor=black@0.6:x=(w-text_w)/2:y=h-150";;
  esac
  if [ "$src" = "-" ]; then
    echo "color=c=0x0A0A0B:s=1280x720:d=${t}:r=24,format=yuv420p,drawtext=fontfile=$FONT:textfile=$TMP/end1.txt:fontsize=84:fontcolor=0xEA580C:x=(w-text_w)/2:y=200,drawtext=fontfile=$FONT:textfile=$TMP/end2.txt:fontsize=32:fontcolor=white:x=(w-text_w)/2:y=430,drawtext=fontfile=$FONT:textfile=$TMP/end3.txt:fontsize=24:fontcolor=0xA8A29E:x=(w-text_w)/2:y=560,drawtext=fontfile=$FONT:textfile=$TMP/end4.txt:fontsize=24:fontcolor=0xEA580C:x=(w-text_w)/2:y=610[v$N];" >> $FC2
    continue
  fi
  echo "[$((N-1)):v]trim=start=${ss}:duration=${t},setpts=PTS-STARTPTS,$norm,fps=24$dt,format=yuv420p[v$N];" >> $FC2
done < $TMP/segments.txt

# concat
CONCAT=""
for i in $(seq 1 $N); do CONCAT="$CONCAT[v$i]"; done
echo "$CONCAT concat=n=$N:v=1:a=0[vcat]" >> $FC2

# inputs
ARGS=()
i=0
while IFS='|' read -r name src ss t cap; do
  i=$((i+1))
  if [ "$src" != "-" ]; then ARGS+=(-i "$src"); fi
done < $TMP/segments.txt

cat > $TMP/end1.txt <<'TXT'
ORBURA
TXT
cat > $TMP/end2.txt <<'TXT'
Health signals. One safe action. Human care when it matters.
TXT
cat > $TMP/end3.txt <<'TXT'
Built with Presage SmartSpectra  ·  #presagechallenge
TXT
cat > $TMP/end4.txt <<'TXT'
github.com/udirobert/orbura
TXT

ffmpeg -y -loglevel error "${ARGS[@]}" -filter_complex_script $TMP/filter2.txt -map "[vcat]" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart $OUT

# audio: soft breathing-paced pad, ~125s
ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=174:duration=130" -f lavfi -i "sine=frequency=261.63:duration=130" -f lavfi -i "sine=frequency=349.23:duration=130" -filter_complex "[0:a]volume=0.10[a0];[1:a]volume=0.07[a1];[2:a]volume=0.05[a2];[a0][a1][a2]amix=inputs=3:duration=longest,afade=t=in:st=0:d=4,afade=t=out:st=118:d=8,lowpass=f=1200[a]" -map "[a]" -c:a aac -b:a 128k $TMP/pad.m4a

ffmpeg -y -loglevel error -i $OUT -i $TMP/pad.m4a -map 0:v -map 1:a -c:v copy -c:a copy -shortest ${OUT%.mp4}-withaudio.mp4
mv ${OUT%.mp4}-withaudio.mp4 $OUT

DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 $OUT)
echo "DONE $OUT duration=${DUR}s"
cp $OUT ~/Downloads/orbura-presage-demo.mp4
echo "copied to ~/Downloads/orbura-presage-demo.mp4"
