# Assembly with ffmpeg

Stages 8 to 11 of the `short-video` skill. Everything here is local and spends no
credits. It needs `ffmpeg` and `ffprobe` (ffmpeg 4.4 or newer; the commands below were
run on ffmpeg 9.0.2, except where a step says it is untested). If they are missing, ask
the person to install them (`brew install ffmpeg` on macOS, a package manager on Linux,
a build from ffmpeg.org on Windows). The `awk` and `sed` one-liners need a Unix shell
(macOS, Linux, Git Bash or WSL).

Check what your build has before you rely on it:

```bash
ffmpeg -version
ffmpeg -hide_banner -filters | grep -E "xfade|loudnorm|sidechaincompress|subtitles|drawtext"
```

A default Homebrew build has `xfade` and `loudnorm` but no `subtitles` and no
`drawtext` (no libass, no libfreetype). See "Captions" for what to do then.

Working target for everything: 1080x1920, 30 fps, H.264 `yuv420p`, AAC 48 kHz stereo.
Run from the project folder. Keep file names free of spaces. Put numbers in filter
graphs, not shell variables (in zsh, `$T[a01]` is read as an array subscript).

The order: normalise clips, trim, join into a silent picture, build the audio, burn
captions into the picture, mux and normalise loudness, check.

## 1. Look at every clip

Raw downloads in `clips/` are never edited. Check each one right after download:

```bash
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate,duration -of csv=p=0 clips/S01_v1.mp4
ffmpeg -y -i clips/S01_v1.mp4 -frames:v 1 -update 1 frames/S01_clip_first.png
ffmpeg -y -ss <half the length> -i clips/S01_v1.mp4 -frames:v 1 -update 1 frames/S01_clip_mid.png
ffmpeg -y -sseof -0.1 -i clips/S01_v1.mp4 -frames:v 1 -update 1 frames/S01_clip_last.png
ffmpeg -y -i clips/S01_v1.mp4 -vf fps=1 frames/S01_clip_%02d.png
```

The last command writes one frame per second. Open the images. Look for a face that
drifted from the first frame, hands, a changed light, text that turned to noise, and
motion that stops or loops. Choose the in and out points from what you see. If a clip
carries sound (an on-camera line, or a model that invented music or a crash), check its
level with `-af volumedetect -f null -` and ask the person to listen. Mute it in the mix
if you do not want it.

## 2. Normalise

Different models give different sizes and frame rates (480p Seedance 9:16 is 496x864).
`xfade` and the concat demuxer need identical streams, so convert every clip once. This
loop also gives silent clips a silent audio track so every file has the same streams:

```bash
mkdir -p clips/norm
for f in clips/S*_v*.mp4; do
  out="clips/norm/$(basename "$f")"
  if [ -n "$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$f")" ]; then
    ffmpeg -hide_banner -loglevel error -y -i "$f" \
      -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p" \
      -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -ar 48000 -ac 2 "$out"
  else
    ffmpeg -hide_banner -loglevel error -y -i "$f" -f lavfi -i anullsrc=r=48000:cl=stereo \
      -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p" \
      -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -shortest "$out"
  fi
done
```

If the loop picks up older takes too (`S01_v1`, `S01_v2`), point it at the chosen files
only. To trim one clip while normalising, add `-ss <start> -t <length>` before its
`-i` (accurate when re-encoding). Do this per shot with the in point and length you
chose. Several cuts from one long clip are several runs with different `-ss` and output
names (`S01a`, `S01b`).

## 3. Match each shot to its voice

Measure each narration take (`ffprobe -v error -show_entries format=duration -of
csv=p=0 audio/vo_S01.mp3`). A shot's length = lead (about 0.3 s) + take + tail (0.3-0.5
s). If the clip is longer, trim it. If it is shorter:

- shorten the line, or speed up a voice-over take (narration only, at most about 5%
  faster): `-af atempo=1.05` (keeps pitch; more sounds rushed). Never use it on audio that
  is already lip-synced or spoken on camera;
