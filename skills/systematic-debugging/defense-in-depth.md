# Defense-in-Depth Validation

## Overview

Bug 由 invalid data 引起时，在一处加 validation 感觉足够。但 single check 可被不同 code paths、refactoring 或 mocks 绕过。

**Core principle：** 在 data 经过的 EVERY layer 验证。使 bug structurally impossible。

## Why Multiple Layers

Single validation："We fixed the bug"
Multiple layers："We made the bug impossible"

不同 layers 捕获不同 cases：
- Entry validation 捕获 most bugs
- Business logic 捕获 edge cases
- Environment guards 防止 context-specific dangers
- Debug logging 在其他 layers fail 时帮助 forensics

## The Four Layers

### Layer 1: Entry Point Validation
**Purpose：** 在 API boundary 拒绝 obviously invalid input

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

### Layer 2: Business Logic Validation
**Purpose：** 确保 data 对此 operation 有意义

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
  // ... proceed
}
```

### Layer 3: Environment Guards
**Purpose：** 在特定 contexts 阻止 dangerous operations

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
  // ... proceed
}
```

### Layer 4: Debug Instrumentation
**Purpose：** 捕获 forensics context

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... proceed
}
```

## Applying the Pattern

找到 bug 时：

1. **Trace the data flow** — Bad value 从哪 originate？在哪使用？
2. **Map all checkpoints** — 列出 data 经过的 every point
3. **Add validation at each layer** — Entry、business、environment、debug
4. **Test each layer** — 尝试 bypass layer 1，verify layer 2 捕获

## Example from Session

Bug：Empty `projectDir` 导致 `git init` 在 source code

**Data flow:**
1. Test setup → empty string
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` 在 `process.cwd()` 运行

**Four layers added:**
- Layer 1: `Project.create()` validates not empty/exists/writable
- Layer 2: `WorkspaceManager` validates projectDir not empty
- Layer 3: `WorktreeManager` refuses git init outside tmpdir in tests
- Layer 4: Stack trace logging before git init

**Result:** All 1847 tests passed，bug impossible to reproduce

## Key Insight

四层都必要。Testing 中每层捕获 others 遗漏的 bugs：
- 不同 code paths 绕过 entry validation
- Mocks 绕过 business logic checks
- 不同 platforms 的 edge cases 需要 environment guards
- Debug logging 识别 structural misuse

**Don't stop at one validation point.** 在 every layer 加 checks。
