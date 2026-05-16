# bytes-mcp

[![npm](https://img.shields.io/npm/v/@mukundakatta/bytes-mcp.svg)](https://www.npmjs.com/package/@mukundakatta/bytes-mcp)
[![mcp](https://img.shields.io/badge/protocol-MCP-blue.svg)](https://modelcontextprotocol.io)

MCP server: convert byte counts to human-readable size strings and back.
Supports both binary (1024-based: KiB/MiB) and SI (1000-based: kB/MB) units.

## Tools

- `format` — `{ bytes: 1500000, system: "si" }` → `"1.50 MB"`
- `parse` — `{ input: "2.5 GiB" }` → `2684354560`

Loose units `K`, `M`, `G`, `T` are accepted on parse and treated as binary
(matches `du -h` convention).

## Configure

```json
{ "mcpServers": { "bytes": { "command": "npx", "args": ["-y", "@mukundakatta/bytes-mcp"] } } }
```

## License

MIT.