- or hold the last frame: `ffmpeg -i in.mp4 -vf "tpad=stop_mode=clone:stop_duration=1.0"
  -af "apad=pad_dur=1.0" ...` adds 1 s of the last frame. Use it for a beat or a card,
  not as a habit;
- or use the longer clip length on the next plan.

Write the plan as a table before you join. With crossfades of T seconds, shot i starts
at (sum of the earlier shot lengths) - (i - 1) x T. With hard cuts it is the plain sum.

| Shot | In | Length used | Starts at (T = 0.4) |
|---|---|---|---|
| S01 | 0.0 | 5.0 | 0.0 |
| S02 | 1.0 | 6.0 | 4.6 |
| S03 | 0.0 | 4.0 | 10.2 |

## 4. Join into a silent picture

**Hard cuts (default).** Cut on the start of each phrase. Normalised clips are
identical, so no re-encode is needed. Paths inside a concat list are relative to the
list file, not to where you run ffmpeg, so a list in `final/` needs `../`:

```bash
printf "file '../clips/norm/S01_v1.mp4'\nfile '../clips/norm/S02_v1.mp4'\nfile '../clips/norm/S03_v1.mp4'\n" > final/list.txt
ffmpeg -y -f concat -safe 0 -i final/list.txt -c copy final/joined.mp4
ffmpeg -y -i final/joined.mp4 -an -c:v copy final/picture.mp4
```

`joined.mp4` keeps each clip's own sound (use it in section 6 if you keep any).
`picture.mp4` is the same picture without sound, the file the later steps read.

**Crossfades.** Use sparingly: one soft dissolve (0.3-0.4 s) for a change of place, or
one `fadewhite` of 0.2 s on the reveal. Every transition shortens the total by its
length. Offsets follow `offset = running length - T`, and the running length grows by
the next clip minus T. List the clips and their video durations, then let awk write
and run the command:

```bash
for f in clips/norm/S01_v1.mp4 clips/norm/S02_v1.mp4 clips/norm/S03_v1.mp4; do
  echo "$f $(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$f")"
done > final/order.txt

awk -v T=0.4 '{f[NR]=$1; d[NR]=$2} END{
  printf "ffmpeg -hide_banner -loglevel error -y"; for(i=1;i<=NR;i++) printf " -i %s", f[i];
  printf " -filter_complex \""; L=d[1]; prev="[0:v]";
  for(i=2;i<=NR;i++){ out=(i==NR)?"[v]":"[v" i "]";
    printf "%s[%d:v]xfade=transition=fade:duration=%s:offset=%.3f%s%s", prev, i-1, T, L-T, out, (i<NR?";":"");
    L=L+d[i]-T; prev=out }
  printf "\" -map \"[v]\" -an -c:v libx264 -crf 18 -pix_fmt yuv420p final/picture.mp4\n" }' final/order.txt | sh
```

Three clips of 5, 6 and 4 s give 14.2 s. Other `transition=` names: `fadeblack`,
`fadewhite`, `dissolve`, `wipeleft`, `slideleft` (`ffmpeg -h filter=xfade` lists all).
To keep clip sound through crossfades, add the matching audio chain:
`[0:a][1:a]acrossfade=d=0.4[a1];[a1][2:a]acrossfade=d=0.4[a]` and map `[a]`. The awk
applies one transition and one length to every join. For one special join (a flash on
the reveal), run it on just those two clips and join the parts with hard cuts.

## 5. Narration track and phrase starts

One take per beat is simplest to fix: a bad take is one cheap regeneration. Place each
take at its shot's start plus the lead (4900 = 4.6 s + 0.3 s, from the table in section
3). `adelay` takes milliseconds per channel:

```bash
ffmpeg -y -i audio/vo_S01.mp3 -i audio/vo_S02.mp3 -i audio/vo_S03.mp3 -filter_complex \
"[0:a]adelay=300|300[a0];[1:a]adelay=4900|4900[a1];[2:a]adelay=10500|10500[a2];[a0][a1][a2]amix=inputs=3:duration=longest:normalize=0[vo]" \
-map "[vo]" -ar 48000 audio/narration_track.wav
```

If you have one long narration file instead (save it as `audio/narration_track.wav`),
find where each phrase starts. Each `silence_end` is a phrase start; cut the picture just
before it:

