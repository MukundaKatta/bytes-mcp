#!/usr/bin/env node
/**
 * bytes MCP server. Two tools: `format`, `parse`.
 *
 * Convert between raw byte counts and human-readable size strings. Both
 * SI (1000-based: kB, MB, GB) and binary (1024-based: KiB, MiB, GiB) units.
 * No deps.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const VERSION = '0.1.0';

const BIN_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'];
const SI_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'];

export type System = 'binary' | 'si';

export function format(bytes: number, system: System = 'binary', precision: number = 2): string {
  if (!Number.isFinite(bytes)) throw new Error('bytes must be a finite number');
  const neg = bytes < 0;
  const abs = Math.abs(bytes);
  const base = system === 'si' ? 1000 : 1024;
  const units = system === 'si' ? SI_UNITS : BIN_UNITS;
  if (abs < base) return `${neg ? '-' : ''}${abs} ${units[0]}`;
  const exp = Math.min(units.length - 1, Math.floor(Math.log(abs) / Math.log(base)));
  const value = abs / Math.pow(base, exp);
  return `${neg ? '-' : ''}${value.toFixed(precision)} ${units[exp]}`;
}

const UNIT_VALUE: Record<string, number> = {
  // Binary
  b: 1, byte: 1, bytes: 1,
  kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4, pib: 1024 ** 5, eib: 1024 ** 6,
  // SI
  kb: 1000, mb: 1000 ** 2, gb: 1000 ** 3, tb: 1000 ** 4, pb: 1000 ** 5, eb: 1000 ** 6,
  // Common-but-loose: "K", "M", "G" — assume binary as in `du -h`.
  k: 1024, m: 1024 ** 2, g: 1024 ** 3, t: 1024 ** 4,
};

export function parse(input: string): number {
  const m = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*([a-z]+)?$/i);
  if (!m) throw new Error('cannot parse size: ' + input);
  const value = parseFloat(m[1]);
  const unit = (m[2] ?? 'B').toLowerCase();
  const mult = UNIT_VALUE[unit];
  if (mult === undefined) throw new Error('unknown unit: ' + m[2]);
  return Math.round(value * mult);
}

const server = new Server({ name: 'bytes', version: VERSION }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'format',
    description: 'Format a byte count as a human-readable string. system: binary (KiB/MiB) or si (kB/MB).',
    inputSchema: {
      type: 'object',
      properties: {
        bytes: { type: 'number' },
        system: { type: 'string', enum: ['binary', 'si'], default: 'binary' },
        precision: { type: 'integer', default: 2, minimum: 0, maximum: 10 },
      },
      required: ['bytes'],
    },
  },
  {
    name: 'parse',
    description: 'Parse a size string (e.g. "1.5 MB", "512KiB") to a byte count. Unitless input is treated as bytes.',
    inputSchema: {
      type: 'object',
      properties: { input: { type: 'string' } },
      required: ['input'],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (name === 'format') {
      const a = args as unknown as { bytes: number; system?: System; precision?: number };
      return jsonResult({ formatted: format(a.bytes, a.system ?? 'binary', a.precision ?? 2) });
    }
    if (name === 'parse') {
      const a = args as unknown as { input: string };
      return jsonResult({ bytes: parse(a.input) });
    }
    return errorResult('unknown tool: ' + name);
  } catch (err) {
    return errorResult('bytes failed: ' + (err as Error).message);
  }
});

function jsonResult(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function errorResult(message: string) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`bytes MCP server v${VERSION} ready on stdio\n`);
}
