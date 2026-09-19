# DamDa — 나를 담다, 연결을 담다

DamDa는 **만나는 사람과 상황에 맞춰, 필요한 정보만 골라 공유하는 디지털 명함 서비스**입니다.

업무 미팅에서는 회사와 이메일을, 친구에게는 취미와 SNS를, 온라인에서는 닉네임을 전할 수 있습니다. 하나의 프로필에서 공개 범위를 선택하고, 나만의 디자인으로 명함을 만들어 링크와 QR로 공유합니다.

모바일·태블릿·노트북·데스크톱을 지원하는 각진 레이아웃을 사용하며, 명함은 화면 크기와 관계없이 9:5 비율을 유지합니다. 목업 DamDaTest의 디자인을 운영 서비스에 적용했고, 로컬 목업 저장소의 원격 연결은 해제했습니다.

## 주요 기능

- **상황별 공개 정보**: 이름·닉네임, 연락처, 회사, SNS, 사용자 정의 항목의 공개 여부를 직접 선택합니다.
- **공개 정보 프리셋**: 비즈니스·퍼스널·미니멀 및 사용자 프리셋을 적용하고, 추가·편집·삭제할 수 있습니다.
- **명함 디자인**: 색상 테마, 프로필 사진 모양과 크기를 선택합니다.
- **양면 3D 미리보기**: 마우스·터치로 회전하고, 방향키와 앞면·뒷면·초기화 버튼으로도 조작합니다.
- **뒷면 꾸미기**: 제목, 소개 문구, 배경색, 패턴을 편집합니다.
- **명함 공유**: 선택한 공개 정보와 뒷면을 고정된 사본으로 저장하고 링크·QR로 전합니다.
- **명함함**: 받은 명함을 보관하고 분류를 추가·변경·삭제합니다.
- **다운로드**: 앞면·뒷면 PNG(1440×800)와 연락처 VCF를 저장합니다.
- **사용 환경 설정**: 라이트·다크·시스템 화면 모드, 한국어·영어, 애니메이션 줄이기를 제공합니다. 설정은 드롭다운 대신 선택 버튼으로 조작합니다.

## 계정과 데이터

운영용 구성은 **Supabase Auth + PostgreSQL**을 사용합니다.

이메일·비밀번호 회원가입과 로그인, 비밀번호 재설정, 로그아웃을 제공합니다. 프로필·명함함·프리셋은 계정별로 저장하고, DB의 행 수준 보안(RLS)으로 다른 사용자의 비공개 데이터 접근을 제한합니다.

자동 저장에 실패하면 재시도할 수 있습니다. 다른 기기의 편집과 충돌하면 현재 내용을 백업한 뒤 서버 데이터를 다시 불러올 수 있습니다.

공유 링크에는 전체 프로필이 아니라 **직접 선택한 공개 정보의 사본**만 연결됩니다. 링크를 아는 사람은 로그인 없이 볼 수 있습니다. 프로필을 수정해도 이전에 공유한 사본은 바뀌지 않습니다. 내 공유 링크 관리에서 공유를 종료할 수 있습니다.

> 운영 화면은 GitHub Pages, 실제 인증과 데이터 저장은 Supabase를 사용합니다. 로컬에서도 동일한 운영 화면과 실제 회원 계정을 사용합니다. 비밀번호 재설정 메일에는 Supabase의 SMTP 및 허용 Redirect URL 설정이 필요합니다.

## 기술 구성

| 영역 | 사용 기술 |
| --- | --- |
| 화면 | HTML, CSS, JavaScript |
| 명함 미리보기 | CSS 3D Transform, Pointer Events |
| 인증 | Supabase Auth |
| 계정·공유 데이터 | Supabase PostgreSQL, RLS |
| QR 생성 | 브라우저 내 node-qrcode |
| 정적 배포 | GitHub Pages, GitHub Actions |
| 번들 생성 | esbuild |
| 로컬 개발·기존 API | Node.js |
| 동작 검증 | Node.js 테스트, Playwright |

## 로컬 실행

Node.js 22 이상을 권장합니다.

~~~bash
npm ci
npm start
~~~

http://127.0.0.1:4173/DamDa/ 에 접속합니다. GitHub Pages와 동일한 빌드·경로·CSP를 사용합니다.

설정된 Supabase에 실제로 연결됩니다. 회원가입 후 로그인하세요. 목업의 **admin / 1234** 체험 로그인은 운영 화면에서 제거했습니다. `dist/` 수정 후 `npm run build:pages`를 실행하고 새로고침합니다.

## 운영용 DB 설정