```bash
ffmpeg -hide_banner -i audio/narration_track.wav -af silencedetect=noise=-30dB:d=0.1 -f null - 2>&1 | grep silence_
```

Some lip-sync models want a specific audio format. `infinitalk/from-audio` rejects WAV.
This converts any take to MP3, 44.1 kHz stereo, a safe default for an `audio_url`:

```bash
ffmpeg -y -i audio/vo_S01.wav -ar 44100 -ac 2 -b:a 192k audio/vo_S01.mp3
```

## 6. Music and the mix

Find the drop and any dead stretch in a music take: this writes one RMS level per
second to `rms.txt` (`-inf` is silence):

```bash
ffmpeg -hide_banner -loglevel error -y -i audio/music.mp3 -af "asetnsamples=n=44100,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=rms.txt" -f null -
```

To land the drop on a reveal at second R, start the music at R minus the drop's time
in the track: delay it with `adelay=<ms>|<ms>`, or skip into it with
`atrim=start=<s>,asetpts=PTS-STARTPTS`. End the reel on a musical stop if the track has
one. If not, fade it out over about 1.5 s.

Mix the voice over the music with ducking. The music drops while the voice speaks.
Replace `14.2` (three places) with the picture duration (`ffprobe` it) and `12.7` with that minus 1.5:

```bash
ffmpeg -y -i audio/narration_track.wav -i audio/music.mp3 -filter_complex \
"[0:a]aresample=48000,apad=whole_dur=14.2,asplit=2[vo][sc];\
[1:a]aresample=48000,atrim=0:14.2,volume=0.5,afade=t=out:st=12.7:d=1.5[m];\
[m][sc]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400:makeup=1[md];\
[vo][md]amix=inputs=2:duration=longest:normalize=0[mix]" \
-map "[mix]" -t 14.2 -ar 48000 -ac 2 audio/mix.wav
```

`normalize=0` needs ffmpeg 4.4 or newer. Set the music `volume` by ear: the voice must
stay clear. To keep the clips' own sound (an on-camera line), take it from the joined
file as a third input: add `-i final/joined.mp4`, then
`[2:a]aresample=48000,volume=0.8[clip]` and `[clip][vo][md]amix=inputs=3:...`.
Sound effects (a whoosh under a whip cut, a tick when text appears) are more `adelay`
inputs mixed in at low level. Keep them under the voice.

## 7. Captions

Write `final/captions.srt` from the narration text and the measured timings:

```
1
00:00:00,300 --> 00:00:02,300
Most reels fail
in the first two seconds.

2
00:00:02,400 --> 00:00:04,000
This one starts with the answer.
```

- Word timings: from the speech service if it returns them. Otherwise run a local
  speech-to-text (whisper.cpp or mlx-whisper), or spread the words over the take by
  character count (close, not frame-exact). Never show a word before it is spoken.
- Chunk to 2-4 words. Bold sans, high contrast, one style for the whole reel. First
  text within about 0.5 s. Keep text out of the top 10% and the bottom 20% of the frame
  (platform buttons and captions sit there) and off faces. Clear a caption when its phrase
  ends.
- With crossfades, add each shot's start time (section 3) to its caption times.

Burn the captions into the picture. This needs the `subtitles` filter (libass). It was
not run during testing (the test build had no libass), so look at a frame before you
trust the size and position:

```bash
ffmpeg -y -i final/picture.mp4 -vf "subtitles=final/captions.srt:force_style='FontName=Arial,FontSize=12,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=60'" -an -c:v libx264 -crf 18 -pix_fmt yuv420p final/picture_cap.mp4
```

For an .srt, libass sizes fonts against a 288-line-high script: for a 1920-high picture
`FontSize=12` is about 80 px. `MarginV=60` puts the text about 400 px above the bottom.
Adjust by looking at a frame. Use relative paths: Windows drive letters need escaping
inside filters.

If the filter is missing:

1. Use an ffmpeg build with libass (on macOS,
   `brew tap homebrew-ffmpeg/ffmpeg && brew install homebrew-ffmpeg/ffmpeg/ffmpeg`
   adds one). Ask the person before installing.
