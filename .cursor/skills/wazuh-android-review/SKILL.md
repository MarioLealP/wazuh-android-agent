---
name: wazuh-android-review
description: >-
  Reviews changes to the Wazuh Android agent for coroutine ownership, storage,
  crypto, network, platform, and privacy issues, and for regressions of agent
  invariants. Use when reviewing a diff, pull request, or Kotlin/Android code
  in this repository, or when the user asks for a code review.
---

# Wazuh Android review

Review the change. Lead with findings. A review is not a style summary.

Do not suggest Hilt, Clean Architecture, Retrofit, or Firebase. This app is a native Kotlin agent: a foreground service, collectors, a Room queue, encrypted preferences, and a JVM protocol module.

## Scope

1. Read the diff and the surrounding call sites, not only the changed lines.
2. Classify each touched area:
   - `protocol/` — enrollment, codec, session. Pure JVM. Behavior changes need unit tests with vectors independent of the production code.
   - `app/` — service, collectors, queue, storage, device admin, Compose UI.
   - `manager/rules/` — Wazuh rules that match event JSON.
3. Open only the references the diff needs. Always open [invariants.md](invariants.md).
   - Coroutines, threads, `AgentForegroundService`, `AgentConnection`, `MainViewModel`, collectors, or workers → [concurrency.md](concurrency.md)
   - Storage, crypto, network, manifest, permissions, device admin, or logged data → [security.md](security.md)
4. Authentication and client-side tamper resistance are out of scope unless the diff adds them.

## Findings

Order by severity. Omit empty sections. If nothing is wrong, say so in one sentence and name what you checked.

- **Critical** — leaked agent key or enrollment password, broken pin check, device admin that can lock or wipe, data loss, or an exploitable component.
- **High** — session leak or deadlock, event dropped on the common path, protocol incompatibility, backup of secrets, or a manager rule that no longer matches the event.
- **Medium** — bounded correctness, cancellation, privacy, or permission issue.
- **Low** — a concrete improvement with limited impact.

Each finding:

- **Where** — file and symbol
- **Trigger** — the input or lifecycle that hits it
- **Impact** — what breaks
- **Fix** — the smallest change that repairs it

## Credits

Concurrency checks are adapted from Chris Banes, "Kotlin concurrency and Flow" (https://github.com/chrisbanes/skills, Apache-2.0). Security checks are adapted from OWASP MASVS and the OWASP Secure Agent Playbook mobile code review (https://github.com/OWASP/secure-agent-playbook, CC-BY-4.0, © OWASP Foundation). Both are rewritten for this agent. Do not load those repositories while reviewing.
