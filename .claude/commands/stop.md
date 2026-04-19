# /stop local
Stop whatever is running on port 3000.

```bash
kill -9 $(lsof -t -i:3000) 2>/dev/null && echo "Server stopped" || echo "No server running on port 3000"
```
