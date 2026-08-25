#!/usr/bin/env python3
"""minivcs - a minimal git-like version control system.

Core model: a repository is a content-addressed object store plus a chain of
commits. Nothing is ever mutated; new state = new objects. Three object kinds:
  blob   -> bytes of one file
  tree   -> a folder listing (names -> blob/tree ids)
  commit -> a snapshot (tree) + link to its parent commit
"""

import hashlib
import os
import sys
import time

REPO = ".minivcs"
OBJECTS = os.path.join(REPO, "objects")
HEAD = os.path.join(REPO, "HEAD")  # file holding the id of the current commit


# --- object store -----------------------------------------------------------

def hash_object(obj_type: str, data: bytes) -> str:
    """Store `data` and return its id. The id IS the hash of the content
    (content-addressing) which gives dedup + tamper detection for free."""
    # Type is folded into the hashed bytes so a blob and a tree with identical
    # payload get different ids (namespacing), exactly like git.
    full = f"{obj_type} {len(data)}\0".encode() + data
    oid = hashlib.sha256(full).hexdigest()
    path = os.path.join(OBJECTS, oid)
    if not os.path.exists(path):  # identical content already stored -> skip
        with open(path, "wb") as f:
            f.write(full)
    return oid


def read_object(oid: str):
    """Return (obj_type, data) for a stored id."""
    with open(os.path.join(OBJECTS, oid), "rb") as f:
        full = f.read()
    header, data = full.split(b"\0", 1)  # split on the NUL that ends the header
    obj_type = header.split(b" ", 1)[0].decode()
    return obj_type, data


# --- writing a working directory into objects -------------------------------

def write_tree(path: str) -> str:
    """Recursively turn a directory into tree/blob objects; return the tree id.
    Recursion mirrors the folder nesting: each dir becomes one tree object."""
    entries = []
    for name in sorted(os.listdir(path)):  # sorted -> a folder's bytes are
        if name in (REPO, ".git"):         # deterministic, so equal folders
            continue                        # hash to the same id
        full = os.path.join(path, name)
        if os.path.isdir(full):
            entries.append(("tree", write_tree(full), name))
        else:
            with open(full, "rb") as f:
                oid = hash_object("blob", f.read())
            entries.append(("blob", oid, name))
    listing = "".join(f"{t} {oid} {name}\n" for t, oid, name in entries)
    return hash_object("tree", listing.encode())


def commit(message: str) -> str:
    """Snapshot the working dir and append a commit to the history chain."""
    tree = write_tree(".")
    parent = current_head()
    lines = [f"tree {tree}"]
    if parent:                       # first commit has no parent; every commit
        lines.append(f"parent {parent}")  # after points back -> a linked list
    lines.append(f"time {int(time.time())}")
    lines.append("")                 # blank line separates headers from message
    lines.append(message)
    oid = hash_object("commit", "\n".join(lines).encode())
    with open(HEAD, "w") as f:       # move HEAD forward to the new commit
        f.write(oid)
    return oid


# --- reading objects back onto disk -----------------------------------------

def restore_tree(tree_oid: str, dest: str):
    """Write the files described by a tree back into directory `dest`."""
    _, data = read_object(tree_oid)
    for line in data.decode().splitlines():
        obj_type, oid, name = line.split(" ", 2)
        target = os.path.join(dest, name)
        if obj_type == "tree":
            os.makedirs(target, exist_ok=True)
            restore_tree(oid, target)
        else:
            _, blob = read_object(oid)
            with open(target, "wb") as f:
                f.write(blob)


def clean_worktree():
    """Remove tracked files before restoring, so a checkout reflects exactly
    the target snapshot (and doesn't leave stray files from another commit)."""
    for name in os.listdir("."):
        if name in (REPO, ".git"):
            continue
        full = os.path.join(".", name)
        if os.path.isdir(full):
            _rmtree(full)
        else:
            os.remove(full)


def _rmtree(path: str):
    for name in os.listdir(path):
        full = os.path.join(path, name)
        _rmtree(full) if os.path.isdir(full) else os.remove(full)
    os.rmdir(path)


def checkout(commit_oid: str):
    """Reset the working directory to the snapshot of a given commit."""
    obj_type, data = read_object(commit_oid)
    if obj_type != "commit":
        sys.exit(f"{commit_oid} is not a commit")
    tree = data.decode().splitlines()[0].split(" ")[1]  # first header = tree
    clean_worktree()
    restore_tree(tree, ".")
    with open(HEAD, "w") as f:
        f.write(commit_oid)


# --- history + head ---------------------------------------------------------

def current_head():
    if os.path.exists(HEAD):
        with open(HEAD) as f:
            return f.read().strip() or None
    return None


def log():
    """Walk parent links from HEAD back to the first commit."""
    oid = current_head()
    while oid:
        _, data = read_object(oid)
        headers = {}
        text = data.decode().splitlines()
        for i, line in enumerate(text):
            if line == "":            # blank line ends headers
                message = "\n".join(text[i + 1:])
                break
            k, v = line.split(" ", 1)
            headers[k] = v
        ts = time.strftime("%Y-%m-%d %H:%M", time.localtime(int(headers["time"])))
        print(f"commit {oid}\n  {ts}  {message}\n")
        oid = headers.get("parent")   # step to parent; None ends the walk


# --- CLI --------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    if not args:
        sys.exit("usage: minivcs <init|commit|checkout|log> [args]")
    cmd = args[0]
    if cmd == "init":
        os.makedirs(OBJECTS, exist_ok=True)
        print(f"initialized empty repo in {REPO}/")
    elif cmd == "commit":
        if len(args) < 2:
            sys.exit('usage: minivcs commit "message"')
        print("committed", commit(args[1]))
    elif cmd == "checkout":
        if len(args) < 2:
            sys.exit("usage: minivcs checkout <commit-id>")
        checkout(args[1])
        print("checked out", args[1])
    elif cmd == "log":
        log()
    else:
        sys.exit(f"unknown command: {cmd}")


if __name__ == "__main__":
    main()
