# 🧹 Project Streamlining & Cleanup Plan

## 📊 Current Bloat Analysis

**Major Issues Found:**
1. **19 Documentation Files** - Many redundant/outdated guides
2. **Multiple Test Files** - 5 different test scripts doing similar things
3. **Duplicate MCP Server node_modules** - Each MCP server has its own node_modules (35,689 files!)
4. **Built Output** - `dist/` and `electron-dist/` directories
5. **Multiple .env Files** - `.env`, `.env.local`, `env.local`

## ✂️ Recommended Cleanup

### 1. **Consolidate Documentation** (Save ~100KB)
**Keep:**
- `README.md` - Main documentation
- `MCP_INTEGRATION_COMPLETE.md` - Your MCP setup guide
- `INTELLIGENT_ROUTING_GUIDE.md` - Routing documentation

**Delete/Archive:**
- `BROWSER_FEATURES_IMPLEMENTATION.md`
- `DEBUG_REPORT.md`
- `IMPLEMENTATION_COMPLETE.md`
- `IMPLEMENTATION_SUMMARY.md`
- `INTEGRATION_GUIDE.md`
- `LOCAL_AI_GUIDE.md`
- `PROJECT_INDEX.md`
- `QUICK_REFERENCE_ROUTING.md`
- `QUICK_START_LOCAL_AI.md`
- `ROUTING_TEST_SUMMARY.md`
- `ROUTING_UPGRADE_G4-G7_SUMMARY.md`
- `ROUTING_UPGRADE_SUMMARY.md`
- `ROUTING_V2_MIGRATION.md`
- `TEST_ROUTING_GUIDE.md`

### 2. **Consolidate Test Files** (Save ~50KB)
**Keep:**
- `test-config-only.ts` - Simple configuration test

**Delete:**
- `test-all-mcps.ts`
- `test-app.ts`
- `test-intelligent-routing.ts`
- `test-mcps-quick.ts`

### 3. **Remove Duplicate MCP Server Dependencies** (Save ~200MB!)
**Problem:** Each MCP server in `mcp-servers/` has its own `node_modules` with duplicate dependencies.

**Solution:** Since you're using `npx` for most MCPs, you don't need these local servers. They'll be downloaded on-demand.

**Delete:**
- `mcp-servers/browser-automation-server/node_modules/`
- `mcp-servers/file-system-server/node_modules/`
- `mcp-servers/vision-server/node_modules/`
- `mcp-servers/web-scraping-server/node_modules/`

Or better yet, **remove the entire `mcp-servers/` directory** since you're using official MCP servers via `npx`.

### 4. **Clean Build Artifacts** (Save ~5MB)
**Delete:**
- `dist/` - Rebuild with `npm run build`
- `electron-dist/` - Rebuild with `npm run build`
- `debug.log`

### 5. **Fix Environment Files**
**Keep:**
- `.env.local` (rename to `.env` if needed)

**Delete:**
- `.env` (if it's empty/template)
- `env.local` (duplicate)

### 6. **Simplify Service Structure**
**Consider Removing:**
- `services/analyzer/` - If not actively used
- `services/automation/` test files - Keep only the core files
- Unused provider files if you're only using specific providers

## 🚀 Automated Cleanup Script

Here's a script to do the cleanup safely:

```bash
# 1. Remove redundant documentation
rm BROWSER_FEATURES_IMPLEMENTATION.md DEBUG_REPORT.md IMPLEMENTATION_COMPLETE.md
rm IMPLEMENTATION_SUMMARY.md INTEGRATION_GUIDE.md LOCAL_AI_GUIDE.md
rm PROJECT_INDEX.md QUICK_REFERENCE_ROUTING.md QUICK_START_LOCAL_AI.md
rm ROUTING_TEST_SUMMARY.md ROUTING_UPGRADE_G4-G7_SUMMARY.md
rm ROUTING_UPGRADE_SUMMARY.md ROUTING_V2_MIGRATION.md TEST_ROUTING_GUIDE.md

# 2. Remove redundant test files
rm test-all-mcps.ts test-app.ts test-intelligent-routing.ts test-mcps-quick.ts

# 3. Remove MCP server node_modules (BIGGEST SAVINGS!)
rm -rf mcp-servers/*/node_modules

# 4. Clean build artifacts
rm -rf dist electron-dist
rm debug.log

# 5. Fix env files
rm env.local
# Keep .env.local

# 6. Optional: Remove entire mcp-servers directory (use npx instead)
# rm -rf mcp-servers
```

## 📦 Expected Results

**Before Cleanup:**
- ~250MB+ total size
- 35,689+ files
- 19 documentation files
- 5 test files

**After Cleanup:**
- ~50MB total size (80% reduction!)
- ~1,000 files (97% reduction!)
- 3 documentation files
- 1 test file

## ⚠️ Important Notes

1. **MCP Servers:** Since you're using `npx` for most MCPs, you don't need local MCP servers. They'll be downloaded on-demand when needed.

2. **Documentation:** I can consolidate all important info into a single comprehensive README if you want.

3. **Tests:** Keep `test-config-only.ts` for quick validation. Remove the rest.

4. **Build Artifacts:** Can be regenerated anytime with `npm run build`.

## 🎯 Recommended Action

Run the cleanup script, or I can do it for you! This will make the project:
- ✅ Faster to clone/download
- ✅ Easier to navigate
- ✅ Less confusing with fewer docs
- ✅ Much smaller disk footprint

Would you like me to execute this cleanup?
