#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('📊 Test Coverage Analysis');
console.log('========================');

// Check API coverage
const apiCoveragePath = join(process.cwd(), 'coverage', 'coverage-summary.json');
if (existsSync(apiCoveragePath)) {
  try {
    const apiCoverage = JSON.parse(readFileSync(apiCoveragePath, 'utf8'));
    const { total } = apiCoverage;

    console.log('\n🔧 API Coverage:');
    console.log(`Lines: ${total.lines.pct}%`);
    console.log(`Functions: ${total.functions.pct}%`);
    console.log(`Branches: ${total.branches.pct}%`);
    console.log(`Statements: ${total.statements.pct}%`);
  } catch (e) {
    console.log('\n🔧 API Coverage: Report not found or invalid');
  }
} else {
  console.log('\n🔧 API Coverage: No coverage report found');
}

// Check frontend coverage
const frontendCoveragePath = join(process.cwd(), 'frontend', 'coverage', 'coverage-summary.json');
if (existsSync(frontendCoveragePath)) {
  try {
    const frontendCoverage = JSON.parse(readFileSync(frontendCoveragePath, 'utf8'));
    const { total } = frontendCoverage;

    console.log('\n🎨 Frontend Coverage:');
    console.log(`Lines: ${total.lines.pct}%`);
    console.log(`Functions: ${total.functions.pct}%`);
    console.log(`Branches: ${total.branches.pct}%`);
    console.log(`Statements: ${total.statements.pct}%`);
  } catch (e) {
    console.log('\n🎨 Frontend Coverage: Report not found or invalid');
  }
} else {
  console.log('\n🎨 Frontend Coverage: No coverage report found');
}

console.log('\n🎯 Target Coverage: 65%+ for Staff Engineer standards');
console.log('========================');