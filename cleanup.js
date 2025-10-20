#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up build artifacts...');

const directoriesToRemove = [
    'dist',
    'dist-electron', 
    'electron-dist',
    'build',
    'out'
];

const filesToRemove = [
    '*.asar',
    '*.asar.unpacked'
];

let totalRemoved = 0;

// Remove directories
directoriesToRemove.forEach(dir => {
    if (fs.existsSync(dir)) {
        try {
            const stats = fs.statSync(dir);
            if (stats.isDirectory()) {
                console.log(`📁 Removing directory: ${dir}`);
                fs.rmSync(dir, { recursive: true, force: true });
                totalRemoved++;
            }
        } catch (error) {
            console.log(`⚠️  Could not remove ${dir}: ${error.message}`);
        }
    }
});

// Remove files
filesToRemove.forEach(pattern => {
    // Simple glob pattern matching
    const files = fs.readdirSync('.', { withFileTypes: true })
        .filter(file => file.isFile() && file.name.includes(pattern.replace('*', '')))
        .map(file => file.name);
    
    files.forEach(file => {
        try {
            console.log(`📄 Removing file: ${file}`);
            fs.unlinkSync(file);
            totalRemoved++;
        } catch (error) {
            console.log(`⚠️  Could not remove ${file}: ${error.message}`);
        }
    });
});

console.log(`✅ Cleanup complete! Removed ${totalRemoved} items.`);
console.log('📦 Repository is now optimized for GitHub!');
