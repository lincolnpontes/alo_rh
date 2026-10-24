param([string]$SigningFile = "$PSScriptRoot/.local/android-signing/signing.json")
$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
if (!(Test-Path -LiteralPath $SigningFile)) { throw 'Assinatura ausente. Veja docs/ANDROID.md; nunca gere outra chave para atualizar uma instalação existente.' }
$signing = Get-Content -LiteralPath $SigningFile -Raw | ConvertFrom-Json
$env:RH_KEYSTORE_PATH = $signing.keystore
$env:RH_KEYSTORE_PASSWORD = $signing.password
# Some Gradle test workers on Windows cannot load classes from an accented project path.
# Build an explicit allowlist in a fresh ASCII-only folder, never copying private data.
$staging = Join-Path $env:LOCALAPPDATA ('AloRHBuild/' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $staging | Out-Null
Copy-Item -LiteralPath "$PSScriptRoot/index.html","$PSScriptRoot/manifest.json","$PSScriptRoot/js","$PSScriptRoot/css","$PSScriptRoot/icons" -Destination $staging -Recurse
New-Item -ItemType Directory -Force "$staging/android/app" | Out-Null
Copy-Item -LiteralPath "$PSScriptRoot/android/gradle","$PSScriptRoot/android/gradlew","$PSScriptRoot/android/gradlew.bat","$PSScriptRoot/android/build.gradle","$PSScriptRoot/android/settings.gradle","$PSScriptRoot/android/gradle.properties" -Destination "$staging/android" -Recurse
Copy-Item -LiteralPath "$PSScriptRoot/android/app/build.gradle","$PSScriptRoot/android/app/proguard-rules.pro","$PSScriptRoot/android/app/src" -Destination "$staging/android/app" -Recurse
$staging | Set-Content "$PSScriptRoot/.local/android-signing/last-build-path.txt"
try {
    Push-Location "$staging/android"
    try {
        & .\gradlew.bat --no-daemon :app:testReleaseUnitTest :app:lintRelease :app:assembleRelease
        if ($LASTEXITCODE -ne 0) { throw 'Falha nos testes ou na compilação Android.' }
    } finally { Pop-Location }
    $buildTools = Join-Path $env:ANDROID_HOME 'build-tools/36.0.0'
    $apk = Join-Path $staging 'android/app/build/outputs/apk/release/app-release.apk'
    & "$buildTools/apksigner.bat" verify --verbose --print-certs $apk
    if ($LASTEXITCODE -ne 0) { throw 'Assinatura APK inválida.' }
    New-Item -ItemType Directory -Force "$PSScriptRoot/dist" | Out-Null
    Copy-Item -LiteralPath $apk -Destination "$PSScriptRoot/dist/Alo-RH-v1.4.1.apk"
    Get-FileHash "$PSScriptRoot/dist/Alo-RH-v1.4.1.apk" -Algorithm SHA256
} finally {
    Remove-Item Env:RH_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:RH_KEYSTORE_PATH -ErrorAction SilentlyContinue
}
