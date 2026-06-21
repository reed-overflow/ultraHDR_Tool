const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const rootDir = __dirname;
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

function ensureDistDir() {
    fs.mkdirSync(distDir, { recursive: true });
}

function copyFile(fileName) {
    fs.copyFileSync(path.join(srcDir, fileName), path.join(distDir, fileName));
}

function copyDependencyAsset(fromPath, toFileName) {
    fs.copyFileSync(fromPath, path.join(distDir, toFileName));
}

async function build() {
    ensureDistDir();

    await esbuild.build({
        entryPoints: [path.join(srcDir, 'script.js')],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        target: ['es2020'],
        external: ['module'],
        outfile: path.join(distDir, 'script.js'),
    });

    copyFile('index.html');
    copyFile('style.css');
    copyFile('test.jpg');
    copyDependencyAsset(
        path.join(rootDir, 'node_modules', '@monogrid', 'gainmap-js', 'dist', 'libultrahdr-esm.wasm'),
        'libultrahdr-esm.wasm'
    );

    console.log('Build completed: dist/');
}

build().catch(error => {
    console.error(error);
    process.exit(1);
});