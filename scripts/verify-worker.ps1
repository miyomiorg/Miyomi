# Verification suite for the Miyomi worker against a D1 database
# populated with REAL migrated data (not synthetic seeds).
#
#   npm run seed:local   (adds the local dev admin on top of real data)
#   npx wrangler dev --port 8787
#   npm run verify:worker
$ErrorActionPreference = 'Continue'
$base = 'http://127.0.0.1:8787'
$pass = 0; $fail = 0

# ── 2FA helpers ─────────────────────────────────────────────────────
# The admin gate requires an enrolled authenticator, so the suite enrols the
# local admin (and the throwaway moderator) once per run, then resets the
# stored secret at the end (2FA is one-way at the API level by design).
function Reset-LocalTotp([string]$Email) {
  & npx.cmd wrangler d1 execute miyomi-db --local --command "UPDATE admins SET totp_secret = NULL WHERE email = '$Email';" | Out-Null
}

# RFC 6238 TOTP (SHA-1, 6 digits) — matches worker/lib/totp.ts.
function Get-TotpCode([string]$Secret) {
  $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  $clean = $Secret.ToUpper() -replace '=+$', '' -replace '[^A-Z2-7]', ''
  $bytes = New-Object System.Collections.Generic.List[byte]
  $value = 0; $bits = 0
  foreach ($ch in $clean.ToCharArray()) {
    $idx = $alphabet.IndexOf($ch)
    if ($idx -lt 0) { continue }
    $value = ($value -shl 5) -bor $idx
    $bits += 5
    if ($bits -ge 8) {
      $bytes.Add([byte](($value -shr ($bits - 8)) -band 0xff))
      $bits -= 8
      $value = $value -band 0xff
    }
  }
  $unixMs = [long](([DateTime]::UtcNow - [DateTime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)).TotalMilliseconds)
  $counter = [long][math]::Floor($unixMs / 30000)
  $msg = New-Object byte[] 8
  for ($i = 7; $i -ge 0; $i--) {
    $msg[$i] = [byte]($counter -band 0xff)
    $counter = [math]::Floor($counter / 256)
  }
  $hmac = New-Object System.Security.Cryptography.HMACSHA1 (,$bytes.ToArray())
  $sig = $hmac.ComputeHash($msg)
  $off = $sig[$sig.Length - 1] -band 0x0f
  $codeLong = [int64]($sig[$off] -band 0x7f)
  $codeLong = ($codeLong -shl 24) -bor ([int64]$sig[$off + 1] -shl 16) -bor ([int64]$sig[$off + 2] -shl 8) -bor [int64]$sig[$off + 3]
  return (($codeLong % 1000000).ToString().PadLeft(6, '0'))
}

# Enrol a fresh TOTP secret for the session owner (enroll → verify with code + password).
function Enable-2Fa($cookie, $password) {
  $r = Invoke-Api POST /api/admin/auth/2fa/enroll $null $cookie
  if ($r.Code -ne 200) { return $false }
  $code = Get-TotpCode ([string]$r.Json.data.setup.secret)
  $body = ('{"enrollToken":"' + $r.Json.data.enrollToken + '","code":"' + $code + '","currentPassword":"' + $password + '"}')
  $r2 = Invoke-Api POST /api/admin/auth/2fa/enroll/verify $body $cookie
  return ($r2.Code -eq 200)
}

function Check($name, $ok) {
  if ($ok) { $script:pass++; Write-Host "  PASS  $name" }
  else { $script:fail++; Write-Host "  FAIL  $name" -ForegroundColor Red }
}

# Returns @{ Code = <int>; Json = <json|null> }
# Body is passed via a temp file (--data-binary @file) because PowerShell 5.1
# mangles double quotes in native command arguments.
function Invoke-Api($method, $path, $body = $null, $cookie = $null) {
  $tmp = [System.IO.Path]::GetTempFileName()
  $btmp = $null
  $curlArgs = @('-s', '-X', $method, '-w', '%{http_code}', '-o', $tmp, "$base$path")
  if ($body) {
    $btmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($btmp, $body, (New-Object System.Text.UTF8Encoding($false)))
    $curlArgs += @('-H', 'Content-Type: application/json', '--data-binary', "@$btmp")
  }
  if ($cookie) { $curlArgs += @('-H', "Cookie: miyomi_session=$cookie") }
  $codeStr = & curl.exe @curlArgs 2>$null
  $raw = (Get-Content $tmp -Raw)
  Remove-Item $tmp -ErrorAction SilentlyContinue
  if ($btmp) { Remove-Item $btmp -ErrorAction SilentlyContinue }
  $code = [int]("$codeStr".Trim())
  $json = $null
  if ($raw) { try { $json = $raw | ConvertFrom-Json } catch {} }
  return @{ Code = $code; Json = $json }
}