기존 버전 [Damda-v1.0.1](https://github.com/Qenvex/Damda-v1.0.1)은 Supabase의 profiles, cards, received_cards 테이블과 get_card RPC를 사용했습니다. 해당 프로젝트에 관리 권한이 있다면 재사용할 수 있습니다. 새 Supabase 프로젝트를 생성하면 회원과 데이터는 새로 시작하며, 기존 데이터가 자동 이전되지 않습니다.

1. 사용할 Supabase 프로젝트의 SQL Editor에서 [DB 확장 스크립트](supabase/migrations/202609190001_damda.sql)를 한 번 실행합니다.
2. Authentication의 Site URL과 허용 Redirect URL에 https://rlawlgns02.github.io/DamDa/ 를 등록합니다. 비밀번호 재설정을 위해 https://rlawlgns02.github.io/DamDa/?auth=recovery 도 허용합니다.
3. Authentication의 이메일 제공자 설정에서 Confirm email을 끕니다. 가입 즉시 로그인합니다. 비밀번호 재설정 메일을 사용하려면 SMTP를 연결합니다.
4. 새 비밀번호는 8자 이상, 대문자·소문자·숫자·특수문자 중 2종류 이상이어야 합니다. 화면에 약함·중간·강력 표시를 제공합니다. Supabase의 최소 비밀번호 길이도 8로 설정합니다.
5. [공개 연결 설정](config/supabase.json)의 프로젝트 URL과 publishable key를 확인합니다. 현재 연결 대상은 사용자 소유의 xpahxsmlzhfnfzqlefzc 프로젝트입니다.

**publishable/anon 키는 공개 클라이언트 설정입니다. secret 키, service_role 키, DB 비밀번호는 클라이언트 코드나 저장소에 넣지 않습니다.**

새 테이블의 역할:

- damda_accounts: 사용자별 프로필·명함함·프리셋. 본인 계정만 읽고 쓸 수 있습니다.
- damda_shared_cards: 공유 시점의 공개 명함 사본.
- damda_get_shared_card: 정확한 공유 ID를 알고 있는 경우에만 명함을 조회하는 함수. 비로그인 사용자의 테이블 전체 조회는 허용하지 않습니다.

## GitHub Pages 배포

대상 저장소: [rlawlgns02/DamDa](https://github.com/rlawlgns02/DamDa)  
배포 주소: https://rlawlgns02.github.io/DamDa/

~~~bash
npm run build:pages
~~~

생성된 _site 폴더가 정적 배포 결과물입니다. .github/workflows/pages.yml은 main에 푸시하면 검증·빌드 후 GitHub Pages로 배포합니다. 저장소의 Settings → Pages에서 배포 소스를 **GitHub Actions**로 지정합니다.

다른 Supabase 프로젝트를 사용할 때에는 GitHub Actions 변수 DAMDA_SUPABASE_URL과 DAMDA_SUPABASE_PUBLISHABLE_KEY로 기본 공개 설정을 재정의할 수 있습니다.

## 검증

~~~bash
npm run check
npm test
npm run test:browser
npm run test:cloud
npm run test:db
~~~

브라우저 테스트는 기본적으로 설치된 Microsoft Edge를 사용합니다. 다른 Playwright 브라우저 채널은 DAMDA_BROWSER_CHANNEL로 지정합니다.

`npm test`는 기존 계정 데이터 변환과 공개 범위 보존을 검증합니다. test:cloud(test:browser와 동일)는 실제 Supabase SDK와 모의 API로 가입·로그인·복구·자동 저장·충돌·계정 분리·공유·다운로드 및 반응형 화면을 검증합니다. 테스트 후 `npm run build:pages`로 실제 연결 설정을 복원합니다. test:db는 로컬 PostgreSQL 엔진에서 스키마와 RLS를 검증합니다. 운영 계정 인증과 이메일 발송은 배포 대상 Supabase에서도 별도로 확인해야 합니다.

## 문서와 개발 기록

- [이전 README / 개발 기록](README-development-history.md)
- [작업 변경 기록](CHANGELOG-task.md)
- [초기 개발 계획서](명함%20교환기%20앱%20개발%20계획서.md)


### 운영 화면 로컬 미리보기

`npm run preview:pages`는 운영 빌드를 만든 뒤 http://127.0.0.1:4173/DamDa/ 에서 제공합니다. GitHub Pages와 같은 CSP와 경로를 사용하며 Live Server 스크립트를 삽입하지 않습니다. 실제 설정된 Supabase DB에 연결됩니다. `dist/` 수정 후 다른 터미널에서 `npm run build:pages`를 실행하고 새로고침하세요. 종료는 Ctrl+C입니다. 비밀번호 재설정 테스트 시 Supabase Redirect URLs에 `http://127.0.0.1:4173/DamDa/?auth=recovery`도 등록하세요.
