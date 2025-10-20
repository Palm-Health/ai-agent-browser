# 🔧 Troubleshooting Guide

## ✅ Fixed: Port Conflict Issue

**Problem:** The app was waiting for two ports (5173 and 5174) but Vite only starts one server.

**Solution Applied:**
- ✅ Updated `package.json` to only wait for port 5173
- ✅ Compiled Electron files to `electron-dist/`
- ✅ Killed existing processes blocking ports
- ✅ Restarted the application

## 🚀 Starting the Application

### Normal Start
```bash
npm run dev
```

### If You Get Port Conflicts

**Option 1: Kill existing processes**
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*electron*"} | Stop-Process -Force
```

**Option 2: Use a different port**
Edit `vite.config.ts` and change:
```typescript
server: {
  port: 5180,  // Change to an available port
  host: '0.0.0.0',
}
```

Then update `package.json`:
```json
"dev:electron": "wait-on http://localhost:5180 && electron ..."
```

### If Electron Files Are Missing

Rebuild them:
```bash
npx tsc electron/main.ts electron/preload.ts --outDir electron-dist --module es2020 --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node
```

## 🐛 Common Issues

### Issue: "Port 5173 is in use"
**Solution:**
1. Kill existing Node/Electron processes (see above)
2. Or change the port in `vite.config.ts`

### Issue: "electron-dist/main.js not found"
**Solution:**
```bash
npx tsc electron/main.ts electron/preload.ts --outDir electron-dist --module es2020 --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node
```

### Issue: "MCP server failed to start"
**Solution:**
1. Check if the command is installed (npx, python, node)
2. Verify API keys in `.env.local`
3. Check console for specific error messages
4. Try running the MCP server manually:
   ```bash
   npx @modelcontextprotocol/server-memory
   ```

### Issue: "Cannot find module '@modelcontextprotocol/sdk'"
**Solution:**
```bash
npm install
```

### Issue: Electron window doesn't open
**Solution:**
1. Check if Vite server started successfully (should see "Local: http://localhost:5173/")
2. Check if electron-dist files exist
3. Try running in separate terminals:
   ```bash
   # Terminal 1
   npm run dev:vite
   
   # Terminal 2 (after Vite starts)
   npm run dev:electron
   ```

## 🔍 Debugging

### Check if Vite is running
```bash
curl http://localhost:5173
```

### Check what's using a port
```powershell
netstat -ano | findstr :5173
```

### View all Node processes
```powershell
Get-Process node
```

### View Electron logs
Check the terminal output where you ran `npm run dev`

## 📝 Build Commands

### Development
```bash
npm run dev          # Start dev server + Electron
npm run dev:vite     # Start only Vite server
npm run dev:electron # Start only Electron (requires Vite running)
```

### Production
```bash
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing
```bash
npx tsx test-config-only.ts  # Test MCP configuration
```

## ✅ Verification Checklist

Before starting the app, make sure:
- [ ] `node_modules/` exists (run `npm install` if not)
- [ ] `electron-dist/` exists with compiled files
- [ ] No other processes using ports 5173-5180
- [ ] `.env.local` has your API keys
- [ ] All dependencies are installed

## 🆘 Still Having Issues?

1. **Clean reinstall:**
   ```bash
   Remove-Item -Recurse -Force node_modules
   npm install
   ```

2. **Check Node version:**
   ```bash
   node --version  # Should be 18+
   ```

3. **Check npm version:**
   ```bash
   npm --version
   ```

4. **View detailed logs:**
   ```bash
   npm run dev --verbose
   ```

---

**The app should now be running successfully! 🎉**
