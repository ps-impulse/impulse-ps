const fs = require('fs');
const path = require('path');

const DIR = 'impulse/chat-plugins/clans';

const groups = {
    'index.ts': [
        'commands/index.ts',
        'war/index.ts'
    ],
    'interface.ts': ['interface.ts'],
    'constants.ts': ['constants.ts'],
    'database.ts': ['database.ts'],
    'utils.ts': [
        'utils.ts',
        'state.ts',
        'helpers/broadcast.ts',
        'helpers/context.ts',
        'helpers/elo.ts',
        'helpers/html.ts'
    ],
    'render.ts': ['render.ts'],
    'clan-battle.ts': ['clan-battle.ts'],
    'commands.ts': [
        'commands/admin.ts',
        'commands/clan-info.ts',
        'commands/member.ts',
        'commands/rank.ts'
    ],
    'war.ts': [
        'war/admin.ts',
        'war/info.ts',
        'war/player.ts',
        'war/war-context.ts'
    ]
};

const internalMap = {
    'database': 'database',
    'interface': 'interface',
    'constants': 'constants',
    'utils': 'utils',
    'state': 'utils',
    'helpers/broadcast': 'utils',
    'helpers/context': 'utils',
    'helpers/elo': 'utils',
    'helpers/html': 'utils',
    'render': 'render',
    'clan-battle': 'clan-battle',
    'commands/admin': 'commands',
    'commands/clan-info': 'commands',
    'commands/member': 'commands',
    'commands/rank': 'commands',
    'war/admin': 'war',
    'war/info': 'war',
    'war/player': 'war',
    'war/war-context': 'war'
};

function processImports(content, filePath) {
    const lines = content.split('\n');
    let out = [];
    let inImport = false;
    let currentImport = '';
    
    for (let line of lines) {
        if (line.startsWith('import ') && !line.includes('from')) {
            inImport = true;
            currentImport = line + '\n';
            continue;
        }
        if (inImport) {
            currentImport += line + '\n';
            if (line.includes('from')) {
                inImport = false;
                out.push(currentImport.trim());
            }
            continue;
        }
        if (line.startsWith('import ')) {
            out.push(line.trim());
        }
    }
    
    // Now extract everything else
    let body = [];
    let inImportSkip = false;
    for (let line of lines) {
        if (line.startsWith('import ') && !line.includes('from')) {
            inImportSkip = true;
            continue;
        }
        if (inImportSkip) {
            if (line.includes('from')) inImportSkip = false;
            continue;
        }
        if (line.startsWith('import ')) continue;
        body.push(line);
    }
    
    return { imports: out, body: body.join('\n') };
}

for (const [targetName, files] of Object.entries(groups)) {
    let allImports = [];
    let allBody = [];
    
    for (const f of files) {
        const fullPath = path.join(DIR, f);
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        const { imports, body } = processImports(content, fullPath);
        
        // Rewrite imports
        for (let imp of imports) {
            // Find the from path
            const match = imp.match(/from '([^']+)'/);
            if (match) {
                let fromPath = match[1];
                if (fromPath.startsWith('.')) {
                    // Resolve relative to DIR
                    const absFrom = path.resolve(path.dirname(fullPath), fromPath);
                    let relToDir = path.relative(path.resolve(DIR), absFrom).replace(/\\/g, '/');
                    if (relToDir.endsWith('.ts')) relToDir = relToDir.slice(0, -3);
                    
                    const mapped = internalMap[relToDir] || relToDir;
                    if (mapped) {
                        imp = imp.replace(`from '${fromPath}'`, `from './${mapped}'`);
                    }
                }
            }
            allImports.push(imp);
        }
        
        // Remove duplicated consts in same group (hacky, let's just push body)
        allBody.push(`// --- ${f} ---`);
        allBody.push(body);
    }
    
    // Dedup imports
    let uniqueImports = [...new Set(allImports)];
    
    fs.writeFileSync(path.join(DIR, targetName + '.tmp'), uniqueImports.join('\n') + '\n\n' + allBody.join('\n'));
}

console.log("Done generating tmp files.");