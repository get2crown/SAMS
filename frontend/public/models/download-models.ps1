<#
  Copies face-api model weights from the installed @vladmandic/face-api
  package into public/models. Run this after any face-api version bump,
  or if these files are ever missing/corrupted.

  We copy from node_modules rather than fetching from GitHub so the
  weights always match the installed package version exactly, and so
  setup works offline. (The original version of this script pulled
  individual shard files from the old, unmaintained face-api.js repo
  and silently omitted face_recognition_model's second shard, which
  produced a corrupt/truncated model — hence "copy from node_modules"
  instead of hand-listing shard files.)
#>

$ErrorActionPreference = 'Stop'
$src = Join-Path $PSScriptRoot '..\..\node_modules\@vladmandic\face-api\model'
$models = @(
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model.bin',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model.bin',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model.bin'
)

foreach ($model in $models) {
    Copy-Item -Path (Join-Path $src $model) -Destination $PSScriptRoot -Force
    Write-Host "Copied $model"
}

Write-Host "All models copied from node_modules/@vladmandic/face-api."
