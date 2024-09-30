// Import necessary modules
import { generateMockData } from './generateMockData';
import { writeMockData } from './writeMockData';
import { renameSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import * as ts from 'typescript';
import * as glob from 'glob';

const mocksDataPath = join(__dirname, '../mocks/data');

// Function to extract type names and settings from TypeScript files
function getTypeInfoFromFile(filePath: string): { typeName: string; settings: any } | null {
    const sourceFile = ts.createSourceFile(
        filePath,
        ts.sys.readFile(filePath) || '',
        ts.ScriptTarget.Latest
    );

    let typeName = '';
    let settings: any = {};

    ts.forEachChild(sourceFile, (node) => {
        if (
            ts.isTypeAliasDeclaration(node) ||
            ts.isInterfaceDeclaration(node) ||
            ts.isClassDeclaration(node)
        ) {
            if (node.name) {
                typeName = node.name.text;
            }
        } else if (
            ts.isVariableStatement(node) &&
            node.declarationList.declarations[0].name.getText() === 'settings'
        ) {
            const initializer = node.declarationList.declarations[0].initializer;
            if (initializer && ts.isObjectLiteralExpression(initializer)) {
                settings = initializer.properties.reduce((acc: any, prop: any) => {
                    const key = prop.name.getText();
                    const value = prop.initializer.getText();
                    acc[key] = eval(value); // Be cautious with eval in production code
                    return acc;
                }, {});
            }
        }
    });

    if (typeName) {
        return { typeName, settings };
    }

    return null;
}

function generateFeatureData() {
    // Find all folders in /mocks/data starting with 'new-'
    const newFeatureDirs = glob.sync('new-*', { cwd: mocksDataPath, absolute: true });

    if (newFeatureDirs.length === 0) {
        console.log('No new features to process.');
        return;
    }

    newFeatureDirs.forEach((dir) => {
        const featureName = basename(dir).replace(/^new-/, '');
        const files = readdirSync(dir).filter((file) => {
            const fullPath = join(dir, file);
            return statSync(fullPath).isFile() && extname(file) === '.ts';
        });

        if (files.length === 0) {
            console.warn(`No TypeScript files found in ${dir}. Skipping.`);
            return;
        }

        files.forEach((file) => {
            const filePath = join(dir, file);
            const typeInfo = getTypeInfoFromFile(filePath);

            if (!typeInfo) {
                console.warn(`No type definitions found in ${filePath}. Skipping.`);
                return;
            }

            const { typeName, settings } = typeInfo;
            const count = settings.count || 10; // Default to 10 if not specified

            console.log(`Generating mock data for type ${typeName} in feature ${featureName}...`);
            const data = generateMockData(typeName, count);
            writeMockData(featureName, typeName, data, dir);
        });

        // Rename folder to remove 'new-' prefix
        const newDir = join(mocksDataPath, featureName);
        if (existsSync(newDir)) {
            console.warn(`Folder ${newDir} already exists. Skipping rename.`);
        } else {
            renameSync(dir, newDir);
            console.log(`Renamed folder ${dir} to ${newDir}.`);
        }
    });
}

generateFeatureData();