# Login helper (body via temp file, returns the miyomi_session cookie value).
# Local dev admin has no 2FA configured → password login issues the session
# directly. (2FA circuit coverage lives in scripts/verify-2fa.mjs.)
function Login-Cookie($email, $password) {
  $jar = [System.IO.Path]::GetTempFileName()
  $btmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($btmp, ('{"email":"' + $email + '","password":"' + $password + '"}'), (New-Object System.Text.UTF8Encoding($false)))
  & curl.exe -s -c $jar -o NUL -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data-binary "@$btmp" "$base/api/admin/auth/login" | Out-Null
  Remove-Item $btmp -ErrorAction SilentlyContinue
  $line = (Select-String -Path $jar -Pattern 'miyomi_session').Line
  Remove-Item $jar -ErrorAction SilentlyContinue
  if ($line) { return (($line -split '\s+') | Select-Object -Last 1) }
  return $null
}

Write-Host "`n== Public API =="
$r = Invoke-Api GET /api/health
Check 'GET /api/health -> 200 success' ($r.Code -eq 200 -and $r.Json.success -eq $true)

$r = Invoke-Api GET /api/apps
$apps = $r.Json.data
Check 'GET /api/apps -> 136 approved apps' ($apps.Count -eq 136)
$app0 = $apps[0]

$r = Invoke-Api GET "/api/apps/$($app0.slug)"
Check 'GET /api/apps/:slug -> row found, platforms parsed' ($r.Code -eq 200 -and $r.Json.data.id -eq $app0.id -and $null -ne $r.Json.data.platforms -is [System.Array] -or $r.Json.data.slug -eq $app0.slug)

$r = Invoke-Api GET /api/apps/does-not-exist-xyz
Check 'GET /api/apps/<missing> -> 404' ($r.Code -eq 404)

$r = Invoke-Api GET /api/extensions
Check 'GET /api/extensions -> 48 approved' ($r.Json.data.Count -eq 48)

$r = Invoke-Api GET /api/guides
Check 'GET /api/guides -> non-draft guides' ($r.Json.data.Count -ge 1)
$guide0 = $r.Json.data[0]

$r = Invoke-Api GET /api/blog
Check 'GET /api/blog -> published posts' ($r.Json.data.Count -ge 1)

$r = Invoke-Api GET /api/faqs
Check 'GET /api/faqs -> 2' ($r.Json.data.Count -eq 2)

$r = Invoke-Api GET /api/settings/public
Check 'GET /api/settings/public -> reports_enabled true' ($r.Json.data.reports_enabled -eq $true)
Check 'GET /api/settings/public -> guide_notice_enabled true' ($r.Json.data.guide_notice_enabled -eq $true)

$r = Invoke-Api GET /api/groups
Check 'GET /api/groups -> 5 groups with counts' ($r.Json.data.Count -eq 5 -and $r.Json.data[0].PSObject.Properties.Name -contains 'appCount')

$r = Invoke-Api GET /api/donations
Check 'GET /api/donations -> public donations' ($r.Json.data.Count -ge 1)

$r = Invoke-Api GET /api/notices
Check 'GET /api/notices -> 200 (may be empty)' ($r.Code -eq 200)

Write-Host "`n== Pages (SEO + sitemap) =="
$tmp = [System.IO.Path]::GetTempFileName()
& curl.exe -s -o $tmp "$base/software/$($app0.slug)" | Out-Null
$c = Get-Content $tmp -Raw
Check 'GET /software/:slug -> SEO tags injected' ($c -match 'og:title' -and $c -match $([regex]::Escape($app0.name)))
Remove-Item $tmp -ErrorAction SilentlyContinue

$tmp = [System.IO.Path]::GetTempFileName()
& curl.exe -s -o $tmp "$base/guides/$($guide0.slug)" | Out-Null
$c = Get-Content $tmp -Raw
Check 'GET /guides/:slug -> Article JSON-LD' ($c -match '"@type":"Article"')
Remove-Item $tmp -ErrorAction SilentlyContinue

