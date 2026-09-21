# DamDa 최종 감사

2026-09-20 · 기준 commit `26d136e` · `D:/dev/Damda/DamDa`

`AUDIT_ASTRA.md`의 판단을 전제하지 않고 현재 소스, SQL, 실행 경로와 재현 결과를 대조했다. 기존 10개 발견 사항은 **CONFIRMED**, 조건부 2개는 **UNCERTAIN**이다. 추가로 **High 2개**를 확인했다. 확인된 Critical은 없다. 소스·설정·테스트는 수정하지 않았으며 새로 작성한 파일은 이 보고서뿐이다.

## CONFIRMED — 신규

| Severity | File | Issue | Evidence | Confidence |
|---|---|---|---|---|
| High | `dist/account-client.js:40`, `dist/production-ui.js:62` | 공유 생성 중 계정이 바뀌면 이전 사용자의 snapshot이 새 사용자의 소유로 공개 저장된다. | `publish(data)`는 `await flush()` 이후의 `state.user.id`를 INSERT에 사용한다. A의 저장 응답을 지연시키고 `SIGNED_IN`으로 B를 로드한 VM 재현에서 A snapshot이 `owner_id=B`로 INSERT됐다. UI의 `uid` 비교는 INSERT 완료 후라 이미 생성된 행을 막거나 삭제하지 못한다. 다른 탭의 인증 변경처럼 공유 작업 중 계정 전환이 발생해야 하는 race이며, RLS 우회가 아니라 새 계정 권한으로 잘못된 데이터를 쓰는 문제다. | High |
| High | `dist/modern-app.js:75` | 이전 사용자의 사진 업로드가 계정 전환 후 새 사용자의 프로필에 저장될 수 있다. | `await createImageBitmap(file)` 뒤에 업로드 시작 당시 계정/model 확인 없이 전역 `model.photo`를 바꾸고 `persist()`한다. 실제 브라우저·SDK와 모의 API에서 유효한 PNG의 디코딩 완료를 지연 → A 로그아웃 → B 로그인 → 디코딩 완료 순서로 실행하자 B의 서버 저장 payload에 A의 사진이 들어갔다. 재현에서는 시간차를 의도적으로 만들었다. | High |

## CONFIRMED — 기존 보고서 재검증

번호는 `AUDIT_ASTRA.md`의 「확인된 문제」 표 순서다.