2. Or draw each caption as a transparent PNG (Pillow, ImageMagick) and overlay it for
   its time window (the syntax is tested; the PNG step is yours):
   `-i cap1.png -filter_complex "[0:v][1:v]overlay=(W-w)/2:1380:enable='between(t,0.3,2.3)'[v]"`.
   Chain one overlay per caption.
3. Or ship a soft track plus the sidecar file: this works everywhere but many platforms
   ignore embedded subtitles, so say so:
   `ffmpeg -i final/picture.mp4 -i final/captions.srt -map 0 -map 1 -c copy -c:s mov_text final/picture_soft.mp4`.

If the reel has no burned captions, copy `final/picture.mp4` to `final/picture_cap.mp4`.

## 8. Loudness and export

Normalise to about -14 LUFS for social. Measure first:

```bash
ffmpeg -hide_banner -i audio/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p'
```

Copy the five numbers (`input_i`, `input_tp`, `input_lra`, `input_thresh`,
`target_offset`) into the second pass, which also muxes the picture and the sound:

```bash
ffmpeg -y -i final/picture_cap.mp4 -i audio/mix.wav -filter_complex \
"[1:a]loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=<input_i>:measured_TP=<input_tp>:measured_LRA=<input_lra>:measured_thresh=<input_thresh>:offset=<target_offset>:linear=true[a]" \
-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest final/<Project>_v1.0.mp4
```

A quicker one-pass version is `-af loudnorm=I=-14:TP=-1.5:LRA=11` on the audio. It is
less exact. Generated speech has been seen peaking near full scale before
normalisation, so expect the level to come down, not pass through. Never overwrite a
delivered file: the next version is `v1.1`.

## 9. Final checks

```bash
# spec: expect h264 1080x1920 30/1 yuv420p, aac 48000 stereo, the planned duration
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels -of default=nw=1 final/<Project>_v1.0.mp4
# the whole reel on one image, one frame every 2 s (use fps=1/3 for a 60 s reel)
ffmpeg -y -i final/<Project>_v1.0.mp4 -vf "fps=1/2,scale=270:-1,tile=4x2:padding=6:margin=6:color=white" -frames:v 1 -update 1 final/Check_Sheet.png
# a still at a caption or cut time (check legibility, overlap, faces)
ffmpeg -y -ss 3.2 -i final/<Project>_v1.0.mp4 -frames:v 1 -update 1 final/Check_3.2s.png
# loudness (input_i should be within about 1 LU of -14) and the true peak
ffmpeg -hide_banner -i final/<Project>_v1.0.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p'
# dead air, black frames, frozen frames
ffmpeg -hide_banner -i final/<Project>_v1.0.mp4 -af silencedetect=noise=-50dB:d=0.5 -vn -f null - 2>&1 | grep silence_
ffmpeg -hide_banner -i final/<Project>_v1.0.mp4 -vf "blackdetect=d=0.1:pix_th=0.10,freezedetect=n=0.003:d=1" -an -f null - 2>&1 | grep -E "black_start|freeze_start|freeze_end"
```

Open the check images. Does the first frame show something and the first text appear
fast? Are captions readable, gone when the phrase ends, and clear of faces and the
platform buttons? Does the last frame hold a call to action? Do cuts land on phrase
starts (sample a frame either side of each)? A freeze report is expected on a held
card or still: it is a problem only on a shot that should move. Then give the person
the draft and ask them to watch and listen to it once; you cannot judge the sound.

## Pitfalls

- A looped still image as an input (`-loop 1`, an end card) is infinite. Always bound
  the output with `-t <seconds>`; with a looped image `-shortest` is not reliable.
- Different sizes, frame rates or missing audio streams break `concat` and `xfade`.
  Normalise first (section 2).
- `-ss` before `-i` is fast and accurate when re-encoding but snaps to keyframes with
  `-c copy`. Cut with a re-encode when you need an exact frame.
- Every `xfade` shortens the total by its duration. Recompute the shot start times
  (section 3) before placing audio and captions.
- Check the filter list (top of this file) before promising burned captions.
