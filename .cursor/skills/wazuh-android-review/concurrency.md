# Concurrency

The foreground service owns the manager session. `CollectorManager` owns the live collectors and cancels that scope in `stop()`. `PostureWorker` owns the periodic posture and package reconcile, including while the service is paused. `AgentConnection` owns its reader thread. Individual collectors, `SecureStore`, and the queue do not own a process lifetime.

## Ownership

- A coroutine needs an owner and a cancellation boundary that is visible at the call site.
- A stored `CoroutineScope` is acceptable on `AgentForegroundService` and `CollectorManager` because `onDestroy` / `stop()` cancels it. `PostureWorker.doWork` is the scope for that periodic run. A stored scope on a collector, `SecureStore`, the queue, or a `protocol/` type is a finding unless that type also shuts the scope down.
- `AgentConnection` starts one reader `Thread`. `close()` joins that thread for up to two seconds and must not join the thread that is already inside `close()`. A new thread or executor needs the same shutdown. Do not replace that reader with an unstructured `launch` that nothing cancels.
- Do not add `GlobalScope`. Do not hide `launch` behind a non-suspending API on a type that does not own cancellation. Prefer `suspend` and let the service or `CollectorManager` launch.
- `init { launch }` and fire-and-forget work started from a constructor are findings.

## Cancellation and blocking

- `catch (e: Exception)` and `runCatching` around a coroutine must not swallow `CancellationException`. Rethrow it. The connection loop in `AgentForegroundService` already does this; keep that rethrow.
- `runBlocking` on `Dispatchers.Main`, or anywhere on the UI thread, is a finding. `runBlocking(Dispatchers.IO)` in `onDestroy`, bounded by a timeout, is the accepted way to flush the socket on the way out. Flag it if the timeout is removed, the dispatcher becomes `Main`, or the same pattern appears in a collector or in `protocol/`.
- Blocking socket and disk work stays off the main thread. A suspend function that does blocking I/O switches dispatcher itself (`withContext`) instead of requiring every caller to switch first.
- `NonCancellable` is only for the short cleanup already used when closing the socket after cancel. Do not wrap send loops or collectors in it.

## Service lifetime

- `onCreate` and `onStartCommand` call `startInForeground()` before collect, connect, or lock acquisition. A `startForegroundService` that returns without entering the foreground is a finding, including the stop path.
- `START_STICKY` is for the running agent. The stop and "not enrolled" paths return `START_NOT_STICKY` and must keep doing so.
- Wake and Wi-Fi locks are acquired for the session and released in `onDestroy`. A new lock needs the same release on every stop path.
- Restart alarms are exact alarms. An inexact alarm cannot start this foreground service from the background on Android 12+.

## Flows and events

- Durable UI state (`AgentState.status` and similar) is a `StateFlow`. The service collects it with `collectLatest`. Compose reads it with `collectAsStateWithLifecycle`, as `AppScaffold` does. Do not replace that with `repeatOnLifecycle` or `launchWhenStarted`. `repeatOnLifecycle` is for a coroutine that collects outside composition.
- `Channel.CONFLATED` is for a poke where only the latest signal matters. The reconnect signal and the queue wakeup use it, and dropping an intermediate poke is fine.
- A one-shot event that must be delivered once, including across a gap between collectors, is a buffered `Channel` that does not drop. Do not use `CONFLATED` or a `SharedFlow` with `replay = 0` for that event.
- Do not expose `MutableStateFlow` or `MutableSharedFlow` from a type that only needs to publish.