| Severity | File | Issue | Evidence | Confidence |
|---|---|---|---|---|
| Medium | `dist/production-ui.js:62`, `dist/production-ui.js:65` | 기존 1: 체험 모드의 공유 링크·QR은 다른 브라우저에서 열리지 않는다. | guest 공유는 `damda-guest-shares` localStorage에만 저장하며 DB INSERT가 없다. 실제 UI로 만든 링크를 독립 browser context에서 열자 공개 RPC에 대응하는 행이 없어 오류가 표시됐다. 생성 화면은 로그인 없이 누구나 열 수 있다고 안내한다. | High |
| Medium | `dist/production-ui.js:47`, `dist/production-ui.js:93` | 기존 2: 체험 모드의 ‘계정 만들고 저장하기’가 가입 화면으로 이동하지 않는다. | `guest-signup`은 hash만 바꾸고 `guest`를 해제하지 않는다. guest render가 `signup`을 `home`으로 치환한다. 클릭 재현에서 hash는 `#home`, `#signup-form`은 0개였다. 해당 handler에는 체험 데이터 이관도 없다. | High |
| Medium | `dist/account-client.js:17–24`, `dist/account-client.js:36` | 기존 3: 저장 오류 또는 revision 충돌이 로그아웃을 막는다. | `logout()`이 `flush()` 성공 후에만 `auth.signOut()`을 호출한다. 실패 응답을 주는 VM에서 logout이 reject되고 signOut 호출은 0회였다. 충돌도 같은 throw 경로를 사용한다. | High |
| Medium | `dist/production-ui.js:65`, `dist/production-ui.js:86` | 기존 4: 종료한 공유와 최초 조회 실패가 같은 SPA의 동일 ID 캐시에 남는다. | `shared.id`가 같으면 RPC를 재호출하지 않으며 revoke는 캐시를 지우지 않는다. 공유 삭제 후 수신 탭에서 다른 hash를 거쳐 동일 링크로 돌아가도 명함이 표시됨을 브라우저에서 재현했다. 실패 결과에도 같은 조건이 적용된다. 새로고침 후 DB 접근 우회는 아니다. | High |
| Medium | `verify-production.cjs:51`, `verify-production.cjs:55`, `verify-production.cjs:61–62` | 기존 5: 현행 UI와 맞지 않는 통합 테스트가 후반 인증·공유 검증을 실행하지 못한다. | 원본 `npm run test:browser`는 `#card-group`의 `.fill()`에서 `Element is not an <input>, <textarea> or [contenteditable] element`로 실패했다. 후반의 settings 버튼·forgot selector와 안내문도 현행 UI와 다르다. 선택자와 해당 동작만 메모리에서 보정하면 전체 통합 테스트가 통과한다. `test:cloud`는 동일 파일을 실행한다. | High |
| Medium | `verify-db.cjs:6–7`, `verify-db.cjs:20`, `verify-backend.cjs:7–15`, `.github/workflows/pages.yml` | 기존 6: CI는 수정 migration과 실제 공유 INSERT RETURNING 권한 경로를 검증하지 않는다. | DB 테스트는 첫 migration만 읽고 schema USAGE를 미리 부여하며 공유 INSERT에 RETURNING이 없다. backend 검사는 익명 요청만 사용한다. 별도 메모리 진단에서는 수정 migration을 두 번 적용하고 INSERT RETURNING 및 기존 격리 테스트를 통과했지만, 이 검증은 현재 CI에 포함되지 않는다. | High |
| Medium | `dist/production-ui.js:31`, `dist/card-model.js:22`, `dist/account-client.js:20`, `dist/account-client.js:26` | 기존 7: 작은 프로필 수정도 전체 명함함 직렬화와 저장을 유발한다. | input → `updateCard()` → `persist()` → `encode()`가 collection 전체를 순회하고 `save()`가 organizer 전체를 `JSON.stringify()`한다. `flush()`는 profile과 organizer를 모두 복제해 UPDATE한다. 650ms debounce는 이 입력 시점 작업을 막지 않는다. SQL의 organizer 상한은 12MB다. 실제 기기에서의 지연 정도는 미측정이다. | High |
| Low | `server.cjs:46`, `dist/index.html:11` | 기존 8: 과거 서버의 루트와 QR 수신 화면에는 앱 script가 없다. | `server.cjs`는 `dist/index.html`을 그대로 제공하며 해당 HTML에는 빈 `#app`과 `APP_SCRIPTS` 주석만 있다. script 주입은 `build-pages.cjs`에만 있다. 현행 `npm start`는 `preview-pages.cjs`로 `_site`를 제공하므로 이 문제는 별도 과거 서버 경로에 한정된다. | High |
| Low | `build-pages.cjs:11–14`, `dist/cloud-auth.js:1`, `dist/modern-app.js:13`, `dist/modern-app.js:18`, `dist/modern-app.js:50`, `dist/modern-app.js:67` | 기존 9: 운영 진입점에서 사용하지 않는 과거 구현과 교체되는 함수가 배포된다. | 두 HTML, 빌드 주입 목록, JS 로더와 테스트 참조를 추적했다. dist 전체 복사로 과거 JS/CSS도 `_site`에 포함된다. `app/sharing-ui/organizer/enhancements/i18n/workspace-view/presets-ui/motion/studio-ui`는 legacy 테스트가 실제 사용하므로 저장소 전체의 dead code는 아니다. `cloud-auth.js`에는 실행 진입점이 없고 문법 검사 참조만 있다. modern-app의 `persist/login/exportDialog/saveCard` 구현은 최초 render 전에 production-ui가 교체한다. 초기 페이지가 과거 파일 전부를 다운로드한다는 의미는 아니다. | High |
| Low | `dist/modern-app.js:63`, `dist/design.css:8`, `dist/design.css:78` | 기존 10: 뒷면 PNG의 `stripes`·`orbits`가 화면 패턴과 다르다. | exportPNG는 `plain` 이외에 수직선을 그리고 `grid`에만 가로선을 추가한다. CSS는 `stripes`에 대각선, `orbits`에 원형 gradient를 사용한다. 같은 패턴을 선택해도 두 구현이 다른 모양을 만든다. | High |

## FALSE_POSITIVE

없음. 기존 발견 사항 중 현재 코드로 반증된 항목은 없었다. 다만 기존의 “확인된 High 없음” 결론은 이번에 재현한 신규 High 2개로 대체된다.

## UNCERTAIN

