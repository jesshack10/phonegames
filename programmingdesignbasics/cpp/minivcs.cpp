// minivcs - a minimal git-like version control system (C++17).
//
// Core model: a repository is a content-addressed object store plus a chain of
// commits. Objects are immutable; new state = new objects. Three object kinds:
//   blob   -> bytes of one file
//   tree   -> a folder listing (names -> blob/tree ids)
//   commit -> a snapshot (tree) + link to its parent commit
//
// Build:  g++ -std=c++17 -O2 minivcs.cpp -o minivcs
// Usage:  ./minivcs <init|commit|checkout|log> [args]

#include <algorithm>
#include <cstdint>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace fs = std::filesystem;

// ---------------------------------------------------------------------------
// SHA-256 (self-contained). We need a cryptographic hash because the object id
// is the hash of its content (content-addressing): same content -> same id, so
// we get deduplication and tamper-detection for free. Reference FIPS 180-4.
// ---------------------------------------------------------------------------
namespace sha256 {
inline uint32_t rotr(uint32_t x, uint32_t n) { return (x >> n) | (x << (32 - n)); }

std::string hash(const std::string& msg) {
    static const uint32_t K[64] = {
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2};
    uint32_t h[8] = {0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
                     0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19};

    std::vector<uint8_t> data(msg.begin(), msg.end());
    uint64_t bitlen = (uint64_t)data.size() * 8;
    data.push_back(0x80);                       // append the '1' bit, then pad
    while (data.size() % 64 != 56) data.push_back(0x00);
    for (int i = 7; i >= 0; --i)                // append 64-bit big-endian length
        data.push_back((uint8_t)(bitlen >> (i * 8)));

    for (size_t off = 0; off < data.size(); off += 64) {   // per 512-bit block
        uint32_t w[64];
        for (int i = 0; i < 16; ++i)
            w[i] = (data[off+i*4] << 24) | (data[off+i*4+1] << 16) |
                   (data[off+i*4+2] << 8) | data[off+i*4+3];
        for (int i = 16; i < 64; ++i) {
            uint32_t s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >> 3);
            uint32_t s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >> 10);
            w[i] = w[i-16] + s0 + w[i-7] + s1;
        }
        uint32_t a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];
        for (int i = 0; i < 64; ++i) {
            uint32_t S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
            uint32_t ch = (e & f) ^ (~e & g);
            uint32_t t1 = hh + S1 + ch + K[i] + w[i];
            uint32_t S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
            uint32_t maj = (a & b) ^ (a & c) ^ (b & c);
            uint32_t t2 = S0 + maj;
            hh=g; g=f; f=e; e=d+t1; d=c; c=b; b=a; a=t1+t2;
        }
        h[0]+=a; h[1]+=b; h[2]+=c; h[3]+=d; h[4]+=e; h[5]+=f; h[6]+=g; h[7]+=hh;
    }
    std::ostringstream out;                     // render as 64 hex chars
    for (int i = 0; i < 8; ++i) {
        out.width(8); out.fill('0'); out << std::hex << h[i];
    }
    return out.str();
}
}  // namespace sha256

// ---------------------------------------------------------------------------
// Paths / small IO helpers
// ---------------------------------------------------------------------------
const std::string REPO = ".minivcs";
const std::string OBJECTS = REPO + "/objects";
const std::string HEAD = REPO + "/HEAD";

std::string read_file(const std::string& path) {
    std::ifstream f(path, std::ios::binary);
    std::ostringstream ss; ss << f.rdbuf();
    return ss.str();
}

void write_file(const std::string& path, const std::string& data) {
    std::ofstream f(path, std::ios::binary);
    f << data;
}

// ---------------------------------------------------------------------------
// Object store
// ---------------------------------------------------------------------------

// Store `data` and return its id (= hash of the content). The type is folded
// into the hashed bytes so a blob and a tree with equal payload get distinct
// ids (namespacing), exactly like git.
std::string hash_object(const std::string& type, const std::string& data) {
    std::string full = type + " " + std::to_string(data.size()) + '\0' + data;
    std::string oid = sha256::hash(full);
    std::string path = OBJECTS + "/" + oid;
    if (!fs::exists(path)) write_file(path, full);   // dedup: skip if present
    return oid;
}

// Return {type, payload} for a stored id.
std::pair<std::string, std::string> read_object(const std::string& oid) {
    std::string full = read_file(OBJECTS + "/" + oid);
    size_t nul = full.find('\0');                    // NUL terminates the header
    std::string header = full.substr(0, nul);
    std::string type = header.substr(0, header.find(' '));
    return {type, full.substr(nul + 1)};
}

// ---------------------------------------------------------------------------
// Working directory  ->  objects
// ---------------------------------------------------------------------------

