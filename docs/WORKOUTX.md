# Personal openGym WorkoutX Android build

Settings → Workout → Animações WorkoutX: register your own API key and activate.
No keys are embedded in the code, APK, exported training data, or GitHub workflow.
Native keys use the existing secure-storage adapter, falling back to session memory;
web keys stay in memory only. The enabled preference is device-local.

Only catalogue IDs explicitly originating in ExerciseDB can use the WorkoutX legacy
endpoint. Only exact/equivalent matches are substituted automatically. Other matches,
new openGym IDs, offline conditions and failed playback retain the built-in animation.
This is not a replacement of the entire catalogue. Female counterparts are used when
available. Media links are short-lived, kept in memory only. Direct streaming bypasses
the built-in blob/offline media cache; clips are not bulk-downloaded or bundled.

WorkoutX Free delivers watermarked previews. 720p/30fps requires a paid plan.
References: https://workoutxapp.com/docs.html and https://workoutxapp.com/v2-migration.html

The APK has its own application ID: com.sergiosmoc.opengym.workoutx.test (debug).
It installs beside the official app. Export/import an openGym backup to transfer history;
do not uninstall the original app. Existing AGPL and media notices remain applicable.
This is a non-commercial personal fork; commercial forks need their own media licence.

The workflow .github/workflows/workoutx-apk.yml builds a debug-signed test APK on
push to workoutx. Download the openGym-WorkoutX-APK artifact after a successful run.
A stable private release signing key is needed for production updates; none is committed.
Each fresh CI debug key may require reinstalling this test app (export a backup first).

Local checks: targeted unit/media/settings tests and npm run build:mobile.
Live WorkoutX playback and physical Fold5 behavior require the user's key and device;
these are not claimed as tested. The upstream key and signing identity are not available.
