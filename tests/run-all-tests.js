#!/usr/bin/env node
/**
 * Comprehensive E2E Test Runner for Weather MCP Server
 *
 * This script runs all tests in the correct order:
 * 1. Unit tests (utility functions)
 * 2. Integration tests (API requests)
 * 3. E2E tests (MCP tools)
 * 4. Performance tests (caching, rate limiting)
 * 5. Security tests (input validation, XSS prevention)
 */
import { execSync } from 'child_process';
import { performance } from 'perf_hooks';
const testSuites = [
    {
        name: 'Unit Tests',
        command: 'npm run test:unit',
        description: 'Testing utility functions, caching, rate limiting'
    },
    {
        name: 'Integration Tests',
        command: 'npm run test:integration',
        description: 'Testing API requests, error handling, retry logic'
    },
    {
        name: 'E2E Tests',
        command: 'npm run test:e2e',
        description: 'Testing MCP tools end-to-end functionality'
    },
    {
        name: 'Performance Tests',
        command: 'npm run test:performance',
        description: 'Testing caching performance, memory usage, scalability'
    },
    {
        name: 'Security Tests',
        command: 'npm run test:security',
        description: 'Testing input sanitization, rate limiting, XSS prevention'
    }
];
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};
function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}
function runTestSuite(suite) {
    const startTime = performance.now();
    log(`\n${colors.cyan}🧪 Running ${suite.name}...${colors.reset}`);
    log(`${colors.yellow}${suite.description}${colors.reset}`);
    try {
        const output = execSync(suite.command, {
            encoding: 'utf8',
            stdio: 'pipe'
        });
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        log(`${colors.green}✅ ${suite.name} passed in ${duration}ms${colors.reset}`);
        return { success: true, duration, output };
    }
    catch (error) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        log(`${colors.red}❌ ${suite.name} failed in ${duration}ms${colors.reset}`);
        log(`${colors.red}Error: ${error.message}${colors.reset}`);
        return { success: false, duration, output: error.stdout || error.message };
    }
}
function generateReport(results) {
    const totalDuration = results.reduce((sum, result) => sum + result.duration, 0);
    const passedSuites = results.filter(result => result.success).length;
    const totalSuites = results.length;
    log(`\n${colors.bright}${colors.blue}📊 Test Report${colors.reset}`);
    log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
    results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const color = result.success ? colors.green : colors.red;
        log(`${color}${status}${colors.reset} ${result.suite.name} (${result.duration}ms)`);
    });
    log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
    log(`${colors.bright}Total: ${passedSuites}/${totalSuites} test suites passed${colors.reset}`);
    log(`${colors.bright}Total Duration: ${totalDuration}ms${colors.reset}`);
    if (passedSuites === totalSuites) {
        log(`${colors.green}🎉 All tests passed! Weather MCP Server is production ready.${colors.reset}`);
        return true;
    }
    else {
        log(`${colors.red}⚠️  Some tests failed. Please review the output above.${colors.reset}`);
        return false;
    }
}
async function main() {
    log(`${colors.bright}${colors.magenta}🚀 Weather MCP Server - Comprehensive E2E Testing${colors.reset}`);
    log(`${colors.magenta}${'='.repeat(60)}${colors.reset}`);
    const results = [];
    for (const suite of testSuites) {
        const result = runTestSuite(suite);
        results.push({ suite, ...result });
        if (!result.success) {
            log(`${colors.yellow}⚠️  Continuing with remaining test suites...${colors.reset}`);
        }
    }
    const allPassed = generateReport(results);
    process.exit(allPassed ? 0 : 1);
}
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    log(`${colors.red}💥 Uncaught Exception: ${error.message}${colors.reset}`);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    log(`${colors.red}💥 Unhandled Rejection: ${reason}${colors.reset}`);
    process.exit(1);
});
main().catch((error) => {
    log(`${colors.red}💥 Test runner failed: ${error.message}${colors.reset}`);
    process.exit(1);
});
