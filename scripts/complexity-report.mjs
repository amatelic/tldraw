#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

export const DEFAULT_COMPLEXITY_THRESHOLDS = {
  sourceFileLines: 500,
  componentLines: 220,
  hookFileLines: 240,
  hookFunctionLines: 180,
  hookCallCount: 10,
};

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules',
  'test-results',
]);

const TEST_FILE_PATTERN = /(?:\.test|\.spec)\.[cm]?[jt]sx?$/;
const ESLINT_DISABLE_COMMENT_PATTERN = /eslint-disable(?:-next-line|-line)?(?:\s+([^\n*]+))?/;

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function isSourcePath(filePath) {
  return SOURCE_EXTENSIONS.has(path.extname(filePath));
}

function isTestPath(filePath) {
  return TEST_FILE_PATTERN.test(filePath);
}

function isHookPath(filePath) {
  const basename = path.basename(filePath);
  return /^use[A-Z].*\.[jt]sx?$/.test(basename) || /\/use[A-Z][^/]*\.[jt]sx?$/.test(toPosixPath(filePath));
}

function getScriptKind(filePath) {
  switch (path.extname(filePath)) {
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.js':
    case '.mjs':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function parseSourceFile(filePath, source) {
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
}

function countSignificantLines(source) {
  let inBlockComment = false;

  return source.split(/\r?\n/).filter((line) => {
    let trimmed = line.trim();

    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false;
        trimmed = trimmed.slice(trimmed.indexOf('*/') + 2).trim();
      } else {
        return false;
      }
    }

    if (trimmed === '' || trimmed.startsWith('//')) {
      return false;
    }

    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
      }
      return false;
    }

    return true;
  }).length;
}

function getLine(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function getFunctionBlock(node, sourceFile) {
  if (ts.isFunctionDeclaration(node) && node.name && node.body) {
    return {
      name: node.name.text,
      startIndex: node.getStart(sourceFile),
      bodyStart: node.body.getStart(sourceFile),
      bodyEnd: node.body.getEnd(),
      body: node.body,
    };
  }

  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.initializer &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
    ts.isBlock(node.initializer.body)
  ) {
    return {
      name: node.name.text,
      startIndex: node.getStart(sourceFile),
      bodyStart: node.initializer.body.getStart(sourceFile),
      bodyEnd: node.initializer.body.getEnd(),
      body: node.initializer.body,
    };
  }

  return null;
}

