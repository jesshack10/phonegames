# minivcs — the smallest useful git-like VCS

Two implementations of the same design (Python and C++17) that demonstrate what
git *actually* is under the hood, with everything non-essential stripped away.

## The idea

A version control system, at its core, is just:

> a **content-addressed object store** + a **chain of commits**.

Everything else in git (branches, staging, merging, diffs, remotes) is built on
top of this and is left out here on purpose.

## Three object types

| Object | Holds | Why it's needed |
|--------|-------|-----------------|
| `blob` | the bytes of one file | store file *contents* |
| `tree` | a folder listing (name → blob/tree id) | store folder *structure* |
| `commit` | a tree + parent commit + message + time | store *history* as a chain |

## Why content-addressing

Every object's id **is the SHA-256 of its content**. This one choice gives:

- **Deduplication** — identical content is stored once.
- **Integrity** — change a byte and the id changes, so corruption is detectable.
- **Cheap snapshots** — a commit that changes one file reuses every unchanged
  blob and tree; only the changed path produces new objects.

Git stores *snapshots*, not diffs — diffs are computed only for display.

## What's deliberately left out

Staging area, branches, merging, compression/packfiles, remotes. Each maps to a
small addition on top of this core (e.g. a branch is just a named pointer to a
commit id), so nothing here has to be thrown away to grow it.

## Commands

```
minivcs init                  # create the .minivcs object store
minivcs commit "message"      # snapshot the working dir, append to history
minivcs checkout <commit-id>  # restore the working dir to that snapshot
minivcs log                   # walk parent links from HEAD backwards
```

Storage lives in `.minivcs/`: objects are files named by their own hash
(`.minivcs/objects/<hash>`), and `.minivcs/HEAD` holds the current commit id.

## Run it

Python (no dependencies):
```
python3 python/minivcs.py init
```

C++ (no dependencies; SHA-256 is implemented inline):
```
g++ -std=c++17 -O2 cpp/minivcs.cpp -o minivcs
./minivcs init
```

Both use the identical object format and SHA-256, so a repo created by one is
readable by the other.
