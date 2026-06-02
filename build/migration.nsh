; NSIS migration helper — v1.2.x (perMachine) → v1.2.3+ (oneClick, perUser)
;
; 단계별 번호로 로그 작성 — hang 시 마지막 번호로 위치 특정.
; 로그 경로: %TEMP%\orbit-migration.log

!macro customInit
  FileOpen $9 "$TEMP\orbit-migration.log" w
  FileWrite $9 "[1] start$\r$\n"

  ; ── 옛 install 검색 ──
  SetRegView 64
  ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  ReadRegStr $6 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation"
  ${If} $0 == ""
    SetRegView 32
    ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
    ReadRegStr $6 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation"
  ${EndIf}
  SetRegView default
  FileWrite $9 "[2] uninstall string = $0$\r$\n"
  FileWrite $9 "[2a] install location = $6$\r$\n"

  ${If} $0 != ""
    FileWrite $9 "[3] banner show$\r$\n"
    Banner::show /NOUNLOAD "이전 버전을 정리하는 중..."

    ; ── backup ──
    FileWrite $9 "[4] backup start (src=$APPDATA\orbit, dst=$TEMP\OrbitUserDataMigration)$\r$\n"
    RMDir /r "$TEMP\OrbitUserDataMigration"
    nsExec::Exec '"$SYSDIR\robocopy.exe" "$APPDATA\orbit" "$TEMP\OrbitUserDataMigration" /E /R:1 /W:1 /NFL /NDL /NJH /NJS'
    Pop $1
    FileWrite $9 "[5] backup robocopy exit = $1$\r$\n"

    ; ── 백업 검증 게이트 (파괴 작업 전 필수) ──
    ; 원본에 Local Storage(설정/관심종목)가 있는데 백업본엔 없으면 = 백업 실패.
    ; robocopy exit만 보면 잠긴 파일 등 부분 실패를 놓칠 수 있어, 실제 백업 결과물을 직접 검증한다.
    ; 백업 실패 시 파괴 작업(구 uninstaller)을 진행하지 않고 마이그레이션을 중단 → 구버전·데이터 그대로 보존.
    ${If} ${FileExists} "$APPDATA\orbit\Local Storage\*"
    ${AndIfNot} ${FileExists} "$TEMP\OrbitUserDataMigration\Local Storage\*"
      FileWrite $9 "[5a] ABORT — 백업 실패 (robocopy exit=$1), 구버전 유지$\r$\n"
      FileClose $9
      Banner::destroy
      IfSilent +2
      MessageBox MB_OK|MB_ICONEXCLAMATION \
        "사용자 데이터 백업에 실패해 안전을 위해 업데이트를 중단했어요.$\r$\n$\r$\n기존 버전과 설정은 그대로 유지됩니다.$\r$\n잠시 후 다시 시도해주세요."
      Quit
    ${EndIf}

    ; ── 옛 uninstaller (UAC 트리거) ──
    ; 옛 uninstaller가 사일런트 모드에서 자기 HKLM 레지스트리 정리를 빠뜨리는 버그 확인됨.
    ; → 배치 파일 1개로 uninstall + reg delete를 묶어 단일 UAC에서 elevated 실행.
    ; Banner는 UAC 가리지 않게 destroy 후 재표시.
    Banner::destroy
    FileWrite $9 "[6a] banner destroyed before UAC$\r$\n"

    ; 배치 파일 작성 — 단일 UAC로 다음을 elevated 실행:
    ;   1) 옛 uninstaller /S (파일 제거 + deleteAppData 처리)
    ;   2) timeout 3 (비동기 cleanup 대기)
    ;   3) install location 폴더 강제 삭제 (uninstaller가 _?= 때문에 자기 자신 못 지움 보완)
    ;   4) HKLM uninstall key 강제 삭제 (사일런트 모드에서 빠뜨리는 경우 보완)
    FileOpen $5 "$TEMP\OrbitMigCleanup.bat" w
    FileWrite $5 "@echo off$\r$\n"
    FileWrite $5 'start /wait "" $0 /S _?=$INSTDIR$\r$\n'
    FileWrite $5 'timeout /t 3 /nobreak >nul$\r$\n'
    ${If} $6 != ""
      FileWrite $5 'rmdir /s /q "$6" 2>nul$\r$\n'
    ${EndIf}
    FileWrite $5 'reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" /f 2>nul$\r$\n'
    FileWrite $5 'reg delete "HKLM\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" /f 2>nul$\r$\n'
    FileClose $5
    FileWrite $9 "[6b] cleanup batch written$\r$\n"

    FileWrite $9 "[6] ExecShellWait start (batch as admin)$\r$\n"
    ExecShellWait "runas" "$TEMP\OrbitMigCleanup.bat" "" SW_HIDE
    FileWrite $9 "[7] ExecShellWait returned$\r$\n"

    Delete "$TEMP\OrbitMigCleanup.bat"

    ; UAC 후 banner 재표시
    Banner::show /NOUNLOAD "정리 마무리하는 중..."
    FileWrite $9 "[7a] banner reshown$\r$\n"

    ; ── 비동기 cleanup 대기 ──
    Sleep 5000
    FileWrite $9 "[8] sleep 5s done$\r$\n"

    ; ── restore ──
    FileWrite $9 "[9] restore start$\r$\n"
    nsExec::Exec '"$SYSDIR\robocopy.exe" "$TEMP\OrbitUserDataMigration" "$APPDATA\orbit" /E /R:1 /W:1 /NFL /NDL /NJH /NJS'
    Pop $1
    FileWrite $9 "[10] restore robocopy exit = $1$\r$\n"

    ; ── 검증 ──
    ${If} ${FileExists} "$APPDATA\orbit\Local Storage\*"
      FileWrite $9 "[11] restore VERIFIED — Local Storage present$\r$\n"
      RMDir /r "$TEMP\OrbitUserDataMigration"
      FileWrite $9 "[12] backup cleaned$\r$\n"
    ${Else}
      FileWrite $9 "[11] restore FAILED — backup KEPT at $TEMP\OrbitUserDataMigration$\r$\n"
      ; 사용자에게 즉시 알림 + 수동 복구 경로 안내. 사일런트 모드에선 dialog 건너뜀.
      Banner::destroy
      IfSilent +2
      MessageBox MB_OK|MB_ICONEXCLAMATION \
        "이전 버전의 설정/관심종목 복원에 실패했어요.$\r$\n$\r$\n백업 파일이 아래 경로에 남아있어요:$\r$\n$TEMP\OrbitUserDataMigration$\r$\n$\r$\n수동으로 %APPDATA%\orbit에 복사하면 복구할 수 있어요."
      Banner::show /NOUNLOAD "설치 마무리하는 중..."
    ${EndIf}

    Banner::destroy
    FileWrite $9 "[13] banner destroyed, migration done$\r$\n"
  ${Else}
    FileWrite $9 "[skip] no old install$\r$\n"
  ${EndIf}

  FileClose $9
!macroend

; ── 사용자 직접 uninstall 시 "앱 데이터도 함께 삭제?" 선택 ──
!macro customUnInstall
  IfSilent skip_data_prompt
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 \
    "앱 데이터(설정 / 관심종목 / 그룹)도 함께 삭제하시겠어요?$\r$\n$\r$\n'아니요'를 선택하면 다시 설치할 때 이전 설정이 자동 복원돼요." \
    IDNO skip_data_prompt
    RMDir /r "$APPDATA\orbit"
  skip_data_prompt:
!macroend