function collectFunctionBlocks(sourceFile) {
  const functionBlocks = [];

  function visit(node) {
    const functionBlock = getFunctionBlock(node, sourceFile);

    if (functionBlock) {
      functionBlocks.push(functionBlock);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return functionBlocks;
}

function countHookCalls(node) {
  let hookCalls = 0;

  function visit(currentNode) {
    if (
      ts.isCallExpression(currentNode) &&
      ts.isIdentifier(currentNode.expression) &&
      /^use[A-Z]/.test(currentNode.expression.text)
    ) {
      hookCalls += 1;
    }

    ts.forEachChild(currentNode, visit);
  }

  visit(node);
  return hookCalls;
}

function collectCommentRanges(source, sourceFile) {
  const comments = new Map();

  function addCommentRanges(ranges) {
    for (const range of ranges ?? []) {
      comments.set(`${range.pos}:${range.end}`, range);
    }
  }

  function visit(node) {
    addCommentRanges(ts.getLeadingCommentRanges(source, node.pos));
    addCommentRanges(ts.getTrailingCommentRanges(source, node.end));
    ts.forEachChild(node, visit);
  }

  addCommentRanges(ts.getLeadingCommentRanges(source, 0));
  visit(sourceFile);

  return Array.from(comments.values()).sort((a, b) => a.pos - b.pos);
}

function findLintDisableDirectives(filePath, source, sourceFile) {
  return collectCommentRanges(source, sourceFile).flatMap((range) => {
    const comment = source.slice(range.pos, range.end);
    const match = comment.match(ESLINT_DISABLE_COMMENT_PATTERN);

    if (!match) {
      return [];
    }

    return [
      {
        filePath,
        line: getLine(sourceFile, range.pos),
        rules: (match[1] ?? '').trim() || 'all rules',
        text: match[0].trim(),
      },
    ];
  });
}

export function analyzeSourceText(filePath, source, thresholds = DEFAULT_COMPLEXITY_THRESHOLDS) {
  const sourceFile = parseSourceFile(filePath, source);
  const significantLines = countSignificantLines(source);
  const isTest = isTestPath(filePath);
  const isTsx = path.extname(filePath) === '.tsx' || path.extname(filePath) === '.jsx';
  const hookFile = isHookPath(filePath);
  const oversizedFiles = [];
  const largeComponents = [];
  const largeHooks = [];

  if (!isTest && significantLines > thresholds.sourceFileLines) {
    oversizedFiles.push({
      filePath,
      lines: significantLines,
      limit: thresholds.sourceFileLines,
      reason: 'source-file',
    });
  }

  if (!isTest && hookFile && significantLines > thresholds.hookFileLines) {
    oversizedFiles.push({
      filePath,
      lines: significantLines,
      limit: thresholds.hookFileLines,
      reason: 'hook-file',
    });
  }

  if (!isTest) {
    for (const block of collectFunctionBlocks(sourceFile)) {
      const bodySource = source.slice(block.bodyStart, block.bodyEnd);
      const bodyLines = countSignificantLines(bodySource);
      const startLine = getLine(sourceFile, block.startIndex);

      if (isTsx && /^[A-Z]/.test(block.name) && bodyLines > thresholds.componentLines) {
        largeComponents.push({
          filePath,
          name: block.name,
          line: startLine,
          lines: bodyLines,
          limit: thresholds.componentLines,
        });
      }

      if (/^use[A-Z]/.test(block.name)) {
        const hookCalls = countHookCalls(block.body);

        if (bodyLines > thresholds.hookFunctionLines || hookCalls > thresholds.hookCallCount) {
          largeHooks.push({
            filePath,
            name: block.name,
            line: startLine,
            lines: bodyLines,
            lineLimit: thresholds.hookFunctionLines,
            hookCalls,
            hookCallLimit: thresholds.hookCallCount,
          });
        }
      }
    }
  }

  return {
    oversizedFiles,
    largeComponents,
    largeHooks,
    lintDisableDirectives: findLintDisableDirectives(filePath, source, sourceFile),
  };
}

export function createComplexityReport(files, thresholds = DEFAULT_COMPLEXITY_THRESHOLDS) {
  const emptyReport = {
    totals: {
      files: files.length,
      warnings: 0,
    },
    thresholds,
    oversizedFiles: [],
    largeComponents: [],
    largeHooks: [],
    lintDisableDirectives: [],
  };

  const report = files.reduce((currentReport, file) => {
    const analysis = analyzeSourceText(file.filePath, file.source, thresholds);

    currentReport.oversizedFiles.push(...analysis.oversizedFiles);
    currentReport.largeComponents.push(...analysis.largeComponents);
    currentReport.largeHooks.push(...analysis.largeHooks);
    currentReport.lintDisableDirectives.push(...analysis.lintDisableDirectives);

    return currentReport;
  }, emptyReport);

  report.totals.warnings =
    report.oversizedFiles.length +
    report.largeComponents.length +
    report.largeHooks.length +
    report.lintDisableDirectives.length;

  return report;
}

function formatList(items, formatter) {
  if (items.length === 0) {
    return ['  none'];
  }

  return items.map((item) => `  ${formatter(item)}`);
}

export function formatComplexityReport(report, { strict = false } = {}) {
  const lines = [
    'Code complexity report',
    `Mode: ${strict ? 'strict' : 'advisory'}${strict ? '' : ' (warnings do not fail the command)'}`,
    '',
    'Thresholds:',
    `  source files: > ${report.thresholds.sourceFileLines} significant lines`,
    `  hook files: > ${report.thresholds.hookFileLines} significant lines`,
    `  React components: > ${report.thresholds.componentLines} significant body lines`,
    `  custom hooks: > ${report.thresholds.hookFunctionLines} significant body lines or > ${report.thresholds.hookCallCount} hook calls`,
    '',
    `Oversized files (${report.oversizedFiles.length}):`,
    ...formatList(
      report.oversizedFiles,
      (item) => `${item.filePath}:${item.lines} lines exceeds ${item.limit} (${item.reason})`
    ),
    '',
    `Large React components (${report.largeComponents.length}):`,
    ...formatList(
      report.largeComponents,
      (item) => `${item.filePath}:${item.line} ${item.name} has ${item.lines} body lines (limit ${item.limit})`
    ),
    '',
    `Large hooks (${report.largeHooks.length}):`,
    ...formatList(
      report.largeHooks,
      (item) =>
        `${item.filePath}:${item.line} ${item.name} has ${item.lines} body lines and ${item.hookCalls} hook calls (limits ${item.lineLimit}/${item.hookCallLimit})`
    ),
    '',
    `Disabled lint directives (${report.lintDisableDirectives.length}):`,
    ...formatList(
      report.lintDisableDirectives,
      (item) => `${item.filePath}:${item.line} disables ${item.rules}`
    ),
    '',
    `Total warnings: ${report.totals.warnings}`,
  ];

  return lines.join('\n');
}

async function collectFilesFromDirectory(directory, rootDirectory) {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (EXCLUDED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFilesFromDirectory(entryPath, rootDirectory)));
      continue;
    }

    if (entry.isFile() && isSourcePath(entry.name)) {
      files.push({
        filePath: toPosixPath(path.relative(rootDirectory, entryPath)),
        source: await readFile(entryPath, 'utf8'),
      });
    }
  }

  return files;
}

export async function collectProjectFiles(rootDirectory) {
  const sourceFiles = await collectFilesFromDirectory(path.join(rootDirectory, 'src'), rootDirectory);
  const scriptFiles = await collectFilesFromDirectory(path.join(rootDirectory, 'scripts'), rootDirectory);
  const rootFiles = ['eslint.config.js', 'vite.config.ts', 'vitest.config.ts'];
  const configFiles = [];

  for (const rootFile of rootFiles) {
    const absolutePath = path.join(rootDirectory, rootFile);

    if (existsSync(absolutePath)) {
      configFiles.push({
        filePath: rootFile,
        source: await readFile(absolutePath, 'utf8'),
      });
    }
  }

  return [...sourceFiles, ...scriptFiles, ...configFiles];
}

async function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const json = args.includes('--json');
  const rootDirectory = process.cwd();
  const files = await collectProjectFiles(rootDirectory);
  const report = createComplexityReport(files);

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatComplexityReport(report, { strict }));
  }

  if (strict && report.totals.warnings > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
