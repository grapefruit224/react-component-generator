---
name: create-pr
description: |
  현재 브랜치의 커밋들을 분석해 PR 제목과 본문을 작성하고, 브랜치를 push한 뒤 `gh pr create`로 PR을 자동 생성한다.
  PR 대상 저장소가 해외 오픈소스면 영문 템플릿(references/pr-template.en.md), 한국 프로젝트면 한국어 템플릿(references/pr-template.ko.md)을 쓴다.
  "PR 만들어줘", "PR 올려줘", "PR 날려줘", "풀리퀘 생성", "create a PR", "open a pull request", "/create-pr" 같은 요청에 활성화한다.
  커밋 생성, 리뷰 코멘트 반영은 이 스킬의 범위가 아니다(각각 commit, autofix 스킬).
context: fork
allowed-tools: Read Glob Grep Bash
argument-hint: "[--base <branch>] [--draft] [--lang en|ko]"
---

# create-pr: 브랜치 분석 → PR 본문 작성 → 자동 생성

현재 브랜치가 base 브랜치 대비 무엇을 바꿨는지 읽고, 리뷰어가 diff를 열기 전에 **무엇을·왜·어떻게 검증했는지** 알 수 있는 PR을 만든다.

이 스킬은 **fork 컨텍스트에서 실행**된다. 실행 중에는 사용자에게 질문할 수 없으므로, 아래 규칙대로 스스로 판단하고 진행한다. 진행할 수 없는 상황이면 아무것도 바꾸지 말고 이유와 해결 방법을 마지막 보고에 담아 종료한다.

인자: `$ARGUMENTS`
- `--base <branch>`: PR을 머지할 대상 브랜치. 없으면 저장소 기본 브랜치.
- `--draft`: Draft PR로 생성.
- `--lang en|ko`: PR 언어를 강제 지정. 없으면 Step 2.5에서 자동 판단.

## Step 0: 저장소 지침 확인

저장소 루트의 `AGENTS.md`/`CLAUDE.md`에 PR 관련 규칙(제목 형식, 본문 양식, 언어, 라벨, 리뷰어 등)이 있으면 그것이 이 문서보다 우선한다.

## Step 1: 사전 점검

```bash
gh auth status
git branch --show-current
git status --short
gh repo view --json nameWithOwner,defaultBranchRef,visibility,isFork,parent
```

### PR 대상 저장소 결정

해외 오픈소스 기여는 보통 fork에서 원본(upstream)으로 PR을 보낸다. 그래서 **PR이 열릴 저장소(target)** 를 먼저 정하고, 이후 base 브랜치·기존 PR·언어 판단은 모두 target 기준으로 한다.

- `isFork`가 `false` → target = 현재 저장소. `gh pr create`에 `--repo`/소유자 접두어 불필요.
- `isFork`가 `true` → target = `parent` (`<parent.owner.login>/<parent.name>`). 이후 `gh` 명령에 `--repo <target>`을 붙이고, head는 `<내 계정>:<브랜치>` 형식으로 지정한다. push는 여전히 내 fork(`origin`)로 한다.

다음 중 하나라도 해당하면 **중단**하고 보고한다.

| 상황 | 보고할 해결 방법 |
|---|---|
| `gh` 미설치·미로그인 | `! gh auth login` 실행 안내 |
| GitHub remote 없음 | `gh repo create` 또는 remote 추가 안내 |
| 현재 브랜치가 base 브랜치와 같음 (예: `main`에서 실행) | 작업 브랜치를 만든 뒤 다시 실행하라고 안내. 브랜치를 대신 만들거나 커밋을 옮기지 않는다 |
| detached HEAD | 브랜치 체크아웃 안내 |

커밋되지 않은 변경(`git status`에 보이는 것)은 **커밋하지 않는다.** PR에는 커밋된 내용만 들어간다는 점을 보고에 "미포함 변경"으로 적는다.

## Step 2: base 결정 및 기존 PR 확인