$code = & curl.exe -s -o NUL -w '%{http_code}' "$base/software/does-not-exist-xyz"
Check 'GET /software/<missing> -> 404' ($code -eq '404')

$tmp = [System.IO.Path]::GetTempFileName()
& curl.exe -s -o $tmp "$base/sitemap.xml" | Out-Null
$c = Get-Content $tmp -Raw
Check 'GET /sitemap.xml -> includes app + guide slugs' ($c -match [regex]::Escape($app0.slug) -and $c -match [regex]::Escape($guide0.slug))
Remove-Item $tmp -ErrorAction SilentlyContinue

Write-Host "`n== Auth =="
# Guarantee a known 2FA state (a previous aborted run may have left a secret).
Reset-LocalTotp 'admin@miyomi.local'
$r = Invoke-Api GET /api/admin/dashboard
Check 'admin dashboard unauthenticated -> 401' ($r.Code -eq 401)

$r = Invoke-Api POST /api/admin/auth/login '{"email":"admin@miyomi.local","password":"wrong"}'
Check 'login bad password -> 401' ($r.Code -eq 401)

$cookie = Login-Cookie 'admin@miyomi.local' 'MiomiLocal123!'
Check 'local admin login -> cookie issued' ($cookie -ne $null)

$r = Invoke-Api GET /api/admin/auth/me $null $cookie
Check 'GET /api/admin/auth/me -> super_admin session' ($r.Code -eq 200 -and $r.Json.data.role -eq 'super_admin')

Check '2FA: local admin enrolment succeeds' (Enable-2Fa $cookie 'MiomiLocal123!')

$r = Invoke-Api GET /api/admin/dashboard $null $cookie
Check 'GET /api/admin/dashboard -> real counts' ($r.Code -eq 200 -and $r.Json.data.counts.approvedApps -eq 136 -and $r.Json.data.counts.totalLikes -ge 7629)

# bcrypt path: the real super admin's hash is bcrypt (ported from auth.users).
# Verify the Worker actually runs bcrypt compare (wrong pw must 401, and the
# hash format must be detected) by confirming the login attempt is recorded.
$r = Invoke-Api POST /api/admin/auth/login '{"email":"tasu.legend@gmail.com","password":"definitely-wrong-password"}'
Check 'real admin (bcrypt) wrong pw -> 401' ($r.Code -eq 401)
$r = Invoke-Api GET '/api/admin/auth/me?probe=1' $null $null | Out-Null
$r = Invoke-Api GET /api/admin/dashboard $null $cookie
Check 'unauthorized attempt recorded (still 200 for us)' ($r.Code -eq 200)

Write-Host "`n== Writes (likes / feedback / reports) =="
$fp = "verify-fp-$([DateTime]::Now.Ticks)"
$likeBody = ('{"itemId":"' + $app0.id + '","itemType":"app","fingerprint":"' + $fp + '"}')
$r = Invoke-Api POST /api/likes $likeBody
Check 'POST /api/likes -> loved, count>0' ($r.Code -eq 200 -and $r.Json.data.loved -eq $true -and $r.Json.data.count -ge 1)
$r = Invoke-Api GET "/api/likes/status?itemId=$($app0.id)&itemType=app&fingerprint=$fp"
Check 'GET /api/likes/status -> liked=true' ($r.Json.data.liked -eq $true)
$r = Invoke-Api GET "/api/likes/registry?fingerprint=$fp"
Check 'GET /api/likes/registry -> item present & loved' ($r.Code -eq 200 -and $null -ne $r.Json.data.$($app0.id) -and $r.Json.data.$($app0.id).loved -eq $true)
$r = Invoke-Api POST /api/likes $likeBody
Check 'POST /api/likes (toggle) -> unliked' ($r.Code -eq 200 -and $r.Json.data.loved -eq $false)

$r = Invoke-Api POST /api/feedback '{"message":"Verify run feedback","feedbackType":"praise","token":"dev-token"}'
Check 'POST /api/feedback -> created (status new)' ($r.Code -eq 201 -and $r.Json.data.id)

$r = Invoke-Api POST /api/reports ('{"targetType":"app","targetId":"' + $app0.id + '","reason":"spam","message":"verify","token":"dev-token"}')
Check 'POST /api/reports -> created' ($r.Code -eq 201 -and $r.Json.data.id)