| Severity | File | Issue | Evidence | Confidence |
|---|---|---|---|---|
| Medium | `dist/account-client.js:42`, `dist/production-ui.js:63` | 기존 조건부 1: 공유 목록의 서버 행 제한 때문에 오래된 공유를 관리·종료하지 못할 가능성. | `listShares()`는 전체 data/사진을 단일 SELECT로 요청하며 pagination이나 count 확인이 없다. 결과가 제한될 때 나머지 행을 가져올 경로가 없다. 실제 운영 API 행 상한과 사용자별 공유 수를 확인하지 않아 발생 여부는 확정하지 않았다. | Medium |
| Medium | `supabase/migrations/202609190001_damda.sql:21–35` | 기존 조건부 2: 인증 사용자의 대량 공유 생성에 따른 저장 공간·비용 증가 가능성. | 저장소 SQL은 행당 3MB와 owner 일치를 제한하지만 사용자별 총량·개수·만료 제한은 없다. 운영의 별도 rate limit, quota, 보호 장치와 악용 여부는 확인하지 않았다. | Medium |

## 검증 결과와 범위

| 검사 | 결과 |
|---|---|
| `npm run check` / 추적된 JS·CJS 31개 `node --check` | PASS. 문법 검사이며 lint/typecheck가 아니다. |
| lint / typecheck | 해당 script와 설정 없음. React/JSX/TypeScript도 없으므로 React hooks/lifecycle 검사는 해당 없음. 실제 전역 상태·이벤트·비동기 경로를 검사했다. |
| `npm test` / `npm run test:db` / `npm run test:legacy` | 모두 PASS. legacy 통과는 현행 UI 정상 동작의 증거로 사용하지 않았다. |
| `npm run test:browser` | FAIL: 위의 select.fill 오류. 같은 명령인 `test:cloud`는 중복 실행하지 않았다. |
| 메모리에서 UI 선택자/동작만 보정한 통합 테스트 | PASS: Auth, 저장 실패·충돌, 일반 계정 전환, 공개 필드, QR·공유 종료, PNG/VCF, 반응형. 원본 테스트 PASS로 간주하지 않는다. |
| 별도 재현 | 공유 owner 전환 race(VM), 사진 계정 전환 race(브라우저), guest 공유·가입, 종료된 공유의 SPA 캐시, 저장 실패 시 logout 차단을 재현했다. |
| 로컬 DB 추가 검사 | 두 migration, 수정 migration 반복 적용, authenticated INSERT RETURNING, 두 사용자 격리, owner 위조/타인 삭제 차단, 익명 테이블 접근 차단, 삭제 후 공개 RPC null 모두 PASS. |
| `npm run verify:backend` | PASS. 운영 DB는 읽기 전용으로 Auth 설정, 미존재 UUID RPC, 익명 테이블 접근 거절만 확인했다. 이메일 확인은 비활성화 상태다. |
| `npm audit --json` | 알려진 advisory 0개. 취약점 부재를 보증하지 않는다. |
| `npm run build:pages` | PASS. 마지막에 실제 `config/supabase.json`으로 재빌드해 `_site`의 테스트용 설정을 복원했다. |

현행 실행 경로는 `preview-pages.cjs` → `build-pages.cjs` → `_site/index.html`이며, `account-client.js`, `modern-app.js`, `production-ui.js`가 순서대로 실행된다. 직접 dependency 5개는 빌드·런타임·테스트 사용처가 있으며 미사용으로 분류하지 않았다.

기본 SQL에도 shared table의 SELECT/INSERT/DELETE GRANT가 존재한다. 정확한 UUID로 공개 snapshot을 반환하는 `damda_get_shared_card`는 의도된 기능이며, `security definer`와 빈 `search_path`를 사용한다. 로컬 검증 범위에서 RLS 우회는 확인하지 못했다. 운영 authenticated GRANT, 전체 정책 목록·함수 소유자·실제 배포 migration은 관리자 접근 없이 확정할 수 없으며 과거 permission 오류의 원인도 소스만으로 단정하지 않는다.

추적된 소스·설정에서 비밀 키 패턴은 발견하지 못했다. 설정의 `sb_publishable_` 키는 공개 클라이언트용이고 빌드는 secret/service_role 키를 허용하지 않는다. Git 전체 이력과 외부 배포 비밀은 검사 범위 밖이다. 공개 snapshot 선택 필드, HTML escaping, 사진 data URL 제한, vCard escaping을 확인했으며 검사한 실행 경로에서 XSS·SQL injection은 입증되지 않았다. 일반 계정 격리 테스트의 통과는 위의 비동기 race를 배제하지 않는다.