1. base = `--base` 인자, 없으면 target 저장소의 기본 브랜치(fork면 `gh repo view <target> --json defaultBranchRef`).
2. base를 최신화한 뒤 `git log --oneline <base ref>..HEAD`를 본다. 결과가 비어 있으면 base 대비 새 커밋이 없는 것이므로 중단한다.
   - fork가 아니면 `git fetch origin <base>`, base ref = `origin/<base>`.
   - fork면 `upstream` remote를 쓴다(없으면 `git remote add upstream https://github.com/<target>.git`). `git fetch upstream <base>`, base ref = `upstream/<base>`.
   - 아래 단계의 `origin/<base>`는 이 base ref로 읽는다.
3. 이미 열린 PR이 있는지 확인한다.
   ```bash
   gh pr list [--repo <target>] --head <현재 브랜치> --state open --json number,url
   ```
   있으면 새로 만들지 않는다. 필요하면 push만 하고(Step 4), 기존 PR URL을 보고하고 종료한다.

## Step 2.5: PR 언어 결정 (en / ko)

**target 저장소에서 기존 기여자들이 쓰는 언어**를 따른다. 내 선호가 아니라 리뷰할 사람들이 읽는 언어가 기준이다. 위에서부터 처음 결론이 나는 근거를 쓴다.

1. `--lang` 인자.
2. Step 0 지침(`AGENTS.md`/`CLAUDE.md`, `CONTRIBUTING.md`)에 언어 규칙이 있으면 그것.
3. **target의 최근 머지된 PR** 제목·본문 언어:
   ```bash
   gh pr list [--repo <target>] --state merged --limit 10 --json title,body
   ```
   한글이 대부분이면 `ko`, 영문이 대부분이면 `en`.
4. PR 이력이 없거나 반반이면 **base 브랜치의 최근 커밋 메시지**(`git log --format=%s -20 <base ref>`) 언어. 이번 브랜치의 내 커밋은 근거에서 뺀다.
5. 그래도 애매하면 **target의 README** 언어.
6. 근거가 전혀 없으면 `ko`.

판단 결과와 근거(예: "en — 최근 머지 PR 10개 모두 영문")를 Step 7 보고에 한 줄로 남긴다.

### 템플릿 선택

1. target 저장소에 자체 PR 템플릿(`.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/PULL_REQUEST_TEMPLATE/`, `docs/`·루트의 같은 이름)이 있으면 **그것을 쓴다.** 프로젝트가 정한 양식이 이 스킬의 템플릿보다 우선한다. fork면 `gh api repos/<target>/contents/.github/pull_request_template.md`로 확인한다.
2. 없으면 언어에 맞춰 고른다.
   - `en` → [references/pr-template.en.md](references/pr-template.en.md)
   - `ko` → [references/pr-template.ko.md](references/pr-template.ko.md)

## Step 3: 변경사항 수집 및 분석

```bash
git log --format='%h %s%n%b' origin/<base>..HEAD   # 커밋 메시지(의도 파악의 1순위 근거)
git diff --stat origin/<base>...HEAD                # 변경 범위
git diff origin/<base>...HEAD                       # 실제 변경 내용
```

- `...`(점 3개)는 base에서 갈라진 지점 이후 **이 브랜치의 변경만** 보여준다. base에 다른 사람이 머지한 변경이 섞이지 않게 반드시 점 3개를 쓴다.
- diff가 크면 `--stat`으로 범위를 보고, 판단에 필요한 파일만 Read로 읽는다. lock 파일·빌드 산출물은 "의존성 변경" 정도로 성격만 파악한다.
- 커밋 메시지와 실제 diff가 다르면 **diff를 믿는다.**

### 비밀값 점검 (push 전에 반드시)

diff에 아래가 보이면 **push하지 않고 중단**한다. 한번 원격에 올라간 비밀값은 되돌릴 수 없다.

- `.env`, `*.pem`, `*.key`, `credentials*` 파일
- `sk-ant-`, `ghp_`, `gho_`, `AKIA` 등으로 시작하는 토큰, 하드코딩된 API 키·비밀번호

```bash
git diff origin/<base>...HEAD | grep -nE '(sk-ant-[A-Za-z0-9_-]{10,}|gh[po]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|(api[_-]?key|secret|password)\s*[:=]\s*["'\''][^"'\'']{8,})'
```

### 검증 실행