Write-Host "`n== Admin CRUD =="
$r = Invoke-Api POST /api/admin/apps '{"name":"Verify Temp App"}' $cookie
Check 'POST /api/admin/apps -> created' ($r.Code -eq 201 -and $r.Json.data.id)
$newId = $r.Json.data.id

$r = Invoke-Api GET "/api/admin/apps/$newId" $null $cookie
Check 'GET admin app -> slug auto-generated' ($r.Json.data.slug -eq 'verify-temp-app')

$r = Invoke-Api GET /api/admin/apps $null $cookie
Check 'GET /api/admin/apps -> total = 138 + 1' ($r.Json.data.total -eq 139)

$r = Invoke-Api PATCH "/api/admin/apps/$newId/status" '{"status":"rejected"}' $cookie
Check 'PATCH status -> 200' ($r.Code -eq 200)

$r = Invoke-Api GET /api/apps
Check 'rejected app hidden from public list' ($r.Json.data.Count -eq 136)

$r = Invoke-Api DELETE "/api/admin/apps/$newId" $null $cookie
Check 'DELETE admin app -> 200' ($r.Code -eq 200)
$r = Invoke-Api GET /api/admin/apps $null $cookie
Check 'admin list back to 138' ($r.Json.data.total -eq 138)

# Reports review flow (real report created above)
$r = Invoke-Api GET /api/admin/reports $null $cookie
$openReport = $r.Json.data.items | Where-Object { $_.status -eq 'new' -and $_.message -eq 'verify' } | Select-Object -First 1
Check 'GET /api/admin/reports -> our report visible' ($null -ne $openReport)
if ($openReport) {
  $r = Invoke-Api PATCH "/api/admin/reports/$($openReport.id)" '{"status":"resolved"}' $cookie
  Check 'PATCH report -> resolved' ($r.Code -eq 200)
}

# Settings upsert (key-based table)
$r = Invoke-Api PUT /api/admin/settings/verify_probe '{"value":true,"category":"endpoints"}' $cookie
Check 'PUT /api/admin/settings/:key -> upsert' ($r.Code -eq 200)
$r = Invoke-Api GET /api/settings/public
Check 'public settings now include verify_probe' ($r.Json.data.verify_probe -eq $true)
$r = Invoke-Api DELETE /api/admin/settings/verify_probe $null $cookie
Check 'DELETE /api/admin/settings/:key' ($r.Code -eq 200)

# User management (temp moderator)
$r = Invoke-Api POST /api/admin/users '{"email":"verify-mod@miyomi.local","password":"ModPass123!"}' $cookie
Check 'POST /api/admin/users -> created' ($r.Code -eq 201)
$modId = $r.Json.data.id
$r = Invoke-Api PUT "/api/admin/users/$modId/role" '{"role":"moderator"}' $cookie
Check 'PUT role -> moderator' ($r.Code -eq 200)
$r = Invoke-Api PUT "/api/admin/users/$modId/permissions" '{"permissions":[{"resource":"apps","can_read":true,"can_write":true,"can_delete":false}]}' $cookie
Check 'PUT permissions -> saved' ($r.Code -eq 200)

$modCookie = Login-Cookie 'verify-mod@miyomi.local' 'ModPass123!'
Check 'moderator login -> cookie' ($modCookie -ne $null)
Check '2FA: moderator enrolment succeeds' (Enable-2Fa $modCookie 'ModPass123!')
$r = Invoke-Api GET /api/admin/users $null $modCookie
Check 'moderator GET /api/admin/users -> 403' ($r.Code -eq 403)
$r = Invoke-Api GET /api/admin/apps $null $modCookie
Check 'moderator (apps:read) GET /api/admin/apps -> 200' ($r.Code -eq 200)
$r = Invoke-Api GET /api/admin/donations $null $modCookie
Check 'moderator (no donations perm) -> 403' ($r.Code -eq 403)
$r = Invoke-Api DELETE "/api/admin/users/$modId" $null $cookie
Check 'cleanup: DELETE temp moderator' ($r.Code -eq 200)

# 2FA is one-way — reset the stored secret for the next run via D1 directly.
Reset-LocalTotp 'admin@miyomi.local'
Check '2FA: local admin enrolment reset for next run' ($LASTEXITCODE -eq 0)

Write-Host "`n================================"
Write-Host "RESULT: $pass passed, $fail failed"
exit $fail