// Recursively turn a directory into tree/blob objects; return the tree id.
// Recursion mirrors folder nesting: each directory becomes one tree object.
std::string write_tree(const fs::path& dir) {
    std::vector<fs::directory_entry> entries;
    for (auto& e : fs::directory_iterator(dir)) {
        std::string name = e.path().filename().string();
        if (name == REPO || name == ".git") continue;
        entries.push_back(e);
    }
    // Sort by name so a folder's serialized bytes are deterministic; identical
    // folders then hash to the same id.
    std::sort(entries.begin(), entries.end(),
              [](auto& a, auto& b){ return a.path().filename() < b.path().filename(); });

    std::string listing;
    for (auto& e : entries) {
        std::string name = e.path().filename().string();
        if (e.is_directory()) {
            listing += "tree " + write_tree(e.path()) + " " + name + "\n";
        } else {
            std::string oid = hash_object("blob", read_file(e.path().string()));
            listing += "blob " + oid + " " + name + "\n";
        }
    }
    return hash_object("tree", listing);
}

std::string current_head() {
    return fs::exists(HEAD) ? read_file(HEAD) : "";
}

// Snapshot the working dir and append a commit to the history chain.
std::string commit(const std::string& message) {
    std::string tree = write_tree(".");
    std::string parent = current_head();
    std::ostringstream body;
    body << "tree " << tree << "\n";
    if (!parent.empty()) body << "parent " << parent << "\n";  // link to prior
    body << "time " << (long)std::time(nullptr) << "\n";        // commit -> chain
    body << "\n" << message;                    // blank line separates headers
    std::string oid = hash_object("commit", body.str());
    write_file(HEAD, oid);                       // advance HEAD to new commit
    return oid;
}

// ---------------------------------------------------------------------------
// Objects  ->  working directory
// ---------------------------------------------------------------------------

// Write the files described by a tree back into directory `dest`.
void restore_tree(const std::string& tree_oid, const fs::path& dest) {
    auto [type, data] = read_object(tree_oid);
    std::istringstream ss(data);
    std::string t, oid, name;
    while (ss >> t >> oid) {
        ss.get();                                // consume the single space
        std::getline(ss, name);                  // name may contain spaces
        fs::path target = dest / name;
        if (t == "tree") {
            fs::create_directories(target);
            restore_tree(oid, target);
        } else {
            write_file(target.string(), read_object(oid).second);
        }
    }
}

// Remove tracked files before restoring, so a checkout reflects exactly the
// target snapshot and leaves no stray files from another commit.
void clean_worktree() {
    for (auto& e : fs::directory_iterator(".")) {
        std::string name = e.path().filename().string();
        if (name == REPO || name == ".git") continue;
        fs::remove_all(e.path());
    }
}

// Reset the working directory to the snapshot of a given commit.
void checkout(const std::string& commit_oid) {
    auto [type, data] = read_object(commit_oid);
    if (type != "commit") { std::cerr << commit_oid << " is not a commit\n"; exit(1); }
    std::string tree = data.substr(5, data.find('\n') - 5);  // first header = tree
    clean_worktree();
    restore_tree(tree, ".");
    write_file(HEAD, commit_oid);
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

// Walk parent links from HEAD back to the first commit.
void log() {
    std::string oid = current_head();
    while (!oid.empty()) {
        auto [type, data] = read_object(oid);
        std::istringstream ss(data);
        std::string line, parent, message;
        bool in_body = false;
        long ts = 0;
        while (std::getline(ss, line)) {
            if (in_body) { message += (message.empty() ? "" : "\n") + line; continue; }
            if (line.empty()) { in_body = true; continue; }   // blank ends headers
            std::string key = line.substr(0, line.find(' '));
            std::string val = line.substr(line.find(' ') + 1);
            if (key == "parent") parent = val;
            else if (key == "time") ts = std::stol(val);
        }
        std::time_t t = ts;
        char buf[32];
        std::strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M", std::localtime(&t));
        std::cout << "commit " << oid << "\n  " << buf << "  " << message << "\n\n";
        oid = parent;                            // step to parent; empty ends walk
    }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
int main(int argc, char** argv) {
    if (argc < 2) { std::cerr << "usage: minivcs <init|commit|checkout|log> [args]\n"; return 1; }
    std::string cmd = argv[1];
    if (cmd == "init") {
        fs::create_directories(OBJECTS);
        std::cout << "initialized empty repo in " << REPO << "/\n";
    } else if (cmd == "commit") {
        if (argc < 3) { std::cerr << "usage: minivcs commit \"message\"\n"; return 1; }
        std::cout << "committed " << commit(argv[2]) << "\n";
    } else if (cmd == "checkout") {
        if (argc < 3) { std::cerr << "usage: minivcs checkout <commit-id>\n"; return 1; }
        checkout(argv[2]);
        std::cout << "checked out " << argv[2] << "\n";
    } else if (cmd == "log") {
        log();
    } else {
        std::cerr << "unknown command: " << cmd << "\n";
        return 1;
    }
    return 0;
}