`package.json`의 `scripts`에 `test`·`lint`·`typecheck`(또는 `build`)가 있으면 실행해 결과를 본문 "검증" 섹션에 기록한다. 패키지 매니저는 lock 파일로 판단한다(`bun.lock` → `bun run`, `pnpm-lock.yaml` → `pnpm`, 그 외 `npm run`).

- 실패해도 PR 생성은 계속하되, **Draft로 생성**하고 실패 내용을 본문에 그대로 적는다. 실패를 숨기거나 "통과"로 적지 않는다.
- 실행하지 않은 검증은 체크하지 않는다.

## Step 4: push

```bash
git push -u origin HEAD
```

- `--force`/`--force-with-lease`는 쓰지 않는다. push가 거부되면(원격이 앞서 있음) 중단하고 `git pull --rebase` 필요성을 보고한다.
- pre-push hook 실패 시 `--no-verify`로 우회하지 않는다. 원인을 보고하고 중단한다.

## Step 5: 제목·본문 작성

제목과 본문 모두 Step 2.5에서 정한 언어 하나로 쓴다. 코드 식별자·명령어·파일 경로는 언어와 관계없이 원문 그대로 둔다.

### 제목

target 저장소의 최근 PR 제목에 고유한 형식(예: `[component] ...`, `fix(scope): ...`)이 있으면 그것을 따른다. 없으면:

- `ko`: commit 스킬과 같은 `<type>: <한국어 요약>` (예: `fix: 미리보기 새로고침 시 이전 코드가 남는 문제 수정`)
- `en`: Conventional Commits `<type>: <imperative summary>`, 소문자 동사 원형으로 시작 (예: `fix: clear stale code on preview reload`)

공통 규칙:

- type은 `feat` / `fix` / `refactor` / `chore` 중 PR 전체를 대표하는 하나.
- 커밋이 1개고 언어가 맞으면 그 커밋 요약을 그대로 써도 된다. 언어가 다르면(한국어 커밋 → 영문 PR) 번역해서 쓴다.
- 50자 내외(en은 72자 이내), 마침표 없음, 파일명 나열 대신 의도.

### 본문

Step 2.5에서 고른 템플릿을 Read로 읽고 그 구조를 따른다. 템플릿의 `<!-- -->` 주석은 작성 가이드이므로 본문에서 지운다(프로젝트 자체 템플릿의 주석은 그 템플릿의 관례를 따른다).

- 해당 없는 **선택 섹션**은 "없음"/"N/A"라고 쓰지 말고 섹션째 삭제한다. 필수 섹션은 남긴다.
- 커밋 메시지가 한국어여도 `en`이면 본문은 영어로 쓴다.
- 추측을 사실처럼 쓰지 않는다. diff·커밋·검증 결과에서 확인된 것만 쓴다.
- 환경이 PR 본문 끝에 붙일 attribution 문구를 지정했다면 맨 끝에 붙인다.

## Step 6: PR 생성

본문은 여러 줄과 특수문자가 깨지지 않도록 heredoc으로 stdin에 넘긴다.

```bash
gh pr create [--repo <target>] --base <base> --head <현재 브랜치 | 내계정:브랜치> --title "<제목>" [--draft] --body-file - <<'EOF'
<본문>
EOF
```

`--draft`는 인자로 요청됐거나 Step 3 검증이 실패한 경우에만 붙인다. 라벨·리뷰어·assignee는 저장소 지침에 있을 때만 지정한다.

## Step 7: 결과 보고

fork 결과는 메인 대화로 돌아가므로 짧고 정확하게 보고한다.

```
PR 생성 완료: <URL>
- 제목: feat: ...
- base ← head: main ← feature/xxx (커밋 N개)
- 언어: en — 최근 머지 PR 10개 모두 영문 (템플릿: pr-template.en.md)
- 검증: test 통과, lint 통과   (실패 시: test 실패 → Draft로 생성)
- 미포함 변경: src/App.tsx (커밋되지 않음)   ← 있을 때만
```

중단한 경우에는 `PR 생성 안 함: <이유>`와 해결 방법, 그리고 그때까지 바꾼 것(push 여부 등)을 적는다.
