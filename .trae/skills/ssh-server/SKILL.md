---
name: "ssh-server"
description: "SSH连接到远程服务器执行命令。Invoke when user asks to connect to server or run remote commands."
---

# SSH Server Connection

This skill provides SSH connection to the remote server for executing commands.

## SSH Connection Details

- **Host**: 35.212.155.128
- **Port**: 22
- **Username**: g1589765114l
- **Private Key**: C:\Users\ikura\.ssh\google_compute_engine

## Usage

When you need to connect to the server, use the following command format:

```powershell
ssh -i "C:\Users\ikura\.ssh\google_compute_engine" g1589765114l@35.212.155.128 "<command>"
```

## Examples

1. **Check server status**:
```powershell
ssh -i "C:\Users\ikura\.ssh\google_compute_engine" g1589765114l@35.212.155.128 "cd ~/MySync-Private-docke/server && docker compose ps"
```

2. **View logs**:
```powershell
ssh -i "C:\Users\ikura\.ssh\google_compute_engine" g1589765114l@35.212.155.128 "cd ~/MySync-Private-docke/server && docker compose logs"
```

3. **Redeploy**:
```powershell
ssh -i "C:\Users\ikura\.ssh\google_compute_engine" g1589765114l@35.212.155.128 "cd ~/MySync-Private-docke/server && sudo rm -rf data .env && docker compose down -v && git pull && bash scripts/deploy-docker.sh"
```

4. **Check data directory**:
```powershell
ssh -i "C:\Users\ikura\.ssh\google_compute_engine" g1589765114l@35.212.155.128 "ls -la ~/MySync-Private-docke/server/data/"
```

## Invoke This Skill

Use this skill when:
- User asks to connect to the server
- User asks to run commands on the server
- User asks to redeploy or restart the service
- User asks to check server status or logs
